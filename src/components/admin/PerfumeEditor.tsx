import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload, Loader2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadPerfumeImage } from "@/lib/api/admin.functions";
import { useVariants, type Perfume, type Category, type Brand, type ProductVariant } from "@/lib/api/queries";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";

type Draft = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  family: string;
  category_id: string;
  brand_id: string;
  gender: string;
  price_pkr: number;
  image_url: string;
  top_notes: string;
  heart_notes: string;
  base_notes: string;
  in_stock: boolean;
  featured: boolean;
  spotlight_eligible: boolean;
  rating_longevity: number;
  rating_sillage: number;
  rating_projection: number;
  rating_versatility: number;
  rating_compliment: number;
  rating_uniqueness: number;
  rating_sweetness: number;
  rating_freshness: number;
  rating_warmth: number;
  best_season: string;
  occasion: string;
  tag_family: string;
  tag_intensity: string;
  tag_mood: string;
  tag_season: string;
  tag_occasion: string;
  tag_gender: string;
  main_accords: string;
  sale_price_pkr: number | "";
  stock_quantity: number | "";
  needs_confirmation: boolean;
  source_notes: string;
};

function toDraft(p?: Perfume | null): Draft {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    tagline: p?.tagline ?? "",
    description: p?.description ?? "",
    family: p?.family ?? "",
    category_id: p?.category_id ?? "",
    brand_id: p?.brand_id ?? "",
    gender: p?.gender ?? "",
    price_pkr: p?.price_pkr ?? 20000,
    image_url: p?.image_url ?? "",
    top_notes: p?.top_notes?.join(", ") ?? "",
    heart_notes: p?.heart_notes?.join(", ") ?? "",
    base_notes: p?.base_notes?.join(", ") ?? "",
    in_stock: p?.in_stock ?? true,
    featured: p?.featured ?? false,
    spotlight_eligible: p?.spotlight_eligible ?? true,
    rating_longevity: p?.rating_longevity ?? 7,
    rating_sillage: p?.rating_sillage ?? 7,
    rating_projection: p?.rating_projection ?? 7,
    rating_versatility: p?.rating_versatility ?? 7,
    rating_compliment: p?.rating_compliment ?? 7,
    rating_uniqueness: p?.rating_uniqueness ?? 7,
    rating_sweetness: p?.rating_sweetness ?? 5,
    rating_freshness: p?.rating_freshness ?? 5,
    rating_warmth: p?.rating_warmth ?? 5,
    best_season: p?.best_season ?? "",
    occasion: p?.occasion ?? "",
    tag_family: p?.tag_family ?? "",
    tag_intensity: p?.tag_intensity ?? "",
    tag_mood: p?.tag_mood ?? "",
    tag_season: p?.tag_season ?? "",
    tag_occasion: p?.tag_occasion ?? "",
    tag_gender: p?.tag_gender ?? "unisex",
    main_accords: p?.main_accords?.join(", ") ?? "",
    sale_price_pkr: p?.sale_price_pkr ?? "",
    stock_quantity: p?.stock_quantity ?? "",
    needs_confirmation: p?.needs_confirmation ?? false,
    source_notes: p?.source_notes ?? "",
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitNotes(s: string) {
  return s
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function RatingSlider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px] uppercase tracking-[0.3em] text-foreground/50">
        <span>{label}</span>
        <span className="text-gold">{value}/10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--gold)]"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] uppercase tracking-[0.35em] text-foreground/50">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-gold";

