import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Signature } from "@/components/Signature";
import { Collection } from "@/components/Collection";
import { FragranceQuiz } from "@/components/FragranceQuiz";
import { ComparisonTool } from "@/components/ComparisonTool";
import { CircleOfScent } from "@/components/CircleOfScent";
import { AdsCarousel } from "@/components/AdsCarousel";
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
  head: () => ({
    meta: [
      { title: "The Perfume Souq — by Khurram Shabbir" },
      {
        name: "description",
        content:
          "The Perfume Souq — a maison of rare olfactive composition. Obsidian, gold, and the silence you leave behind.",
      },
      { property: "og:title", content: "The Perfume Souq — by Khurram Shabbir" },
      { property: "og:description", content: "A maison of rare olfactive composition." },
    ],
  }),
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
        <AdsCarousel />
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
