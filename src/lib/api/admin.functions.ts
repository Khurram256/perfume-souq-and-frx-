import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

// Write-capable roles: Owner (admin_lock claimant), Admin, Editor.
// Analyst is intentionally excluded — read-only access to analytics only.
async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: lock, error: lockError } = await supabaseAdmin
    .from("admin_lock")
    .select("admin_user_id")
    .eq("id", 1)
    .maybeSingle();
  if (lockError) throw new Error(lockError.message);
  if (lock?.admin_user_id === userId) return;

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (roleError) throw new Error(roleError.message);
  if (roleRow && (roleRow.role === "admin" || roleRow.role === "editor")) return;

  throw new Error("Forbidden: admin only");
}

// Owner-only: only the admin_lock claimant may grant/revoke admin roles.
// Deliberately does NOT accept 'owner' as a grantable role — ownership only
// transfers via the admin_lock claim mechanism, never via this table.
async function assertOwner(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("admin_lock").select("admin_user_id").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.admin_user_id || data.admin_user_id !== userId) {
    throw new Error("Forbidden: owner only");
  }
}

export const listAdminRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("admin_roles").select("*").order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; role: "admin" | "editor" | "analyst" }) => data)
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) throw new Error(userError.message);
    const match = users.users.find((u) => u.email?.toLowerCase() === data.email.trim().toLowerCase());
    if (!match) throw new Error("No registered user with that email. They must sign up first.");

    const { error } = await supabaseAdmin
      .from("admin_roles")
      .upsert({ user_id: match.id, email: match.email!, role: data.role, created_by: context.userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_roles").delete().eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

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
