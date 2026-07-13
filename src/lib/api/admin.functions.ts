import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admin_lock")
    .select("admin_user_id")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.admin_user_id || data.admin_user_id !== userId) {
    throw new Error("Forbidden: admin only");
  }
}

// Uploads perfume media via the service-role client (bypasses storage RLS).
// Auth is verified server-side via the bearer token + admin_lock check —
// the service-role key never reaches the browser.
export const uploadPerfumeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fileName: string; contentType: string; base64: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    if (!ALLOWED_TYPES.has(data.contentType)) {
      throw new Error("Unsupported image type. Use PNG, JPEG, WEBP, or GIF.");
    }
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error("Image too large (max 8MB).");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("perfume-media")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrl } = supabaseAdmin.storage.from("perfume-media").getPublicUrl(path);
    return { url: publicUrl.publicUrl, path };
  });

// Deletes a perfume media file from storage (used when replacing/removing images).
export const deletePerfumeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("perfume-media").remove([data.path]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
