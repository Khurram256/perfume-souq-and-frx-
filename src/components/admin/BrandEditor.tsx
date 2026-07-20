import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadPerfumeImage, deletePerfumeImage } from "@/lib/api/admin.functions";
import type { Brand } from "@/lib/api/queries";

type Draft = {
  name: string;
  slug: string;
  logo_url: string;
  origin_country: string;
  story: string;
  is_active: boolean;
};

function toDraft(b?: Brand | null): Draft {
  return {
    name: b?.name ?? "",
    slug: b?.slug ?? "",
    logo_url: b?.logo_url ?? "",
    origin_country: b?.origin_country ?? "",
    story: b?.story ?? "",
    is_active: b?.is_active ?? true,
  };
}

// Same normalization used for duplicate detection: case, extra spaces, and
// hyphen-vs-space differences are all "the same brand" — "HUGO BOSS",
// "Hugo Boss", and "hugo-boss" must all resolve to one record, matching how
// the Instant Add parser identifies brands.
export function normalizeBrandName(s: string): string {
  return s.toLowerCase().trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const inputCls = "w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-gold";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] uppercase tracking-[0.35em] text-foreground/50">{label}</span>
      {children}
    </label>
  );
}

export function BrandEditor({
  brand,
  existingBrands,
  onClose,
  onSaved,
}: {
  brand: Brand | null;
  existingBrands: Brand[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !brand;
  const [draft, setDraft] = useState<Draft>(() => toDraft(brand));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPath, setLogoPath] = useState("");

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const handleNameChange = (name: string) => {
    set("name", name);
    if (isNew || !draft.slug) set("slug", slugify(name));
  };

  // Checked live as the admin types — case/hyphen/space-insensitive, so
  // "Hugo  Boss" while editing "hugo-boss" flags the existing record
  // instead of silently allowing a near-duplicate.
  const duplicateOf = useMemo(() => {
    if (!draft.name.trim()) return undefined;
    const norm = normalizeBrandName(draft.name);
    return existingBrands.find((b) => b.id !== brand?.id && normalizeBrandName(b.name) === norm);
  }, [draft.name, existingBrands, brand?.id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large — max 8MB.");
      return;
    }
    setUploading(true);
    const previousPath = logoPath;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadPerfumeImage({ data: { fileName: file.name, contentType: file.type, base64 } });
      set("logo_url", result.url);
      setLogoPath(result.path);
      toast.success("Logo uploaded");
      if (previousPath) deletePerfumeImage({ data: { path: previousPath } }).catch(() => {});
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Brand name is required.");
      return;
    }
    if (duplicateOf) {
      toast.error(`"${duplicateOf.name}" already exists — select it instead of creating a near-duplicate.`);
      return;
    }
    if (!draft.slug.trim()) {
      toast.error("Slug is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: slugify(draft.slug),
        logo_url: draft.logo_url.trim() || null,
        origin_country: draft.origin_country.trim() || null,
        story: draft.story.trim() || null,
        is_active: draft.is_active,
      };
      const { error } = isNew
        ? await supabase.from("brands").insert(payload)
        : await supabase.from("brands").update(payload).eq("id", brand.id);
      if (error) {
        toast.error(
          error.message.includes("duplicate") || error.message.includes("unique")
            ? "That brand name or slug is already in use."
            : error.message,
        );
        return;
      }
      toast.success(isNew ? "Brand created" : "Brand saved");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-sm border border-gold/40 bg-card text-foreground"
        >
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-display text-xl italic">{isNew ? "Add Brand" : `Edit — ${brand?.name}`}</h3>
            <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {duplicateOf && (
              <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                "{duplicateOf.name}" already exists in the catalogue. Close this and select it instead of creating a
                near-duplicate.
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm border border-border bg-background">
                {draft.logo_url && <img src={draft.logo_url} alt="" className="h-full w-full object-contain" />}
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFileSelect} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-sm border border-gold/40 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-gold hover:bg-gold/10 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : draft.logo_url ? "Replace Logo" : "Upload Logo"}
                </button>
              </div>
            </div>

            <Field label="Brand Name">
              <input className={inputCls} value={draft.name} onChange={(e) => handleNameChange(e.target.value)} />
            </Field>
            <Field label="Slug">
              <input className={inputCls} value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
            </Field>
            <Field label="Origin Country (optional)">
              <input className={inputCls} value={draft.origin_country} onChange={(e) => set("origin_country", e.target.value)} />
            </Field>
            <Field label="Description (optional)">
              <textarea rows={3} className={inputCls} value={draft.story} onChange={(e) => set("story", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/70">
              <input type="checkbox" checked={draft.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-[var(--gold)]" />
              Active (visible in storefront filters and brand pages)
            </label>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button onClick={onClose} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.4em] text-foreground/60 hover:text-foreground">
              Cancel
            </button>
            <button onClick={save} disabled={saving || !!duplicateOf} className="btn-gold px-8 py-2.5 text-[10px] uppercase tracking-[0.4em] disabled:opacity-40">
              {saving ? "Saving…" : isNew ? "Create Brand" : "Save Changes"}
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
