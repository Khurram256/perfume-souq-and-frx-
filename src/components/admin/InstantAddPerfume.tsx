// "Instant Add Perfume" — paste a messy block of supplier/spec text (labeled
// lines like "Name: ...", "Brand: ...", "Price: 27k", "Top: ...") and get a
// structured, fully editable preview before anything is saved. Variants
// (sizes + prices) are entered in this same preview, before the single Save
// action — nothing is written to the database until the admin confirms.
//
// There is no AI/LLM call here — wiring one up would mean adding a new paid
// external API dependency, which isn't something to add unilaterally. This
// is a structured parser: "Label: value" lines are read directly: a handful
// of free-text fallbacks (gender, concentration, notes-by-phrase) handle
// unlabeled prose too, but only for patterns it can match with confidence.
// Anything it can't extract is left blank for the admin to fill in on the
// preview screen, rather than inventing a value.
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Wand2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Brand } from "@/lib/api/queries";
import { normalizeBrandName } from "./BrandEditor";
import { formatPKR } from "@/lib/format";

type ParsedDraft = {
  name: string;
  brand_id: string;
  category_id: string;
  gender: string;
  family: string;
  concentration: string;
  tagline: string;
  description: string;
  price_pkr: number;
  top_notes: string;
  heart_notes: string;
  base_notes: string;
  main_accords: string;
};

type VariantDraft = { size_label: string; price_pkr: number };

