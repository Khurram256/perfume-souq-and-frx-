import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalLink, ogUrlMeta } from "@/lib/site";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import { useBrands, usePerfumes } from "@/lib/api/queries";

export const Route = createFileRoute("/brands")({
  head: () => ({
    meta: [
      { title: "Maisons — The Perfume Souq by Khurram Shabbir" },
      {
        name: "description",
        content: "Explore the maisons and houses carried by The Perfume Souq.",
      },
      { property: "og:title", content: "Maisons — The Perfume Souq by Khurram Shabbir" },
      { property: "og:description", content: "Explore the maisons and houses carried by The Perfume Souq." },
      ...ogUrlMeta("/brands"),
    ],
    links: canonicalLink("/brands"),
  }),
  component: BrandsPage,
});

function BrandsPage() {
  const { data: allBrands = [], isLoading: brandsLoading } = useBrands();
  const { data: perfumes = [], isLoading: perfumesLoading } = usePerfumes();
  const isLoading = brandsLoading || perfumesLoading;
  // A maison with nothing in the catalogue is not "a house we carry" — list
  // only those with at least one perfume, and show how many.
  const counts = new Map<string, number>();
  for (const p of perfumes) if (p.brand_id) counts.set(p.brand_id, (counts.get(p.brand_id) ?? 0) + 1);
  const brands = allBrands.filter((b) => counts.has(b.id));
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="section-pad page-top relative px-6 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <p className="label-eyebrow mb-4">Our Maisons</p>
            <h1 className="heading-section mb-16">Houses We Carry</h1>

            {isLoading && <p className="text-sm text-foreground/50">Loading…</p>}
            {!isLoading && !brands.length && (
              <p className="text-sm font-light text-foreground/50">
                Maisons are being added — check back soon.
              </p>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => (
                <Link
                  key={b.id}
                  to="/brand/$slug"
                  params={{ slug: b.slug }}
                  className="glass-card flex flex-col items-center rounded-sm p-8 text-center transition-transform hover:-translate-y-1"
                >
                  {b.logo_url && (
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      loading="lazy"
                      decoding="async"
                      className="mb-4 h-14 w-auto"
                    />
                  )}
                  <h2 className="font-display text-xl italic">{b.name}</h2>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-foreground/45">
                    {counts.get(b.id)} {counts.get(b.id) === 1 ? "fragrance" : "fragrances"}
                  </p>
                  {b.origin_country && (
                    <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-foreground/45">
                      {b.origin_country}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </main>
        <Footer />
        <CartDrawer />
        <FlyToCart />
        <ContactButton />
      </div>
    </CartProvider>
  );
}
