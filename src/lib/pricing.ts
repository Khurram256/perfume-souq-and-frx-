// Single source of truth for turning a variant's base price into what the
// customer actually pays. Used by product cards, product pages, the offers
// page, and the WhatsApp message builder — nothing else may compute a
// discounted price independently.

export type PromotionTargetType = "all" | "product" | "variant" | "brand" | "category";

export type PromotionTarget = {
  target_type: PromotionTargetType;
  target_id: string | null;
};

export type Promotion = {
  id: string;
  name: string;
  customer_description: string | null;
  discount_type: "percentage" | "fixed" | "bundle";
  discount_value: number;
  badge_text: string | null;
  terms: string | null;
  stackable: boolean;
  priority: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  targets: PromotionTarget[];
};

export type PricingContext = {
  perfumeId: string;
  variantId: string;
  brandId: string | null;
  categoryId: string | null;
};

export function isPromotionLiveNow(p: Pick<Promotion, "active" | "starts_at" | "ends_at">, now = new Date()): boolean {
  if (!p.active) return false;
  if (p.starts_at && new Date(p.starts_at) > now) return false;
  if (p.ends_at && new Date(p.ends_at) < now) return false;
  return true;
}

function matchesTarget(target: PromotionTarget, ctx: PricingContext): boolean {
  switch (target.target_type) {
    case "all":
      return true;
    case "product":
      return target.target_id === ctx.perfumeId;
    case "variant":
      return target.target_id === ctx.variantId;
    case "brand":
      return !!ctx.brandId && target.target_id === ctx.brandId;
    case "category":
      return !!ctx.categoryId && target.target_id === ctx.categoryId;
    default:
      return false;
  }
}

// Discount-type promotions only — bundles are priced as a fixed bundle_price
// and resolved separately (see resolveBundlePrice below).
export function getApplicablePromotions(
  promotions: Promotion[],
  ctx: PricingContext,
  now = new Date()
): Promotion[] {
  return promotions.filter(
    (p) =>
      p.discount_type !== "bundle" &&
      isPromotionLiveNow(p, now) &&
      p.targets.some((t) => matchesTarget(t, ctx))
  );
}

function applyDiscount(price: number, promo: Promotion): number {
  if (promo.discount_type === "percentage") {
    return price - (price * promo.discount_value) / 100;
  }
  if (promo.discount_type === "fixed") {
    return price - promo.discount_value;
  }
  return price;
}

export type ResolvedPrice = {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  appliedPromotions: Promotion[];
};

// Precedence: non-stackable promotions compete for a single slot (highest
// `priority` wins, ties broken by larger resulting discount). Any stackable
// promotions apply on top, in descending priority order.
export function resolvePrice(basePrice: number, applicable: Promotion[]): ResolvedPrice {
  const stackable = applicable.filter((p) => p.stackable).sort((a, b) => b.priority - a.priority);
  const nonStackable = applicable.filter((p) => !p.stackable);

  let winner: Promotion | null = null;
  if (nonStackable.length) {
    winner = nonStackable.reduce((best, p) => {
      if (!best) return p;
      if (p.priority !== best.priority) return p.priority > best.priority ? p : best;
      const bestDiscount = best.discount_type === "percentage" ? basePrice * (best.discount_value / 100) : best.discount_value;
      const pDiscount = p.discount_type === "percentage" ? basePrice * (p.discount_value / 100) : p.discount_value;
      return pDiscount > bestDiscount ? p : best;
    }, null as Promotion | null);
  }

  const applied: Promotion[] = [];
  let price = basePrice;
  if (winner) {
    price = applyDiscount(price, winner);
    applied.push(winner);
  }
  for (const promo of stackable) {
    price = applyDiscount(price, promo);
    applied.push(promo);
  }

  price = Math.max(0, Math.round(price));
  return {
    originalPrice: basePrice,
    finalPrice: price,
    discountAmount: basePrice - price,
    appliedPromotions: applied,
  };
}

export function resolveVariantPrice(
  basePrice: number,
  promotions: Promotion[],
  ctx: PricingContext,
  now = new Date()
): ResolvedPrice {
  return resolvePrice(basePrice, getApplicablePromotions(promotions, ctx, now));
}

export type Bundle = {
  id: string;
  name: string;
  description: string | null;
  bundle_price_pkr: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function resolveBundlePrice(bundle: Bundle, itemOriginalTotal: number) {
  const finalPrice = Math.max(0, Math.round(bundle.bundle_price_pkr));
  return {
    originalPrice: itemOriginalTotal,
    finalPrice,
    discountAmount: Math.max(0, itemOriginalTotal - finalPrice),
  };
}