const emptyDraft: ParsedDraft = {
  name: "",
  brand_id: "",
  category_id: "",
  gender: "",
  family: "",
  concentration: "",
  tagline: "",
  description: "",
  price_pkr: 0,
  top_notes: "",
  heart_notes: "",
  base_notes: "",
  main_accords: "",
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function splitList(s: string) {
  return s.split(",").map((n) => n.trim()).filter(Boolean);
}

// "27k" / "27,000" / "PKR 27000" / "Rs. 27,000" -> 27000
function parsePrice(raw: string): number {
  const cleaned = raw.trim().toLowerCase().replace(/pkr|rs\.?/g, "").trim();
  const kMatch = cleaned.match(/^([\d.]+)\s*k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const num = cleaned.replace(/,/g, "").match(/[\d.]+/);
  return num ? Math.round(parseFloat(num[0])) : 0;
}

function findLabel(lines: string[], label: RegExp): string | undefined {
  for (const line of lines) {
    const m = line.match(label);
    if (m) return m[1].trim();
  }
  return undefined;
}

function parseText(raw: string, brands: Brand[], categories: Category[]): { draft: ParsedDraft; variants: VariantDraft[]; brandNotFound: boolean } {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const draft: ParsedDraft = { ...emptyDraft };

  draft.name = findLabel(lines, /^name\s*:\s*(.+)$/i) ?? lines[0] ?? "";

  // Case/hyphen/extra-space-insensitive: "HUGO BOSS", "Hugo Boss", and
  // "hugo-boss" must all resolve to the same existing brand rather than
  // silently missing a match (or silently guessing the wrong one). An
  // explicit "Brand:" label is matched exactly (normalized) — if it's given
  // but doesn't match anything, that's reported as brandNotFound rather
  // than falling back to a loose substring guess. Without a label at all,
  // a substring search over the raw text is the best-effort fallback.
  const brandLabel = findLabel(lines, /^brand\s*:\s*(.+)$/i);
  let matchedBrand: Brand | undefined;
  let brandNotFound = false;
  if (brandLabel) {
    const normalized = normalizeBrandName(brandLabel);
    matchedBrand = brands.find((b) => normalizeBrandName(b.name) === normalized);
    brandNotFound = !matchedBrand;
  } else {
    const normalizedRaw = normalizeBrandName(raw);
    matchedBrand = brands.find((b) => normalizedRaw.includes(normalizeBrandName(b.name)));
  }
  draft.brand_id = matchedBrand?.id ?? "";

  const categoryLabel = findLabel(lines, /^category\s*:\s*(.+)$/i) ?? findLabel(lines, /^family\s*:\s*(.+)$/i);
  if (categoryLabel) {
    const matchedCategory = categories.find((c) => c.name.toLowerCase().includes(categoryLabel.toLowerCase()) || categoryLabel.toLowerCase().includes(c.name.toLowerCase()));
    draft.category_id = matchedCategory?.id ?? "";
    draft.family = categoryLabel;
  }

  const genderLabel = findLabel(lines, /^gender\s*:\s*(.+)$/i);
  if (genderLabel) {
    const g = genderLabel.toLowerCase();
    draft.gender = g.includes("wom") || g.includes("fem") ? "women" : g.includes("uni") ? "unisex" : g.includes("men") || g.includes("masc") ? "men" : "";
  } else {
    const lower = raw.toLowerCase();
    if (/\bunisex\b/.test(lower)) draft.gender = "unisex";
    else if (/\bwomen\b|\bfeminine\b|\bfor her\b/.test(lower)) draft.gender = "women";
    else if (/\bmen\b|\bmasculine\b|\bfor him\b/.test(lower)) draft.gender = "men";
  }

  draft.tagline = findLabel(lines, /^tagline\s*:\s*(.+)$/i) ?? "";
  draft.description = findLabel(lines, /^description\s*:\s*(.+)$/i) ?? "";

  const priceLabel = findLabel(lines, /^price\s*:\s*(.+)$/i);
  if (priceLabel) draft.price_pkr = parsePrice(priceLabel);
  else {
    const priceMatch = raw.match(/(?:pkr|rs\.?)\s*[\d,]+(?:k)?/i) ?? raw.match(/\b\d{1,3}(?:,\d{3})+\b/) ?? raw.match(/\b\d+\s*k\b/i);
    if (priceMatch) draft.price_pkr = parsePrice(priceMatch[0]);
  }

  // Concentration: only ever set from an explicit, unambiguous keyword —
  // never guessed from vague wording, since it materially affects price
  // expectations.
  const concLower = raw.toLowerCase();
  if (/\beau de parfum\b|\bedp\b/.test(concLower)) draft.concentration = "Eau de Parfum";
  else if (/\beau de toilette\b|\bedt\b/.test(concLower)) draft.concentration = "Eau de Toilette";
  else if (/\bextrait de parfum\b|\bparfum extract\b/.test(concLower)) draft.concentration = "Extrait de Parfum";
  else if (/\bparfum\b(?!\s*extract)/.test(concLower) && !/\beau de parfum\b/.test(concLower)) draft.concentration = "Parfum";
  else if (/\beau de cologne\b|\bedc\b/.test(concLower)) draft.concentration = "Eau de Cologne";

  // Notes: prefer an explicit "Top:" / "Top Notes:" label; fall back to
  // free-text phrasing like "top notes of X, Y" or "opens with X, Y" only
  // when no label exists — both still require an unambiguous keyword match,
  // so a description with no note information at all is correctly left blank.
  const findPhraseNotes = (keyword: RegExp): string => {
    const m = raw.match(new RegExp(`(?:${keyword.source})[^.\\n]*?(?:of|include[s]?|with|:)\\s*([a-z0-9 ,'&-]+)`, "i"));
    return m ? m[1].trim().replace(/\.$/, "") : "";
  };
  draft.top_notes = findLabel(lines, /^top(?:\s*notes)?\s*:\s*(.+)$/i) || findPhraseNotes(/top notes|opens with/i);
  draft.heart_notes =
    findLabel(lines, /^heart(?:\s*notes)?\s*:\s*(.+)$/i) ||
    findLabel(lines, /^middle(?:\s*notes)?\s*:\s*(.+)$/i) ||
    findPhraseNotes(/heart notes|middle notes/i);
  draft.base_notes = findLabel(lines, /^base(?:\s*notes)?\s*:\s*(.+)$/i) || findPhraseNotes(/base notes|dries down to/i);
  draft.main_accords = findLabel(lines, /^(?:main\s*)?accords\s*:\s*(.+)$/i) ?? "";

  const variants: VariantDraft[] = [];
  const sizesLabel = findLabel(lines, /^sizes?\s*:\s*(.+)$/i);
  if (sizesLabel) {
    for (const chunk of sizesLabel.split(",")) {
      const m = chunk.match(/([\d.]+\s*ml)\D+([\d,]+k?)/i);
      if (m) variants.push({ size_label: m[1].replace(/\s+/g, ""), price_pkr: parsePrice(m[2]) });
    }
  }

  return { draft, variants, brandNotFound };
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

export function InstantAddPerfume({
  categories,
  brands,
  existingPerfumes,
  onClose,
  onSaved,
  onBrandCreated,
}: {
  categories: Category[];
  brands: Brand[];
  existingPerfumes: { name: string; slug: string }[];
  onClose: () => void;
  onSaved: () => void;
  onBrandCreated?: (brand: Brand) => void;
}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState(false);
  const [draft, setDraft] = useState<ParsedDraft>(emptyDraft);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [brandNotFound, setBrandNotFound] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [localBrands, setLocalBrands] = useState<Brand[]>(brands);

  const set = <K extends keyof ParsedDraft>(key: K, value: ParsedDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // Checked against the live catalogue as the admin types, not just on save —
  // catches the duplicate before they've filled in the whole form, not after.
  const duplicateOf = useMemo(() => {
    if (!draft.name.trim()) return undefined;
    const slug = slugify(draft.name);
    return existingPerfumes.find((p) => p.slug === slug || p.name.trim().toLowerCase() === draft.name.trim().toLowerCase());
  }, [draft.name, existingPerfumes]);

  const exampleText = useMemo(
    () =>
      "Name: Dior Sauvage EDP\nBrand: Dior\nCategory: Woody Aromatic\nGender: Men\nPrice: 45k\nTagline: Raw, noble strength\nTop: Bergamot, Pepper\nHeart: Lavender, Geranium\nBase: Ambroxan, Vanilla\nAccords: fresh spicy, woody, citrus\nSizes: 50ml - 40000, 100ml - 45000",
    [],
  );

  const runParse = () => {
    if (!raw.trim()) {
      toast.error("Paste some product text first.");
      return;
    }
    const { draft: d, variants: v, brandNotFound: bnf } = parseText(raw, localBrands, categories);
    setDraft(d);
    setVariants(v);
    setBrandNotFound(bnf);
    setParsed(true);
    if (!d.name) toast.error("Couldn't find a name — enter one below before saving.");
    else if (bnf) toast.error("Brand not found — select an existing one or create it below.");
    else toast.success("Parsed — review and edit before saving.");
  };

  const createBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Enter a brand name.");
      return;
    }
    const normalized = normalizeBrandName(newBrandName);
    const existing = localBrands.find((b) => normalizeBrandName(b.name) === normalized);
    if (existing) {
      toast.error(`"${existing.name}" already exists — selecting it instead.`);
      set("brand_id", existing.id);
      setBrandNotFound(false);
      setAddingBrand(false);
      setNewBrandName("");
      return;
    }
    setCreatingBrand(true);
    try {
      const { data: created, error } = await supabase
        .from("brands")
        .insert({ name: newBrandName.trim(), slug: slugify(newBrandName) })
        .select()
        .single();
      if (error) {
        toast.error(error.message.includes("duplicate") || error.message.includes("unique") ? "That brand already exists." : error.message);
        return;
      }
      setLocalBrands((prev) => [...prev, created as Brand]);
      onBrandCreated?.(created as Brand);
      set("brand_id", created.id);
      setBrandNotFound(false);
      setAddingBrand(false);
      setNewBrandName("");
      toast.success(`"${created.name}" added — selected for this perfume.`);
    } finally {
      setCreatingBrand(false);
    }
  };

  const addVariant = () => setVariants((v) => [...v, { size_label: "", price_pkr: 0 }]);
  const updateVariant = (i: number, patch: Partial<VariantDraft>) =>
    setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeVariant = (i: number) => setVariants((v) => v.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (duplicateOf) {
      toast.error(`"${duplicateOf.name}" already exists in the catalogue — change the name or edit that product instead.`);
      return;
    }
    if (!draft.price_pkr && !variants.length) {
      toast.error("Enter a base price, or at least one size with a price.");
      return;
    }
    if (draft.price_pkr < 0 || variants.some((v) => v.price_pkr < 0)) {
      toast.error("Prices must be non-negative.");
      return;
    }
    setSaving(true);
    try {
      const cat = categories.find((c) => c.id === draft.category_id);
      const payload = {
        name: draft.name.trim(),
        slug: slugify(draft.name),
        brand_id: draft.brand_id || null,
        category_id: draft.category_id || null,
        gender: draft.gender || null,
        family: draft.family.trim() || cat?.name || null,
        concentration: draft.concentration.trim() || null,
        tagline: draft.tagline.trim() || null,
        description: draft.description.trim() || null,
        price_pkr: draft.price_pkr || variants[0]?.price_pkr || 0,
        top_notes: splitList(draft.top_notes),
        heart_notes: splitList(draft.heart_notes),
        base_notes: splitList(draft.base_notes),
        main_accords: splitList(draft.main_accords),
      };

      const { data: created, error } = await supabase.from("perfumes").insert(payload).select().single();
      if (error) {
        toast.error(error.message.includes("duplicate") || error.message.includes("unique") ? "A perfume with that name/slug already exists." : error.message);
        return;
      }

      if (variants.length) {
        const rows = variants
          .filter((v) => v.size_label.trim())
          .map((v, i) => ({
            perfume_id: created.id,
            size_label: v.size_label.trim(),
            size_ml: Number(v.size_label.trim().match(/^(\d+)\s*ml$/i)?.[1]) || null,
            price_pkr: v.price_pkr,
            is_default: i === 0,
            sort_order: i,
          }));
        if (rows.length) {
          const { error: vErr } = await supabase.from("product_variants").insert(rows);
          if (vErr) toast.error(`Perfume saved, but sizes failed: ${vErr.message}`);
        }
      }

      toast.success(`"${created.name}" added to the catalogue`);
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
          className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-sm border border-gold/40 bg-card text-foreground"
        >
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="flex items-center gap-2 font-display text-xl italic">
              <Wand2 className="h-4 w-4 text-gold" /> Instant Add Perfume
            </h3>
            <button onClick={onClose} className="text-foreground/50 hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {!parsed ? (
              <>
                <p className="text-xs text-foreground/50">
                  Paste product details as labeled lines and click Parse. Recognized labels: Name, Brand, Category,
                  Gender, Price, Tagline, Description, Top, Heart, Base, Accords, Sizes. Concentration (EDP/EDT/
                  Parfum) and notes are also picked up from ordinary sentences like "Top notes of bergamot and
                  pepper" even without a label. Anything not recognized is left blank for you to fill in on the
                  next screen — nothing is saved yet, and a name that matches an existing product is flagged
                  before you can save.
                </p>
                <textarea
                  rows={12}
                  className={`${inputCls} font-mono text-xs`}
                  placeholder={exampleText}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
                <button onClick={runParse} className="btn-gold flex items-center gap-2 px-6 py-2.5 text-[10px] uppercase tracking-[0.4em]">
                  <Wand2 className="h-3.5 w-3.5" /> Parse
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setParsed(false)} className="text-[10px] uppercase tracking-[0.3em] text-foreground/50 hover:text-gold">
                  ← Back to pasted text
                </button>

                {duplicateOf && (
                  <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                    "{duplicateOf.name}" is already in the catalogue. Change the name to save this as a new
                    product, or close this and edit the existing one instead.
                  </div>
                )}

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} />
                  </Field>
                  <div>
                    <Field label="Brand / Maison">
                      <select
                        className={inputCls}
                        value={draft.brand_id}
                        onChange={(e) => {
                          set("brand_id", e.target.value);
                          setBrandNotFound(false);
                        }}
                      >
                        <option value="">— none —</option>
                        {localBrands.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </Field>
                    {brandNotFound && !draft.brand_id && (
                      <p className="mt-1.5 text-[10px] text-destructive">Brand not found in the pasted text — select one above or add it below.</p>
                    )}
                    {addingBrand ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          className={`${inputCls} flex-1`}
                          placeholder="New brand name"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={createBrand}
                          disabled={creatingBrand}
                          className="btn-gold whitespace-nowrap px-4 py-2 text-[10px] uppercase tracking-[0.35em] disabled:opacity-40"
                        >
                          {creatingBrand ? "…" : "Create"}
                        </button>
                        <button type="button" onClick={() => setAddingBrand(false)} className="text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingBrand(true);
                          setNewBrandName("");
                        }}
                        className="mt-1.5 text-[10px] uppercase tracking-[0.3em] text-gold/80 hover:text-gold"
                      >
                        + Add New Brand
                      </button>
                    )}
                  </div>
                  <Field label="Category">
                    <select className={inputCls} value={draft.category_id} onChange={(e) => set("category_id", e.target.value)}>
                      <option value="">— none —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Gender">
                    <select className={inputCls} value={draft.gender} onChange={(e) => set("gender", e.target.value)}>
                      <option value="">— not specified —</option>
                      <option value="men">Masculine</option>
                      <option value="women">Feminine</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </Field>
                  <Field label="Family (e.g. Woody Aromatic)">
                    <input className={inputCls} value={draft.family} onChange={(e) => set("family", e.target.value)} />
                  </Field>
                  <Field label="Concentration">
                    <select className={inputCls} value={draft.concentration} onChange={(e) => set("concentration", e.target.value)}>
                      <option value="">— not specified —</option>
                      <option value="Eau de Cologne">Eau de Cologne</option>
                      <option value="Eau de Toilette">Eau de Toilette</option>
                      <option value="Eau de Parfum">Eau de Parfum</option>
                      <option value="Parfum">Parfum</option>
                      <option value="Extrait de Parfum">Extrait de Parfum</option>
                    </select>
                  </Field>
                  <Field label="Base Price (PKR)">
                    <input
                      type="number"
                      className={inputCls}
                      value={draft.price_pkr || ""}
                      onChange={(e) => set("price_pkr", Number(e.target.value))}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Tagline">
                      <input className={inputCls} value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <textarea rows={3} className={inputCls} value={draft.description} onChange={(e) => set("description", e.target.value)} />
                    </Field>
                  </div>
                </section>

                <section>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">Notes &amp; Accords (comma-separated)</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Top Notes">
                      <input className={inputCls} value={draft.top_notes} onChange={(e) => set("top_notes", e.target.value)} />
                    </Field>
                    <Field label="Heart Notes">
                      <input className={inputCls} value={draft.heart_notes} onChange={(e) => set("heart_notes", e.target.value)} />
                    </Field>
                    <Field label="Base Notes">
                      <input className={inputCls} value={draft.base_notes} onChange={(e) => set("base_notes", e.target.value)} />
                    </Field>
                    <Field label="Main Accords">
                      <input className={inputCls} value={draft.main_accords} onChange={(e) => set("main_accords", e.target.value)} />
                    </Field>
                  </div>
                </section>

                <section>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-gold">Sizes &amp; Pricing (optional — falls back to base price)</p>
                  <div className="space-y-2">
                    {variants.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-sm border border-border p-3">
                        <input
                          className={`${inputCls} w-28`}
                          placeholder="e.g. 50ml"
                          value={v.size_label}
                          onChange={(e) => updateVariant(i, { size_label: e.target.value })}
                        />
                        <input
                          type="number"
                          className={`${inputCls} w-32`}
                          placeholder="Price (PKR)"
                          value={v.price_pkr || ""}
                          onChange={(e) => updateVariant(i, { price_pkr: Number(e.target.value) })}
                        />
                        <span className="ml-auto text-xs text-foreground/40">{v.price_pkr ? formatPKR(v.price_pkr) : ""}</span>
                        <button onClick={() => removeVariant(i)} className="text-red-400/70 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addVariant} className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold/80 hover:text-gold">
                    <Plus className="h-3.5 w-3.5" /> Add Size
                  </button>
                </section>
              </>
            )}
          </div>

          {parsed && (
            <footer className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
              <button onClick={onClose} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.4em] text-foreground/60 hover:text-foreground">
                Cancel
              </button>
              <button onClick={save} disabled={saving || !!duplicateOf} className="btn-gold px-8 py-2.5 text-[10px] uppercase tracking-[0.4em] disabled:opacity-40">
                {saving ? "Saving…" : "Save Perfume"}
              </button>
            </footer>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
