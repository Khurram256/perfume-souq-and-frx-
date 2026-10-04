import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND, breadcrumbLd, pageTitle, seo } from "@/lib/seo";
import { prefetchCatalog } from "@/lib/api/prefetch";
import { useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import { usePromotions, usePerfumes, useAllVariants, trackEvent } from "@/lib/api/queries";
import { isPromotionLiveNow } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";

export const Route = createFileRoute("/offers")({
  loader: async ({ context }) => {
    await prefetchCatalog(context.queryClient);
  },
  head: () => {
    const base = seo({
      title: pageTitle("Perfume Offers & Discounts"),
      description: `Current offers and discounts on authentic perfumes at ${BRAND}. See what's on promotion and order on WhatsApp.`,
      path: "/offers",
    });
    return {
      ...base,
      meta: [
        ...base.meta,
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Offers", path: "/offers" },
        ]),
      ],
    };
  },
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
  const { data: promotions = [], isLoading } = usePromotions();
  const { data: perfumes = [] } = usePerfumes();
  const { data: variants = [] } = useAllVariants();

  const livePromotions = useMemo(() => promotions.filter((p) => isPromotionLiveNow(p) && p.discount_type !== "bundle"), [promotions]);

  return (
    <main className="section-pad page-top relative px-6 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="label-eyebrow mb-4">Current Offers</p>
        <h1 className="heading-section mb-16">Souq Offers</h1>

        {isLoading && <p className="text-sm text-foreground/50">Loading offers…</p>}

        {!isLoading && !livePromotions.length && (
          <div>
            <p className="text-sm font-light text-foreground/60">No active offers right now — check back soon.</p>
            <Link
              to="/shop"
              className="btn-gold mt-8 inline-block px-8 py-3.5 text-[10px] uppercase tracking-[0.4em]"
            >
              Browse the Collection
            </Link>
          </div>
        )}

        {livePromotions.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
      </div>
    </main>
  );
}
