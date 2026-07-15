import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import { useBrands } from "@/lib/api/queries";

export const Route = createFileRoute("/brands")({
  head: () => ({
    meta: [
      { title: "Maisons — The Perfume Souq by Khurram Shabbir" },
      { name: "description", content: "Explore the maisons and houses carried by The Perfume Souq." },
    ],
  }),
  component: BrandsPage,
});

function BrandsPage() {
  const { data: brands = [], isLoading } = useBrands();
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Navbar />
        <main className="section-pad relative px-6 pt-32 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <p className="label-eyebrow mb-4">Our Maisons</p>
            <h1 className="heading-section mb-16">Houses We Carry</h1>

            {isLoading && <p className="text-sm text-foreground/50">Loading…</p>}
            {!isLoading && !brands.length && (
              <p className="text-sm font-light text-foreground/50">Maisons are being added — check back soon.</p>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => (
                <Link
                  key={b.id}
                  to="/brand/$slug"
                  params={{ slug: b.slug }}
                  className="glass-card flex flex-col items-center rounded-sm p-8 text-center transition-transform hover:-translate-y-1"
                >
                  {b.logo_url && <img src={b.logo_url} alt={b.name} className="mb-4 h-14 w-auto" />}
                  <h2 className="font-display text-xl italic">{b.name}</h2>
                  {b.origin_country && <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-foreground/45">{b.origin_country}</p>}
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
