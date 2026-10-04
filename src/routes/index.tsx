import { createFileRoute } from "@tanstack/react-router";
import { BRAND, seo, webPageLd } from "@/lib/seo";
import { prefetchCatalog } from "@/lib/api/prefetch";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Signature } from "@/components/Signature";
import { Collection } from "@/components/Collection";
import { FragranceQuiz } from "@/components/FragranceQuiz";
import { ComparisonTool } from "@/components/ComparisonTool";
import { CircleOfScent } from "@/components/CircleOfScent";
import { InstagramFeed } from "@/components/InstagramFeed";
import { Reviews } from "@/components/Reviews";
import { ClosingSection } from "@/components/ClosingSection";
import { Footer } from "@/components/Footer";
import { Particles } from "@/components/Particles";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ContactButton } from "@/components/ContactButton";
import { FlyToCart } from "@/components/FlyToCart";
import { OffersLayer, InlineOffers } from "@/components/OffersLayer";
import { BoutiqueLoader } from "@/components/BoutiqueLoader";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const { perfumes, brands } = await prefetchCatalog(context.queryClient, { spotlight: true });
    const houses = new Set(perfumes.map((p) => p.brand_id));
    return { perfumeCount: perfumes.length, brandCount: brands.filter((b) => houses.has(b.id)).length };
  },
  head: ({ loaderData }) => {
    const n = loaderData?.perfumeCount ?? 0;
    const b = loaderData?.brandCount ?? 0;
    const title = `${BRAND} — Authentic Designer & Niche Perfumes in Pakistan`;
    // Counts come from the live catalogue, so the snippet never goes stale.
    const range = n && b ? `${n} fragrances from ${b} houses` : "designer and niche fragrances";
    const description = `${BRAND} by Khurram Shabbir — authentic perfumes in Pakistan. Shop ${range}, compare scents side by side and order on WhatsApp.`;
    const base = seo({ title, description, path: "/" });
    return { ...base, meta: [...base.meta, webPageLd({ name: title, description, path: "/" })] };
  },
  component: Index,
});

function Index() {
  return (
    <CartProvider>
      <main className="grain relative min-h-screen bg-background text-foreground">
        <BoutiqueLoader />
        <Particles count={30} />
        <OffersLayer />
        <Navbar />
        <Hero />
        <About />
        <Signature />
        <Collection />
        <InlineOffers />
        <FragranceQuiz />
        <ComparisonTool />
        <CircleOfScent />
        <InstagramFeed />
        <Reviews />
        <ClosingSection />
        <Footer />
        <CartDrawer />
        <FlyToCart />
        <ContactButton />
      </main>
    </CartProvider>
  );
}