// Size/variant management — add, edit, reorder and delete product_variants
// rows for this perfume. Sizes can only be added once the perfume itself has
// been saved (a variant needs a real perfume_id to attach to).
function VariantsSection({ perfumeId }: { perfumeId: string }) {
  const { data: variants = [], refetch } = useVariants(perfumeId);
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ size_label: "", price_pkr: 0 });
  const [pendingDelete, setPendingDelete] = useState<ProductVariant | null>(null);

  const refresh = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["variants", "all"] });
  };

  const addVariant = async () => {
    if (!draft.size_label.trim()) {
      toast.error("Enter a size label, e.g. 50ml");
      return;
    }
    const { error } = await supabase.from("product_variants").insert({
      perfume_id: perfumeId,
      size_label: draft.size_label.trim(),
      price_pkr: draft.price_pkr,
      is_default: variants.length === 0,
      sort_order: variants.length,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That size already exists for this perfume." : error.message);
      return;
    }
    toast.success("Size added");
    setDraft({ size_label: "", price_pkr: 0 });
    setAdding(false);
    refresh();
  };

  const updateVariant = async (id: string, patch: Partial<ProductVariant>) => {
    const { error } = await supabase.from("product_variants").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const deleteVariant = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", pendingDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Size removed");
      refresh();
    }
    setPendingDelete(null);
  };

  const move = async (variant: ProductVariant, dir: -1 | 1) => {
    const sorted = [...variants].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((v) => v.id === variant.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    await Promise.all([
      supabase.from("product_variants").update({ sort_order: other.sort_order }).eq("id", variant.id),
      supabase.from("product_variants").update({ sort_order: variant.sort_order }).eq("id", other.id),
    ]);
    refresh();
  };

  const sorted = [...variants].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section>
      <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">Sizes &amp; Pricing</p>
      <div className="space-y-2">
        {sorted.map((v, i) => (
          <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-sm border border-border p-3">
            <input
              className="w-24 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm"
              value={v.size_label}
              onChange={(e) => updateVariant(v.id, { size_label: e.target.value })}
            />
            <input
              type="number"
              className="w-28 rounded-sm border border-border bg-transparent px-2 py-1.5 text-sm"
              value={v.price_pkr}
              onChange={(e) => updateVariant(v.id, { price_pkr: Number(e.target.value) })}
            />
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-foreground/60">
              <input type="checkbox" checked={v.in_stock} onChange={(e) => updateVariant(v.id, { in_stock: e.target.checked })} />
              In Stock
            </label>
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-foreground/60">
              <input
                type="radio"
                name="default-variant"
                checked={v.is_default}
                onChange={() => {
                  // Only one default: clear the others, then set this one.
                  Promise.all(sorted.filter((o) => o.id !== v.id).map((o) => updateVariant(o.id, { is_default: false })));
                  updateVariant(v.id, { is_default: true });
                }}
              />
              Default
            </label>
            <span className="ml-auto text-xs text-foreground/40">{formatPKR(v.price_pkr)}</span>
            <button onClick={() => move(v, -1)} disabled={i === 0} className="text-foreground/50 hover:text-gold disabled:opacity-20">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => move(v, 1)} disabled={i === sorted.length - 1} className="text-foreground/50 hover:text-gold disabled:opacity-20">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setPendingDelete(v)} className="text-red-400/70 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!sorted.length && <p className="text-xs text-foreground/40">No sizes yet — the storefront falls back to the base price above.</p>}
      </div>

      {adding ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-gold/30 p-3">
          <input
            className={`${inputCls} w-28`}
            placeholder="e.g. 50ml"
            value={draft.size_label}
            onChange={(e) => setDraft({ ...draft, size_label: e.target.value })}
          />
          <input
            type="number"
            className={`${inputCls} w-32`}
            placeholder="Price (PKR)"
            value={draft.price_pkr || ""}
            onChange={(e) => setDraft({ ...draft, price_pkr: Number(e.target.value) })}
          />
          <button onClick={addVariant} className="btn-gold px-4 py-2 text-[10px] uppercase tracking-[0.35em]">
            Add
          </button>
          <button onClick={() => setAdding(false)} className="text-[10px] uppercase tracking-[0.35em] text-foreground/50">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold/80 hover:text-gold"
        >
          <Plus className="h-3.5 w-3.5" /> Add Size
        </button>
      )}

      <ConfirmDialogInline
        open={!!pendingDelete}
        title={pendingDelete ? `Remove "${pendingDelete.size_label}"?` : ""}
        onConfirm={deleteVariant}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}

