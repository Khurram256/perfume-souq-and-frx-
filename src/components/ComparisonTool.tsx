import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
// only ever real stored values. Numeric ratings are excluded from this
// check: every perfume row has a real NOT NULL rating value (defaulted at
// creation, not fabricated per-comparison), so they're always shown.
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
      <span className={`max-w-[60%] text-right text-xs ${missing ? "italic text-foreground/35" : "text-foreground/80"}`}>
        {missing ? "Not provided" : value}
      </span>
    </div>
  );
}

// Derived, always-visible fields (independent of the isValid/"Not provided"
// system since availability, price and name are core to the card, not
// optional fragrance data) plus every gate-able attribute this component
// can show. Sizes/mainNotes are computed rather than raw columns, so they're
// resolved once per perfume alongside the raw fields.
function attributeValues(p: Perfume, variants: ReturnType<typeof useAllVariants>["data"]) {
  const pv = (variants ?? []).filter((v) => v.perfume_id === p.id);
  const sizeRange = pv.length ? pv.map((v) => v.size_label).join(", ") : "";
  const mainNotes = [...p.top_notes, ...p.heart_notes].slice(0, 4).join(", ");
  return {
    gender: p.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : "",
    family: p.family ?? "",
    sizeRange,
    mainNotes,
    bestSeason: p.best_season ?? "",
    occasion: p.occasion ?? "",
    concentration: p.concentration ?? "",
    topNotes: p.top_notes.join(", "),
    heartNotes: p.heart_notes.join(", "),
    baseNotes: p.base_notes.join(", "),
  };
}

type AttrValues = ReturnType<typeof attributeValues>;

