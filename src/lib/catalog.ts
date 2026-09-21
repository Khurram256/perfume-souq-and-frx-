import type { Perfume, ProductVariant } from "@/lib/api/queries";

// Diacritic- and case-insensitive text used for every catalogue search, so
// "althair" finds "Althaïr" and "maracuja" finds "Oud Maracujá".
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .trim();
}

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// The database stores "unisex" for anything listed as "Women and Men".
export function genderLabel(g: Perfume["gender"]): string {
  if (g === "men") return "Men";
  if (g === "women") return "Women";
  if (g === "unisex") return "Women & Men";
  return "";
}

// Bottle sizes, smallest first. Falls back to the stored sort order for
// legacy variants that carry no numeric size.
export function sortedSizes(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort(
    (a, b) => (a.size_ml ?? Infinity) - (b.size_ml ?? Infinity) || a.sort_order - b.sort_order,
  );
}

export function formatSizeList(variants: ProductVariant[], separator = " | "): string {
  return sortedSizes(variants)
    .map((v) => v.size_label)
    .join(separator);
}

// Every perfume row is created with default rating values (7 for the six core
// ratings, 5 for the three added later). A row that still holds exactly those
// defaults has never had real rating data entered — showing "Long-lasting" or
// "Moderate projection" for it would be inventing a performance claim. Rows
// with any deliberate value are treated as real.
export function hasRatingData(p: Pick<
  Perfume,
  | "rating_longevity"
  | "rating_sillage"
  | "rating_projection"
  | "rating_versatility"
  | "rating_compliment"
  | "rating_uniqueness"
  | "rating_sweetness"
  | "rating_freshness"
  | "rating_warmth"
>): boolean {
  const untouched =
    p.rating_longevity === 7 &&
    p.rating_sillage === 7 &&
    p.rating_projection === 7 &&
    p.rating_versatility === 7 &&
    p.rating_compliment === 7 &&
    p.rating_uniqueness === 7 &&
    p.rating_sweetness === 5 &&
    p.rating_freshness === 5 &&
    p.rating_warmth === 5;
  return !untouched;
}

// Everything a shopper might reasonably type: name, brand, family, perfumer,
// concentration, every accord and every note in every tier.
export function searchHaystack(p: Perfume, brandName?: string): string {
  return normalizeText(
    [
      p.name,
      brandName,
      p.family,
      p.concentration,
      p.perfumer,
      ...p.main_accords,
      ...p.top_notes,
      ...p.heart_notes,
      ...p.base_notes,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

// Every word typed must appear somewhere ("tom ford vanilla" matches Tom Ford
// Tobacco Vanille), in any order.
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}
