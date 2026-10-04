import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import {
  usePerfumes,
  useBrands,
  useAllVariants,
  usePromotions,
  trackEvent,
  type Perfume,
} from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";
import { genderLabel, hasRatingData, sortedSizes } from "@/lib/catalog";

const MAX_COMPARE = 3;

// Plain-language labels for average shoppers — no raw "7/10" chemistry-lab
// numbers, per the spec's explicit customer-friendly comparison requirement.
function strengthLabel(n: number): string {
  if (n >= 8) return "Strong";
  if (n >= 5) return "Moderate";
  return "Light";
}
function longevityLabel(n: number): string {
  if (n >= 8) return "Long-lasting";
  if (n >= 5) return "Medium-lasting";
  return "Short-lasting";
}

// Treats null/undefined/blank/whitespace-only/placeholder strings
// ("-", "–", "—", "n/a") and empty arrays as "no data" — never invented,
// only ever real stored values.
function isValid(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return false;
    if (["-", "–", "—", "n/a"].includes(t.toLowerCase())) return false;
    return true;
  }
  return true;
}

function Row({ label, value, missing }: { label: string; value?: React.ReactNode; missing?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 text-left last:border-b-0">
      <span className="text-[9px] uppercase tracking-[0.3em] text-foreground/40">{label}</span>
      <span
        className={`max-w-[62%] break-words text-right text-xs ${missing ? "italic text-foreground/35" : "text-foreground/80"}`}
      >
        {missing ? "Not provided" : value}
      </span>
    </div>
  );
}

type Variants = ReturnType<typeof useAllVariants>["data"];
type Promotions = ReturnType<typeof usePromotions>["data"];

// Plain text values for every gate-able attribute. Sizes/prices and ratings
// are rendered specially below, but still take part in the "does either
// perfume have data for this row" decision.
function attributeValues(p: Perfume, variants: Variants) {
  const pv = (variants ?? []).filter((v) => v.perfume_id === p.id);
  return {
    gender: genderLabel(p.gender),
    family: p.family ?? "",
    concentration: p.concentration ?? "",
    sizes: pv.length ? pv.map((v) => v.size_label).join(", ") : "",
    mainAccords: p.main_accords.join(", "),
    topNotes: p.top_notes.join(", "),
    heartNotes: p.heart_notes.join(", "),
    baseNotes: p.base_notes.join(", "),
    bestSeason: p.best_season ?? "",
    occasion: p.occasion ?? "",
    // Only ever "present" when real rating data exists (see hasRatingData).
    ratings: hasRatingData(p) ? "yes" : "",
  };
}

type AttrKey = keyof ReturnType<typeof attributeValues>;

