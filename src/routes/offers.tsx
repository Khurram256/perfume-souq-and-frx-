import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import { usePromotions, useBundles, usePerfumes, useAllVariants, trackEvent } from "@/lib/api/queries";
import { isPromotionLiveNow, resolveVariantPrice, resolveBundlePrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers — The Perfume Souq by Khurram Shabbir" },
      { name: "description", content: "Current discounts, promotions, and bundles from The Perfume Souq." },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Navbar />
        <OffersContent />
        <Footer />
        <CartDrawer />
        <FlyToCart />
        <ContactButton />
      </div>
    </CartProvider>
  );
}

function OffersContent() {
  const { data: promotions = [] } = usePromotions();
  const { data: bundles = [] } = useBundles();
  const { data: perfumes = [] } = usePerfumes();
  const { data: variants = [] } = useAllVariants();

  const livePromotions = useMemo(() => promotions.filter((p) => isPromotionLiveNow(p) && p.discount_type !== "bundle"), [promotions]);
  const liveBundles = useMemo(
    () =>
      bundles.filter((b) => {
        if (!b.active) return false;
        const now = new Date();
        if (b.starts_at && new Date(b.starts_at) > now) return false;
        if (b.ends_at && new Date(b.ends_at) < now) return false;
        return true;
      }),
    [bundles]
  );

  const perfumeById = useMemo(() => new Map(perfumes.map((p) => [p.id, p])), [perfumes]);
  const variantById = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);

  return (
    <main className="section-pad relative px-6 pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="label-eyebrow mb-4">Current Offers</p>
        <h1 className="heading-section mb-16">Souq Offers &amp; Bundles</h1>

        {!livePromotions.length && !liveBundles.length && (
          <p className="text-sm font-light text-foreground/50">No active offers right now — check back soon.</p>
        )}

        {livePromotions.length > 0 && (
          <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2">
            {livePromotions.map((promo) => {
              const targetedProducts = perfumes.filter((p) => {
                return promo.targets.some((t) => {
                  if (t.target_type === "all") return true;
                  if (t.target_type === "product") return t.target_id === p.id;
                  if (t.target_type === "brand") return t.target_id === p.brand_id;
                  if (t.target_type === "category") return t.target_id === p.category_id;
                  if (t.target_type === "variant") return variants.some((v) => v.id === t.target_id && v.perfume_id === p.id);
                  return false;
                });
              });
              return (
                <div key={promo.id} className="glass-card rounded-sm p-8" onMouseEnter={() => trackEvent("offer_view", { promotionId: promo.id })}>
                  {promo.badge_text && (
                    <span className="mb-4 inline-block rounded-full border border-gold/50 px-3 py-1 text-[8px] uppercase tracking-[0.3em] text-gold">
                      {promo.badge_text}
                    </span>
                  )}
                  <h2 className="font-display text-2xl italic">{promo.name}</h2>
                  {promo.customer_description && <p className="mt-3 text-sm font-light text-foreground/70">{promo.customer_description}</p>}
                  <p className="mt-4 text-xs uppercase tracking-[0.3em] text-gold/80">
                    {promo.discount_type === "percentage" ? `${promo.discount_value}% Off` : `${formatPKR(promo.discount_value)} Off`}
                  </p>
                  {promo.terms && <p className="mt-4 text-[11px] text-foreground/40">{promo.terms}</p>}
                  {targetedProducts.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {targetedProducts.slice(0, 4).map((p) => (
                        <Link
                          key={p.id}
                          to="/product/$slug"
                          params={{ slug: p.slug }}
                          onClick={() => trackEvent("offer_click", { promotionId: promo.id, perfumeId: p.id })}
                          className="link-underline text-[10px] uppercase tracking-[0.3em] text-gold"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {liveBundles.length > 0 && (
          <div>
            <p className="label-eyebrow mb-6">Bundles</p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {liveBundles.map((bundle) => {
                const items = bundle.items
                  .map((item) => {
                    const v = variantById.get(item.variant_id);
                    const p = v ? perfumeById.get(v.perfume_id) : undefined;
                    return v && p ? { variant: v, perfume: p, quantity: item.quantity } : null;
                  })
                  .filter((x): x is NonNullable<typeof x> => !!x);
                const originalTotal = items.reduce((s, i) => s + i.variant.price_pkr * i.quantity, 0);
                const priced = resolveBundlePrice(bundle, originalTotal);
                return (
                  <div key={bundle.id} className="glass-card rounded-sm p-8" onMouseEnter={() => trackEvent("bundle_view", { bundleId: bundle.id })}>
                    <h2 className="font-display text-2xl italic">{bundle.name}</h2>
                    {bundle.description && <p className="mt-3 text-sm font-light text-foreground/70">{bundle.description}</p>}
                    <ul className="mt-4 space-y-1 text-xs text-foreground/60">
                      {items.map((i) => (
                        <li key={i.variant.id}>
                          {i.quantity}× {i.perfume.name} ({i.variant.size_label})
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex items-center gap-3">
                      {priced.discountAmount > 0 && <span className="text-xs text-foreground/40 line-through">{formatPKR(priced.originalPrice)}</span>}
                      <span className="text-gradient-gold font-display text-xl">{formatPKR(priced.finalPrice)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