// Tiny inline confirm to avoid importing the full ConfirmDialog component
// into every variant delete — same visual language, minimal footprint.
function ConfirmDialogInline({ open, title, onConfirm, onCancel }: { open: boolean; title: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/70 px-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-sm border border-gold/40 bg-card p-6 text-foreground">
        <p className="text-sm">{title}</p>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="text-[10px] uppercase tracking-[0.3em] text-foreground/60">Cancel</button>
          <button onClick={onConfirm} className="rounded-sm bg-red-500/90 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white hover:bg-red-500">Remove</button>
        </div>
      </div>
    </div>
  );
}

export function PerfumeEditor({
  perfume,
  categories,
  brands,
  onClose,
  onSaved,
}: {
  perfume: Perfume | null;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !perfume;
  const [draft, setDraft] = useState<Draft>(() => toDraft(perfume));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const handleNameChange = (name: string) => {
    set("name", name);
    if (isNew || !draft.slug) set("slug", slugify(name));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large — max 8MB.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadPerfumeImage({
        data: { fileName: file.name, contentType: file.type, base64 },
      });
      set("image_url", result.url);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Perfume name is required.");
      return;
    }
    if (!draft.slug.trim()) {
      toast.error("Slug is required.");
      return;
    }
    setSaving(true);
    try {
      const cat = categories.find((c) => c.id === draft.category_id);
      const payload = {
        name: draft.name.trim(),
        slug: slugify(draft.slug),
        tagline: draft.tagline.trim() || null,
        description: draft.description.trim() || null,
        family: draft.family.trim() || cat?.name || null,
        category_id: draft.category_id || null,
        brand_id: draft.brand_id || null,
        gender: draft.gender || null,
        price_pkr: draft.price_pkr,
        image_url: draft.image_url || null,
        top_notes: splitNotes(draft.top_notes),
        heart_notes: splitNotes(draft.heart_notes),
        base_notes: splitNotes(draft.base_notes),
        in_stock: draft.in_stock,
        featured: draft.featured,
        spotlight_eligible: draft.spotlight_eligible,
        rating_longevity: draft.rating_longevity,
        rating_sillage: draft.rating_sillage,
        rating_projection: draft.rating_projection,
        rating_versatility: draft.rating_versatility,
        rating_compliment: draft.rating_compliment,
        rating_uniqueness: draft.rating_uniqueness,
        rating_sweetness: draft.rating_sweetness,
        rating_freshness: draft.rating_freshness,
        rating_warmth: draft.rating_warmth,
        best_season: draft.best_season.trim() || null,
        occasion: draft.occasion.trim() || null,
        tag_family: draft.tag_family.trim() || null,
        tag_intensity: draft.tag_intensity.trim() || null,
        tag_mood: draft.tag_mood.trim() || null,
        tag_season: draft.tag_season.trim() || null,
        tag_occasion: draft.tag_occasion.trim() || null,
        tag_gender: draft.tag_gender.trim() || null,
        main_accords: splitNotes(draft.main_accords),
        sale_price_pkr: draft.sale_price_pkr === "" ? null : draft.sale_price_pkr,
        stock_quantity: draft.stock_quantity === "" ? null : draft.stock_quantity,
        needs_confirmation: draft.needs_confirmation,
        source_notes: draft.source_notes.trim() || null,
      };

      const { error } = isNew
        ? await supabase.from("perfumes").insert(payload)
        : await supabase.from("perfumes").update(payload).eq("id", perfume.id);

      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          toast.error("That slug is already in use — choose a different one.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success(isNew ? "Perfume created" : "Perfume saved");
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
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-sm border border-gold/40 bg-card text-foreground"
        >
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-display text-xl italic">{isNew ? "Add Perfume" : `Edit — ${perfume?.name}`}</h3>
            <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {/* Image */}
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">Image</p>
              <div className="flex items-center gap-4">
                <div className="h-28 w-24 flex-shrink-0 overflow-hidden rounded-sm border border-border bg-card">
                  {draft.image_url && (
                    <img src={draft.image_url} alt="" className="h-full w-full object-contain" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 rounded-sm border border-gold/40 px-4 py-2 text-[10px] uppercase tracking-[0.35em] text-gold hover:bg-gold/10 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {uploading ? "Uploading…" : "Upload Image"}
                  </button>
                  <p className="mt-2 text-[10px] text-foreground/40">PNG, JPEG, WEBP, or GIF. Max 8MB.</p>
                </div>
              </div>
            </section>

            {/* General */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input className={inputCls} value={draft.name} onChange={(e) => handleNameChange(e.target.value)} />
              </Field>
              <Field label="Slug">
                <input className={inputCls} value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
              </Field>
              <Field label="Tagline">
                <input className={inputCls} value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
              </Field>
              <Field label="Family (e.g. Oriental Woody)">
                <input className={inputCls} value={draft.family} onChange={(e) => set("family", e.target.value)} />
              </Field>
              <Field label="Category">
                <select
                  className={inputCls}
                  value={draft.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                >
                  <option value="">— none —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Maison / Brand">
                <select
                  className={inputCls}
                  value={draft.brand_id}
                  onChange={(e) => set("brand_id", e.target.value)}
                >
                  <option value="">— none —</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gender / Presentation">
                <select
                  className={inputCls}
                  value={draft.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="">— not specified —</option>
                  <option value="men">Masculine</option>
                  <option value="women">Feminine</option>
                  <option value="unisex">Unisex</option>
                </select>
              </Field>
              <Field label="Price (PKR)">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.price_pkr}
                  onChange={(e) => set("price_pkr", Number(e.target.value))}
                />
              </Field>
              <Field label="Sale Price (PKR, optional)">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.sale_price_pkr}
                  onChange={(e) => set("sale_price_pkr", e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Leave blank if not on sale"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={draft.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            {/* Flags */}
            <section className="flex flex-wrap gap-6">
              {(
                [
                  ["in_stock", "In Stock"],
                  ["featured", "Featured"],
                  ["spotlight_eligible", "Spotlight Eligible"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/70">
                  <input
                    type="checkbox"
                    checked={draft[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 accent-[var(--gold)]"
                  />
                  {label}
                </label>
              ))}
            </section>

            {/* Sizes / variants */}
            {isNew ? (
              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">Sizes &amp; Pricing</p>
                <p className="text-xs text-foreground/40">Save the perfume first, then reopen it to add sizes (e.g. 50ml, 100ml) with their own prices and stock.</p>
              </section>
            ) : (
              <VariantsSection perfumeId={perfume.id} />
            )}

            {/* Advanced — collapsed by default so the common path (name, brand,
                price, image) isn't buried under fields most saves don't touch. */}
            <details className="rounded-sm border border-border">
              <summary className="cursor-pointer px-4 py-3 text-[10px] uppercase tracking-[0.4em] text-gold">
                Advanced Fragrance Details
              </summary>
              <div className="space-y-8 border-t border-border p-4">
                {/* Notes */}
                <section>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">Fragrance Notes (comma-separated)</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Top">
                      <input className={inputCls} value={draft.top_notes} onChange={(e) => set("top_notes", e.target.value)} />
                    </Field>
                    <Field label="Heart">
                      <input className={inputCls} value={draft.heart_notes} onChange={(e) => set("heart_notes", e.target.value)} />
                    </Field>
                    <Field label="Base">
                      <input className={inputCls} value={draft.base_notes} onChange={(e) => set("base_notes", e.target.value)} />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Main Accords (comma-separated, e.g. woody, citrus, amber)">
                      <input className={inputCls} value={draft.main_accords} onChange={(e) => set("main_accords", e.target.value)} />
                    </Field>
                  </div>
                </section>

                {/* Ratings */}
                <section>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">
                    Comparison Ratings (shown in Compare tool)
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <RatingSlider label="Longevity" value={draft.rating_longevity} onChange={(v) => set("rating_longevity", v)} />
                    <RatingSlider label="Sillage" value={draft.rating_sillage} onChange={(v) => set("rating_sillage", v)} />
                    <RatingSlider label="Projection" value={draft.rating_projection} onChange={(v) => set("rating_projection", v)} />
                    <RatingSlider label="Versatility" value={draft.rating_versatility} onChange={(v) => set("rating_versatility", v)} />
                    <RatingSlider label="Compliment Factor" value={draft.rating_compliment} onChange={(v) => set("rating_compliment", v)} />
                    <RatingSlider label="Uniqueness" value={draft.rating_uniqueness} onChange={(v) => set("rating_uniqueness", v)} />
                    <RatingSlider label="Sweetness" value={draft.rating_sweetness} onChange={(v) => set("rating_sweetness", v)} />
                    <RatingSlider label="Freshness" value={draft.rating_freshness} onChange={(v) => set("rating_freshness", v)} />
                    <RatingSlider label="Warmth" value={draft.rating_warmth} onChange={(v) => set("rating_warmth", v)} />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Best Season">
                      <input className={inputCls} value={draft.best_season} onChange={(e) => set("best_season", e.target.value)} placeholder="Autumn / Winter" />
                    </Field>
                    <Field label="Occasion">
                      <input className={inputCls} value={draft.occasion} onChange={(e) => set("occasion", e.target.value)} placeholder="Evening" />
                    </Field>
                  </div>
                </section>

                {/* Quiz tags */}
                <section>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">
                    Quiz Tags (drive Find Your Signature Scent — leave blank to exclude from a question)
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Gender">
                      <select className={inputCls} value={draft.tag_gender} onChange={(e) => set("tag_gender", e.target.value)}>
                        <option value="unisex">Unisex</option>
                        <option value="masculine">Masculine</option>
                        <option value="feminine">Feminine</option>
                      </select>
                    </Field>
                    <Field label="Fragrance Family">
                      <input className={inputCls} value={draft.tag_family} onChange={(e) => set("tag_family", e.target.value)} placeholder="oriental / floral / fresh (single word)" />
                    </Field>
                    <Field label="Intensity">
                      <input className={inputCls} value={draft.tag_intensity} onChange={(e) => set("tag_intensity", e.target.value)} placeholder="soft / strong" />
                    </Field>
                    <Field label="Mood">
                      <input className={inputCls} value={draft.tag_mood} onChange={(e) => set("tag_mood", e.target.value)} placeholder="romantic / commanding" />
                    </Field>
                    <Field label="Season">
                      <input className={inputCls} value={draft.tag_season} onChange={(e) => set("tag_season", e.target.value)} placeholder="summer / winter" />
                    </Field>
                    <Field label="Occasion">
                      <input className={inputCls} value={draft.tag_occasion} onChange={(e) => set("tag_occasion", e.target.value)} placeholder="daily / formal (single word)" />
                    </Field>
                  </div>
                </section>

                {/* Stock & admin-only fields */}
                <section>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">Stock &amp; Admin Notes</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Stock Quantity (optional)">
                      <input
                        type="number"
                        className={inputCls}
                        value={draft.stock_quantity}
                        onChange={(e) => set("stock_quantity", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Leave blank if not tracked"
                      />
                    </Field>
                    <label className="flex items-center gap-2 self-end pb-2 text-xs uppercase tracking-[0.2em] text-foreground/70">
                      <input
                        type="checkbox"
                        checked={draft.needs_confirmation}
                        onChange={(e) => set("needs_confirmation", e.target.checked)}
                        className="h-4 w-4 accent-[var(--gold)]"
                      />
                      Needs Confirmation (hidden reasoning, never shown publicly)
                    </label>
                    <div className="sm:col-span-2">
                      <Field label="Source Notes (private — never shown to customers)">
                        <textarea rows={2} className={inputCls} value={draft.source_notes} onChange={(e) => set("source_notes", e.target.value)} />
                      </Field>
                    </div>
                  </div>
                </section>
              </div>
            </details>
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button onClick={onClose} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.4em] text-foreground/60 hover:text-foreground">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="btn-gold px-8 py-2.5 text-[10px] uppercase tracking-[0.4em] disabled:opacity-40">
              {saving ? "Saving…" : isNew ? "Create Perfume" : "Save Changes"}
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