function Side({
  perfumes,
  brands,
  variants,
  promotions,
  value,
  onChange,
  visibleKeys,
}: {
  perfumes: Perfume[];
  brands: ReturnType<typeof useBrands>["data"];
  variants: ReturnType<typeof useAllVariants>["data"];
  promotions: ReturnType<typeof usePromotions>["data"];
  value: string;
  onChange: (id: string) => void;
  visibleKeys: Set<keyof AttrValues>;
}) {
  const p = perfumes.find((x) => x.id === value) ?? perfumes[0];
  if (!p) return null;

  const brand = brands?.find((b) => b.id === p.brand_id);
  const pv = (variants ?? []).filter((v) => v.perfume_id === p.id);
  const defaultVariant = pv.find((v) => v.is_default) ?? pv[0];
  const price = defaultVariant
    ? resolveVariantPrice(defaultVariant.price_pkr, promotions ?? [], {
        perfumeId: p.id,
        variantId: defaultVariant.id,
        brandId: p.brand_id,
        categoryId: p.category_id,
      })
    : {
        originalPrice: p.price_pkr,
        finalPrice: p.price_pkr,
        discountAmount: 0,
        appliedPromotions: [],
      };
  const inStock = pv.length ? pv.some((v) => v.in_stock) : p.in_stock;
  const values = attributeValues(p, variants);

  // Renders nothing for a row the other perfume also has no data for
  // (filtered out of visibleKeys upstream); shows "Not provided" only when
  // the row is being kept because the other side does have real data.
  const gated = (key: keyof AttrValues, label: string) => {
    if (!visibleKeys.has(key)) return null;
    const val = values[key];
    return <Row key={key} label={label} value={val} missing={!isValid(val)} />;
  };

  return (
    <div className="glass-card rounded-sm p-8">
      <label className="mb-3 block text-[10px] uppercase tracking-[0.35em] text-gold/80">
        Choose Another Perfume to Compare
      </label>
      <div className="relative mb-8">
        <select
          value={p.id}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-sm border border-gold/50 bg-obsidian/60 px-4 py-3 pr-10 text-[11px] uppercase tracking-[0.3em] text-gold transition hover:border-gold focus:border-gold focus:outline-none"
        >
          {perfumes.map((opt) => (
            <option
              key={opt.id}
              value={opt.id}
              style={{ background: "var(--obsidian)", color: "oklch(0.96 0.012 220)" }}
            >
              {opt.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
      </div>

      <div className="flex items-start gap-6">
        {p.image_url && (
          <img
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            decoding="async"
            className="h-32 w-24 flex-shrink-0 object-contain"
          />
        )}
        <div className="flex-1">
          {brand && (
            <p className="text-[9px] uppercase tracking-[0.4em] text-gold/70">{brand.name}</p>
          )}
          <h3 className="font-display text-2xl italic">{p.name}</h3>
          <div className="mt-2 flex items-center gap-2">
            {price.discountAmount > 0 && (
              <span className="text-[10px] text-foreground/40 line-through">
                {formatPKR(price.originalPrice)}
              </span>
            )}
            <span className="text-gradient-gold font-display text-lg">
              {formatPKR(price.finalPrice)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Row
          label="Availability"
          value={inStock ? <span className="text-gold">In Stock</span> : "Out of Stock"}
        />
        {price.discountAmount > 0 && (
          <Row
            label="Discount"
            value={`-${formatPKR(price.discountAmount)}${price.appliedPromotions[0]?.name ? ` (${price.appliedPromotions[0].name})` : ""}`}
          />
        )}
        {gated("gender", "Gender")}
        {gated("family", "Scent Style")}
        {gated("sizeRange", "Available Sizes")}
        {gated("mainNotes", "Main Notes")}
        <Row label="Projection" value={strengthLabel(p.rating_projection)} />
        <Row label="Longevity" value={longevityLabel(p.rating_longevity)} />
        {gated("bestSeason", "Best Season")}
        {gated("occasion", "Best Occasion")}
        <Row label="Day or Night" value={p.rating_sillage >= 7 ? "Evening" : "Day-friendly"} />
        <Row
          label="Formal or Casual"
          value={p.occasion?.toLowerCase().includes("formal") ? "Formal" : "Everyday / Casual"}
        />
      </div>

      {(visibleKeys.has("concentration") || visibleKeys.has("topNotes") || visibleKeys.has("heartNotes") || visibleKeys.has("baseNotes")) && (
        <details className="mt-6">
          <summary className="cursor-pointer text-[9px] uppercase tracking-[0.3em] text-foreground/40 hover:text-gold">
            Advanced fragrance details
          </summary>
          <div className="mt-3">
            {gated("concentration", "Concentration")}
            {gated("topNotes", "Top Notes")}
            {gated("heartNotes", "Heart Notes")}
            {gated("baseNotes", "Base Notes")}
            <Row label="Sillage (raw)" value={`${p.rating_sillage}/10`} />
            <Row label="Longevity (raw)" value={`${p.rating_longevity}/10`} />
          </div>
        </details>
      )}
    </div>
  );
}

export function ComparisonTool() {
  const { data: perfumes = [] } = usePerfumes();
  const { data: brands = [] } = useBrands();
  const { data: variants = [] } = useAllVariants();
  const { data: promotions = [] } = usePromotions();
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");

  useEffect(() => {
    if (!perfumes.length) return;
    if (!a || !perfumes.some((p) => p.id === a)) setA(perfumes[0].id);
    if (!b || !perfumes.some((p) => p.id === b)) setB((perfumes[1] ?? perfumes[0]).id);
  }, [perfumes, a, b]);

  const selectA = (id: string) => {
    setA(id);
    trackEvent("compare_add", { perfumeId: id });
  };
  const selectB = (id: string) => {
    setB(id);
    trackEvent("compare_add", { perfumeId: id });
  };

  // A row is only worth showing at all if at least one of the two selected
  // perfumes has real data for it — otherwise the whole row (both cards)
  // is skipped, per the "remove the entire attribute row" requirement.
  // Recomputed whenever the selection changes so the table adapts per pair.
  const visibleKeys = useMemo(() => {
    const pA = perfumes.find((p) => p.id === a) ?? perfumes[0];
    const pB = perfumes.find((p) => p.id === b) ?? perfumes[0];
    const keys = new Set<keyof AttrValues>();
    if (!pA || !pB) return keys;
    const valuesA = attributeValues(pA, variants);
    const valuesB = attributeValues(pB, variants);
    (Object.keys(valuesA) as (keyof AttrValues)[]).forEach((key) => {
      if (isValid(valuesA[key]) || isValid(valuesB[key])) keys.add(key);
    });
    return keys;
  }, [perfumes, variants, a, b]);

  if (perfumes.length < 1) return null;

  return (
    <section id="comparison" className="section-pad relative px-6 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 grid grid-cols-1 items-end gap-6 lg:grid-cols-[auto_1fr]">
          <span className="section-index text-[14vw] leading-none md:text-[6vw]">06</span>
          <div>
            <p className="label-eyebrow mb-5">Side by Side</p>
            <h2 className="heading-section" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}>
              Compare <span className="text-gradient-gold">Two Perfumes</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Side
            perfumes={perfumes}
            brands={brands}
            variants={variants}
            promotions={promotions}
            value={a}
            onChange={selectA}
            visibleKeys={visibleKeys}
          />
          <Side
            perfumes={perfumes}
            brands={brands}
            variants={variants}
            promotions={promotions}
            value={b}
            onChange={selectB}
            visibleKeys={visibleKeys}
          />
        </div>
      </div>
    </section>
  );
}