function Side({
  index,
  groups,
  perfumes,
  brands,
  variants,
  promotions,
  value,
  takenIds,
  onChange,
  onRemove,
  visibleKeys,
}: {
  index: number;
  groups: { brand: string; items: Perfume[] }[];
  perfumes: Perfume[];
  brands: ReturnType<typeof useBrands>["data"];
  variants: Variants;
  promotions: Promotions;
  value: string;
  takenIds: string[];
  onChange: (id: string) => void;
  onRemove?: () => void;
  visibleKeys: Set<AttrKey>;
}) {
  const p = perfumes.find((x) => x.id === value) ?? perfumes[0];
  if (!p) return null;

  const brand = brands?.find((b) => b.id === p.brand_id);
  const pv = sortedSizes((variants ?? []).filter((v) => v.perfume_id === p.id));
  const multi = pv.length > 1;
  const priceOf = (v: (typeof pv)[number]) =>
    resolveVariantPrice(v.price_pkr, promotions ?? [], {
      perfumeId: p.id,
      variantId: v.id,
      brandId: p.brand_id,
      categoryId: p.category_id,
    });
  // Several sizes: lead with the cheapest ("From"); the full size/price list
  // is in the table below. One size: that size's price.
  const leadVariant = pv.length ? pv.reduce((m, v) => (v.price_pkr < m.price_pkr ? v : m)) : undefined;
  const price = leadVariant
    ? priceOf(leadVariant)
    : { originalPrice: p.price_pkr, finalPrice: p.price_pkr, discountAmount: 0, appliedPromotions: [] };
  const inStock = pv.length ? pv.some((v) => v.in_stock) : p.in_stock;
  const values = attributeValues(p, variants);

  // Renders nothing for a row no compared perfume has data for (filtered out
  // of visibleKeys upstream); shows "Not provided" only when the row is kept
  // because another perfume does have real data for it.
  const gated = (key: AttrKey, label: string, node?: React.ReactNode) => {
    if (!visibleKeys.has(key)) return null;
    const val = values[key];
    return <Row key={key} label={label} value={node ?? val} missing={!isValid(val)} />;
  };

  const ratedHere = hasRatingData(p);
  const selectId = `compare-select-${index}`;

  return (
    <div className="glass-card rounded-sm p-6 sm:p-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <label htmlFor={selectId} className="block text-[10px] uppercase tracking-[0.35em] text-gold/80">
          Choose a Perfume to Compare
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove this perfume from the comparison"
            className="flex items-center gap-1 text-[9px] uppercase tracking-[0.3em] text-foreground/40 hover:text-gold"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
      <div className="relative mb-8">
        <select
          id={selectId}
          value={p.id}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-sm border border-gold/50 bg-obsidian/60 px-4 py-3 pr-10 text-base uppercase tracking-[0.08em] text-gold sm:text-[11px] sm:tracking-[0.3em] transition hover:border-gold focus:border-gold focus:outline-none"
        >
          {groups.map((g) => (
            <optgroup key={g.brand} label={g.brand} style={{ background: "var(--obsidian)", color: "oklch(0.96 0.012 220)" }}>
              {g.items.map((opt) => (
                <option
                  key={opt.id}
                  value={opt.id}
                  disabled={opt.id !== p.id && takenIds.includes(opt.id)}
                  style={{ background: "var(--obsidian)", color: "oklch(0.96 0.012 220)" }}
                >
                  {opt.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
      </div>

      <div className="flex items-start gap-6">
        {p.image_url && (
          <img
            src={p.image_url}
            alt={`${p.name}${brand ? ` by ${brand.name}` : ""}`}
            loading="lazy"
            decoding="async"
            className="h-32 w-24 flex-shrink-0 object-contain"
          />
        )}
        <div className="min-w-0 flex-1">
          {brand && <p className="text-[9px] uppercase tracking-[0.4em] text-gold/70">{brand.name}</p>}
          <h3 className="font-display text-2xl italic">{p.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {price.discountAmount > 0 && (
              <span className="text-[10px] text-foreground/40 line-through">{formatPKR(price.originalPrice)}</span>
            )}
            <span className="text-gradient-gold font-display text-lg">
              {multi ? "From " : ""}
              {formatPKR(price.finalPrice)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Row label="Availability" value={inStock ? <span className="text-gold">In Stock</span> : "Out of Stock"} />
        {price.discountAmount > 0 && (
          <Row
            label="Discount"
            value={`-${formatPKR(price.discountAmount)}${price.appliedPromotions[0]?.name ? ` (${price.appliedPromotions[0].name})` : ""}`}
          />
        )}
        {gated("gender", "Gender")}
        {gated("family", "Fragrance Family")}
        {gated("concentration", "Concentration")}
        {gated(
          "sizes",
          "Sizes & Prices",
          pv.length ? (
            <span className="flex flex-col items-end gap-1">
              {pv.map((v) => (
                <span key={v.id}>
                  {v.size_label} — {formatPKR(priceOf(v).finalPrice)}
                </span>
              ))}
            </span>
          ) : undefined,
        )}
        {gated(
          "mainAccords",
          "Main Accords",
          p.main_accords.length ? <span className="capitalize">{p.main_accords.join(", ")}</span> : undefined,
        )}
        {gated("topNotes", "Top Notes")}
        {gated("heartNotes", "Heart Notes")}
        {gated("baseNotes", "Base Notes")}
        {gated("bestSeason", "Best Season")}
        {gated("occasion", "Best Occasion")}
        {visibleKeys.has("ratings") &&
          (ratedHere ? (
            <>
              <Row label="Projection" value={strengthLabel(p.rating_projection)} />
              <Row label="Longevity" value={longevityLabel(p.rating_longevity)} />
              <Row label="Day or Night" value={p.rating_sillage >= 7 ? "Evening" : "Day-friendly"} />
              <Row
                label="Formal or Casual"
                value={p.occasion?.toLowerCase().includes("formal") ? "Formal" : "Everyday / Casual"}
              />
            </>
          ) : (
            <Row label="Projection & Longevity" missing />
          ))}
      </div>

      {ratedHere && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[9px] uppercase tracking-[0.3em] text-foreground/40 hover:text-gold">
            Advanced fragrance details
          </summary>
          <div className="mt-3">
            <Row label="Sillage (raw)" value={`${p.rating_sillage}/10`} />
            <Row label="Longevity (raw)" value={`${p.rating_longevity}/10`} />
          </div>
        </details>
      )}
    </div>
  );
}

// Labels for the aligned phone layout, in display order. Ratings are left to
// the desktop cards (they only appear when real rating data exists).
const MOBILE_ROWS: { key: AttrKey; label: string }[] = [
  { key: "gender", label: "Gender" },
  { key: "family", label: "Fragrance Family" },
  { key: "concentration", label: "Concentration" },
  { key: "sizes", label: "Sizes & Prices" },
  { key: "mainAccords", label: "Main Accords" },
  { key: "topNotes", label: "Top Notes" },
  { key: "heartNotes", label: "Heart Notes" },
  { key: "baseNotes", label: "Base Notes" },
  { key: "bestSeason", label: "Best Season" },
  { key: "occasion", label: "Best Occasion" },
];

// Phones: stacking one full card per perfume meant scrolling a whole screen
// between the things being compared. Here each attribute is one row with the
// perfumes in aligned columns, so values sit genuinely side by side.
function MobileComparison({
  ids,
  groups,
  perfumes,
  brands,
  variants,
  promotions,
  onChange,
  onRemove,
  visibleKeys,
}: {
  ids: string[];
  groups: { brand: string; items: Perfume[] }[];
  perfumes: Perfume[];
  brands: ReturnType<typeof useBrands>["data"];
  variants: Variants;
  promotions: Promotions;
  onChange: (index: number, id: string) => void;
  onRemove: () => void;
  visibleKeys: Set<AttrKey>;
}) {
  const picked = ids.map((id) => perfumes.find((x) => x.id === id)).filter((p): p is Perfume => !!p);
  const cols = { gridTemplateColumns: `repeat(${picked.length}, minmax(0, 1fr))` };
  const info = picked.map((p) => {
    const pv = sortedSizes((variants ?? []).filter((v) => v.perfume_id === p.id));
    const priceOf = (v: (typeof pv)[number]) =>
      resolveVariantPrice(v.price_pkr, promotions ?? [], {
        perfumeId: p.id,
        variantId: v.id,
        brandId: p.brand_id,
        categoryId: p.category_id,
      }).finalPrice;
    const lowest = pv.length ? Math.min(...pv.map(priceOf)) : p.price_pkr;
    return {
      p,
      brand: brands?.find((b) => b.id === p.brand_id)?.name,
      pv,
      priceOf,
      lowest,
      multi: pv.length > 1,
      values: attributeValues(p, variants),
    };
  });

  return (
    <div className="md:hidden">
      <div className="space-y-3">
        {ids.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor={`compare-m-${i}`} className="sr-only">
                Perfume {i + 1}
              </label>
              <select
                id={`compare-m-${i}`}
                value={id}
                onChange={(e) => onChange(i, e.target.value)}
                className="w-full appearance-none truncate rounded-sm border border-gold/50 bg-obsidian/60 py-3 pl-3 pr-9 text-base text-gold focus:border-gold focus:outline-none"
              >
                {groups.map((g) => (
                  <optgroup
                    key={g.brand}
                    label={g.brand}
                    style={{ background: "var(--obsidian)", color: "oklch(0.96 0.012 220)" }}
                  >
                    {g.items.map((opt) => (
                      <option
                        key={opt.id}
                        value={opt.id}
                        disabled={opt.id !== id && ids.includes(opt.id)}
                        style={{ background: "var(--obsidian)", color: "oklch(0.96 0.012 220)" }}
                      >
                        {opt.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
            </div>
            {ids.length > 2 && i === ids.length - 1 && (
              <button
                type="button"
                onClick={onRemove}
                aria-label="Remove this perfume from the comparison"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-sm border border-border text-foreground/50 hover:text-gold"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card mt-6 rounded-sm p-4">
        <div className="grid gap-3 border-b border-border pb-4" style={cols}>
          {info.map(({ p, brand, lowest, multi }) => (
            <div key={p.id} className="min-w-0 text-center">
              <div className="mx-auto flex h-20 items-center justify-center">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="h-20 w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[8px] uppercase tracking-[0.2em] text-foreground/30">No image yet</span>
                )}
              </div>
              {brand && (
                <p className="mt-2 truncate text-[8px] uppercase tracking-[0.25em] text-gold/70">{brand}</p>
              )}
              <p className="mt-1 break-words font-display text-base italic leading-tight">{p.name}</p>
              <p className="text-gradient-gold mt-1 font-display text-sm">
                {multi ? "From " : ""}
                {formatPKR(lowest)}
              </p>
            </div>
          ))}
        </div>

        {MOBILE_ROWS.filter((r) => visibleKeys.has(r.key)).map((r) => (
          <div key={r.key} className="border-b border-border py-3 last:border-b-0">
            <p className="mb-2 text-center text-[9px] uppercase tracking-[0.3em] text-foreground/45">{r.label}</p>
            <div className="grid gap-3" style={cols}>
              {info.map(({ p, values, pv, priceOf }) => (
                <div
                  key={p.id}
                  className="min-w-0 break-words text-center text-xs leading-relaxed text-foreground/80"
                >
                  {r.key === "sizes" && pv.length ? (
                    pv.map((v) => (
                      <span key={v.id} className="block">
                        {v.size_label} · {formatPKR(priceOf(v))}
                      </span>
                    ))
                  ) : isValid(values[r.key]) ? (
                    <span className={r.key === "mainAccords" ? "capitalize" : undefined}>{values[r.key]}</span>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComparisonTool() {
  const { data: perfumes = [] } = usePerfumes();
  const { data: brands = [] } = useBrands();
  const { data: variants = [] } = useAllVariants();
  const { data: promotions = [] } = usePromotions();
  const [ids, setIds] = useState<string[]>([]);

  const groups = useMemo(() => {
    const nameById = new Map(brands.map((b) => [b.id, b.name]));
    const map = new Map<string, Perfume[]>();
    for (const p of perfumes) {
      const brand = nameById.get(p.brand_id ?? "") ?? "Other";
      map.set(brand, [...(map.get(brand) ?? []), p]);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([brand, items]) => ({ brand, items: [...items].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [perfumes, brands]);

  // Default to two perfumes from different houses so the first thing a
  // visitor sees is a genuinely comparable pair; drop any selection that no
  // longer exists in the catalogue.
  useEffect(() => {
    if (!perfumes.length) return;
    setIds((prev) => {
      const valid = prev.filter((id) => perfumes.some((p) => p.id === id));
      if (valid.length >= 2) return valid.length === prev.length ? prev : valid;
      const first = valid[0] ?? perfumes[0].id;
      const firstBrand = perfumes.find((p) => p.id === first)?.brand_id;
      const other =
        perfumes.find((p) => p.brand_id !== firstBrand && p.id !== first) ??
        perfumes.find((p) => p.id !== first) ??
        perfumes[0];
      return [first, other.id];
    });
  }, [perfumes]);

  const setAt = (index: number, id: string) => {
    setIds((prev) => prev.map((x, i) => (i === index ? id : x)));
    trackEvent("compare_add", { perfumeId: id });
  };
  const addThird = () => {
    const free = perfumes.find((p) => !ids.includes(p.id));
    if (free) {
      setIds((prev) => [...prev, free.id]);
      trackEvent("compare_add", { perfumeId: free.id });
    }
  };

  // A row is only worth showing at all if at least one of the compared
  // perfumes has real data for it — otherwise the whole row is skipped.
  // Recomputed whenever the selection changes so the table adapts per set.
  const visibleKeys = useMemo(() => {
    const keys = new Set<AttrKey>();
    for (const id of ids) {
      const p = perfumes.find((x) => x.id === id);
      if (!p) continue;
      const values = attributeValues(p, variants);
      (Object.keys(values) as AttrKey[]).forEach((key) => {
        if (isValid(values[key])) keys.add(key);
      });
    }
    return keys;
  }, [perfumes, variants, ids]);

  if (perfumes.length < 1 || ids.length < 1) return null;

  return (
    <section id="comparison" className="section-pad relative px-6 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 grid grid-cols-1 items-end gap-6 md:mb-16 lg:grid-cols-[auto_1fr]">
          <span className="section-index text-[14vw] leading-none md:text-[6vw]">06</span>
          <div>
            <p className="label-eyebrow mb-5">Side by Side</p>
            <h2 className="heading-section" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}>
              Compare <span className="text-gradient-gold">Perfumes</span>
            </h2>
          </div>
        </div>

        <MobileComparison
          ids={ids}
          groups={groups}
          perfumes={perfumes}
          brands={brands}
          variants={variants}
          promotions={promotions}
          onChange={setAt}
          onRemove={() => setIds((prev) => prev.slice(0, -1))}
          visibleKeys={visibleKeys}
        />

        <div className={`hidden gap-6 md:grid md:grid-cols-2 ${ids.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {ids.map((id, i) => (
            <Side
              key={i}
              index={i}
              groups={groups}
              perfumes={perfumes}
              brands={brands}
              variants={variants}
              promotions={promotions}
              value={id}
              takenIds={ids}
              onChange={(next) => setAt(i, next)}
              onRemove={ids.length > 2 && i === ids.length - 1 ? () => setIds((prev) => prev.slice(0, -1)) : undefined}
              visibleKeys={visibleKeys}
            />
          ))}
        </div>

        {ids.length < MAX_COMPARE && perfumes.length > ids.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={addThird}
              className="flex items-center gap-2 rounded-full border border-gold/40 px-6 py-3 text-[10px] uppercase tracking-[0.35em] text-gold hover:bg-gold/10"
            >
              <Plus className="h-3.5 w-3.5" /> Add a third perfume
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
