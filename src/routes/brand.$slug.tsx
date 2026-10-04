import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BRAND, breadcrumbLd, itemListLd, pageTitle, seo, webPageLd } from "@/lib/seo";
import { prefetchCatalog } from "@/lib/api/prefetch";
import { useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import { brandBySlugQuery, useBrandBySlug, usePerfumes, useAllVariants, usePromotions } from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";
import { formatSizeList } from "@/lib/catalog";

export const Route = createFileRoute("/brand/$slug")({
  // Server-renders the brand and its perfumes; a missing brand is a real 404.
  loader: async ({ params, context }) => {
    const qc = context.queryClient;
    const [{ perfumes, variants }, brand] = await Promise.all([
      prefetchCatalog(qc),
      qc.ensureQueryData(brandBySlugQuery(params.slug)),
    ]);
    if (!brand) throw notFound();
    const products = perfumes.filter((p) => p.brand_id === brand.id);
    const ids = new Set(products.map((p) => p.id));
    const prices = [
      ...variants.filter((v) => ids.has(v.perfume_id)).map((v) => v.price_pkr),
      ...products.map((p) => p.price_pkr),
    ].filter((n) => n > 0);
    return {
      name: brand.name,
      story: brand.story,
      meta_title: brand.meta_title,
      meta_description: brand.meta_description,
      image: brand.hero_image_url || brand.logo_url || products.find((p) => p.image_url)?.image_url || null,
      products: products.map((p) => ({ name: p.name, slug: p.slug })),
      fromPrice: prices.length ? Math.min(...prices) : null,
    };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return seo({ title: pageTitle("Brand Not Found"), description: "This brand could not be found.", noindex: true });
    }
    const { name, products, fromPrice } = loaderData;
    const path = `/brand/${params.slug}`;
    const title = loaderData.meta_title || pageTitle(`${name} Perfumes`);
    // Real names and the real lowest price from the catalogue.
    const sample = products.slice(0, 4).map((p) => p.name).join(", ");
    const composed =
      `Shop ${products.length} ${name} ${products.length === 1 ? "fragrance" : "fragrances"} at ${BRAND}` +
      (sample ? ` — ${sample}${products.length > 4 ? " and more" : ""}.` : ".") +
      (fromPrice ? ` Prices from ${formatPKR(fromPrice)}.` : "");
    const description = loaderData.meta_description || composed;
    const base = seo({ title, description, path, image: loaderData.image });
    return {
      ...base,
      meta: [
        ...base.meta,
        webPageLd({ type: "CollectionPage", name: `${name} Perfumes`, description, path }),
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Brands", path: "/brands" },
          { name, path },
        ]),
        itemListLd(`${name} perfumes`, products.map((p) => ({ name: p.name, path: `/product/${p.slug}` }))),
      ],
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
        className="section-pad page-top relative overflow-hidden px-6 text-center lg:px-16"
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
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap justify-center gap-2 text-[10px] uppercase tracking-[0.35em]"
          style={{ color: "oklch(0.96 0.012 220 / 0.5)" }}
        >
          <Link to="/" className="hover:text-gold">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/brands" className="hover:text-gold">
            Brands
          </Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: "oklch(0.96 0.012 220 / 0.8)" }}>{brand.name}</span>
        </nav>
        {brand.logo_url && (
          <img src={brand.logo_url} alt={`${brand.name} logo`} className="mx-auto mb-6 h-16 w-auto" />
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
                    alt={`${perfume.name} by ${brand.name}`}
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
