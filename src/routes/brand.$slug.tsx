import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import { useBrandBySlug, usePerfumes, useAllVariants, usePromotions } from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";
import { formatSizeList } from "@/lib/catalog";

export const Route = createFileRoute("/brand/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("brands")
      .select("name,story,meta_title,meta_description,hero_image_url,logo_url")
      .eq("slug", params.slug)
      .maybeSingle();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Maison Not Found — The Perfume Souq" }] };
    const title =
      loaderData.meta_title || `${loaderData.name} — The Perfume Souq by Khurram Shabbir`;
    const description =
      loaderData.meta_description ||
      loaderData.story ||
      `Shop ${loaderData.name} at The Perfume Souq.`;
    const image = loaderData.hero_image_url || loaderData.logo_url || undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: `https://theperfumesouq.pk/brand/${params.slug}` }],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Navbar />
        <BrandContent />
        <Footer />
        <CartDrawer />
        <FlyToCart />
        <ContactButton />
      </div>
    </CartProvider>
  );
}

function BrandContent() {
  const { slug } = Route.useParams();
  const { data: brand, isLoading } = useBrandBySlug(slug);
  const { data: perfumes = [] } = usePerfumes();
  const { data: variants = [] } = useAllVariants();
  const { data: promotions = [] } = usePromotions();

  const products = useMemo(() => {
    if (!brand) return [];
    return perfumes
      .filter((p) => p.brand_id === brand.id)
      .map((p) => {
        const pv = variants.filter((v) => v.perfume_id === p.id);
        // Price from the cheapest bottle — the smallest size is not always it.
        const dv = pv.length ? pv.reduce((m, v) => (v.price_pkr < m.price_pkr ? v : m)) : undefined;
        const price = dv
          ? resolveVariantPrice(dv.price_pkr, promotions, {
              perfumeId: p.id,
              variantId: dv.id,
              brandId: p.brand_id,
              categoryId: p.category_id,
            })
          : {
              finalPrice: p.price_pkr,
              originalPrice: p.price_pkr,
              discountAmount: 0,
              appliedPromotions: [],
            };
        return { perfume: p, price, sizes: formatSizeList(pv), multi: pv.length > 1 };
      });
  }, [brand, perfumes, variants, promotions]);

  if (isLoading)
    return (
      <main className="section-pad px-6 pt-40 text-center text-sm text-foreground/50">
        Loading…
      </main>
    );
  if (!brand) throw notFound();

  return (
    <main>
      <section
        className="section-pad relative overflow-hidden px-6 pt-32 text-center lg:px-16"
        style={
          brand.hero_image_url
            ? {
                backgroundImage: `linear-gradient(oklch(0.11 0.018 252 / 0.75), oklch(0.11 0.018 252 / 0.9)), url(${brand.hero_image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: "var(--obsidian)" }
        }
      >
        {brand.logo_url && (
          <img src={brand.logo_url} alt={brand.name} className="mx-auto mb-6 h-16 w-auto" />
        )}
        <h1
          className="heading-section text-gradient-gold"
          style={{ color: "oklch(0.96 0.012 220)" }}
        >
          {brand.name}
        </h1>
        {brand.origin_country && (
          <p
            className="mt-3 text-[10px] uppercase tracking-[0.4em]"
            style={{ color: "oklch(0.96 0.012 220 / 0.5)" }}
          >
            {brand.origin_country}
          </p>
        )}
        {brand.story && (
          <p
            className="mx-auto mt-6 max-w-2xl text-sm font-light leading-relaxed"
            style={{ color: "oklch(0.96 0.012 220 / 0.75)" }}
          >
            {brand.story}
          </p>
        )}
      </section>

      <section className="section-pad px-6 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <p className="label-eyebrow mb-8">Shop All From {brand.name}</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map(({ perfume, price, sizes, multi }) => (
              <Link
                key={perfume.id}
                to="/product/$slug"
                params={{ slug: perfume.slug }}
                className="glass-card flex flex-col items-center rounded-sm p-6 text-center transition-transform hover:-translate-y-1"
              >
                {perfume.image_url ? (
                  <img
                    src={perfume.image_url}
                    alt={perfume.name}
                    loading="lazy"
                    decoding="async"
                    className="mb-4 h-56 w-auto object-contain"
                  />
                ) : (
                  <div className="mb-4 flex h-56 w-full items-center justify-center rounded-sm border border-dashed border-foreground/15 text-[9px] uppercase tracking-[0.3em] text-foreground/30">
                    Image Coming Soon
                  </div>
                )}
                <h3 className="font-display text-xl italic">{perfume.name}</h3>
                {multi && sizes && <p className="mt-2 text-[10px] tracking-[0.2em] text-foreground/60">{sizes}</p>}
                <span className="text-gradient-gold mt-3 font-display text-lg">
                  {multi ? "From " : ""}
                  {formatPKR(price.finalPrice)}
                </span>
              </Link>
            ))}
          </div>
          {!products.length && (
            <p className="text-center text-sm text-foreground/50">
              No products from this maison yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
