import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import {
  perfumeBySlugQuery,
  variantsQuery,
  usePerfumeBySlug,
  useVariants,
  useBrands,
  usePromotions,
  usePerfumes,
  useSettings,
  useSubmitBackInStock,
  trackEvent,
} from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";
import { genderLabel, sortedSizes } from "@/lib/catalog";
import { waLink } from "@/lib/contact";
import { absoluteUrl } from "@/lib/site";
import { BRAND, breadcrumbLd, jsonLd, pageTitle, sellerRef, seo } from "@/lib/seo";
import { prefetchCatalog } from "@/lib/api/prefetch";

const GENDER_AUDIENCE = { men: "male", women: "female", unisex: "unisex" } as const;

export const Route = createFileRoute("/product/$slug")({
  // Server-renders the product (name, price, sizes, notes, related links) and
  // returns a real 404 status for unknown/unpublished slugs so search engines
  // drop dead URLs instead of indexing a "not found" page.
  loader: async ({ params, context }) => {
    const qc = context.queryClient;
    const [{ brands }, perfume] = await Promise.all([
      prefetchCatalog(qc),
      qc.ensureQueryData(perfumeBySlugQuery(params.slug)),
    ]);
    if (!perfume) throw notFound();
    const variants = await qc.ensureQueryData(variantsQuery(perfume.id));
    const brand = brands.find((x) => x.id === perfume.brand_id);
    return {
      id: perfume.id,
      name: perfume.name,
      tagline: perfume.tagline,
      description: perfume.description,
      meta_title: perfume.meta_title,
      meta_description: perfume.meta_description,
      image: perfume.og_image_url || perfume.image_url || null,
      price_pkr: perfume.price_pkr,
      in_stock: perfume.in_stock,
      sku: perfume.sku,
      gender: perfume.gender,
      family: perfume.family,
      concentration: perfume.concentration,
      main_accords: perfume.main_accords ?? [],
      top_notes: perfume.top_notes ?? [],
      heart_notes: perfume.heart_notes ?? [],
      base_notes: perfume.base_notes ?? [],
      brand: brand ? { name: brand.name, slug: brand.slug } : null,
      variants: variants.map((v) => ({
        size_label: v.size_label,
        price_pkr: v.price_pkr,
        in_stock: v.in_stock,
        sku: v.sku,
      })),
    };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return seo({ title: pageTitle("Perfume Not Found"), description: "This perfume could not be found.", noindex: true });
    }
    const p = loaderData;
    const brandName = p.brand?.name;
    const path = `/product/${params.slug}`;
    const canonicalUrl = absoluteUrl(path);
    const fullName = `${p.name}${brandName ? ` by ${brandName}` : ""}`;
    const title = p.meta_title || pageTitle(fullName);

    const prices = p.variants.length ? p.variants.map((v) => v.price_pkr) : [p.price_pkr];
    const fromPrice = Math.min(...prices);
    const sizes = p.variants.map((v) => v.size_label).join(" / ");
    // One sentence of real facts: what it is, sizes, price. One page per
    // perfume — sizes are options on it, never separate indexable pages.
    const facts = [
      p.family ? `${p.family} fragrance` : "fragrance",
      p.gender ? `for ${genderLabel(p.gender).toLowerCase()}` : "",
    ].filter(Boolean).join(" ");
    const composed =
      `${fullName} — ${facts}.` +
      (sizes ? ` ${sizes}` : "") +
      ` ${p.variants.length > 1 ? "from " : ""}${formatPKR(fromPrice)} at ${BRAND}.` +
      (p.description ? ` ${p.description}` : "");
    const description = p.meta_description || composed;

    const availability = (inStock: boolean) =>
      inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
    const offerFor = (v: { size_label: string; price_pkr: number; in_stock: boolean; sku?: string | null }, named: boolean) => ({
      "@type": "Offer",
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      ...(named ? { name: v.size_label } : {}),
      ...(v.sku ? { sku: v.sku } : {}),
      priceCurrency: "PKR",
      price: v.price_pkr,
      availability: availability(v.in_stock),
      seller: sellerRef(),
    });
    let offers: Record<string, unknown>;
    if (p.variants.length > 1) {
      offers = {
        "@type": "AggregateOffer",
        priceCurrency: "PKR",
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: p.variants.length,
        offers: p.variants.map((v) => offerFor(v, true)),
      };
    } else if (p.variants.length === 1) {
      offers = offerFor(p.variants[0], false);
    } else {
      offers = offerFor({ size_label: "", price_pkr: p.price_pkr, in_stock: p.in_stock }, false);
    }

    // Fragrance facts as structured properties — only what the catalogue holds.
    const prop = (name: string, value: string | string[] | null | undefined) => {
      const v = Array.isArray(value) ? value.join(", ") : value;
      return v ? [{ "@type": "PropertyValue", name, value: v }] : [];
    };
    const additionalProperty = [
      ...prop("Fragrance family", p.family),
      ...prop("Concentration", p.concentration),
      ...prop("Main accords", p.main_accords),
      ...prop("Top notes", p.top_notes),
      ...prop("Heart notes", p.heart_notes),
      ...prop("Base notes", p.base_notes),
    ];

    // Only real, verified fields — no fabricated ratings, reviews, or
    // shipping claims (per the explicit "no fake reviews" requirement).
    const productLd = jsonLd({
        "@type": "Product",
        name: p.name,
        ...(p.description || p.tagline ? { description: p.description || p.tagline } : {}),
        ...(canonicalUrl ? { url: canonicalUrl } : {}),
        ...(p.image ? { image: p.image } : {}),
        ...(p.sku ? { sku: p.sku } : {}),
        ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
        category: p.family ? `Perfume > ${p.family}` : "Perfume",
        ...(p.gender
          ? { audience: { "@type": "PeopleAudience", suggestedGender: GENDER_AUDIENCE[p.gender as keyof typeof GENDER_AUDIENCE] } }
          : {}),
        ...(additionalProperty.length ? { additionalProperty } : {}),
        offers,
    });
    const base = seo({ title, description, path, image: p.image, type: "product" });
    return {
      ...base,
      meta: [
        ...base.meta,
        productLd,
        // Mirrors the breadcrumb trail the page actually renders above the title.
        breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
          ...(p.brand ? [{ name: p.brand.name, path: `/brand/${p.brand.slug}` }] : []),
          { name: p.name, path },
        ]),
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Navbar />
        <ProductContent />
        <Footer />
        <CartDrawer />
        <FlyToCart />
        <ContactButton />
      </div>
    </CartProvider>
  );
}

const chipCls =
  "rounded-full border border-border px-4 py-1.5 text-[9px] uppercase tracking-[0.3em] text-foreground/60";

function NoteTier({ label, notes }: { label: string; notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">{label}</p>
      <p className="text-sm text-foreground/75">{notes.join(" · ")}</p>
    </div>
  );
}

function ProductContent() {
  const { slug } = Route.useParams();
  const { data: perfume, isLoading } = usePerfumeBySlug(slug);
  const { data: variants = [] } = useVariants(perfume?.id);
  const { data: brands = [] } = useBrands();
  const { data: promotions = [] } = usePromotions();
  const { data: allPerfumes = [] } = usePerfumes();
  const { data: settings } = useSettings();
  const submitBackInStock = useSubmitBackInStock();
  const { add } = useCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const sizeGroupRef = useRef<HTMLDivElement>(null);

  // A different product is a fresh decision: never carry a size (or
  // quantity) chosen on the previous perfume across to this one.
  useEffect(() => {
    setSelectedVariantId(null);
    setQty(1);
    setSizeError(false);
  }, [perfume?.id]);

  useEffect(() => {
    if (perfume)
      trackEvent("product_view", { perfumeId: perfume.id, sourcePath: `/product/${perfume.slug}` });
  }, [perfume]);

  const sizes = useMemo(() => sortedSizes(variants), [variants]);
  const isMulti = sizes.length > 1;
  const brand = brands.find((b) => b.id === perfume?.brand_id);

  // One size is simply the product; several sizes must be chosen explicitly
  // so nobody can end up buying a bottle they didn't pick.
  const selectedVariant = isMulti
    ? (sizes.find((v) => v.id === selectedVariantId) ?? null)
    : (sizes[0] ?? null);
  const needsSize = isMulti && !selectedVariant;

  const priceFor = (variant: (typeof sizes)[number]) =>
    resolveVariantPrice(variant.price_pkr, promotions, {
      perfumeId: perfume?.id ?? "",
      variantId: variant.id,
      brandId: perfume?.brand_id ?? null,
      categoryId: perfume?.category_id ?? null,
    });

  const cheapest = useMemo(
    () => (sizes.length ? sizes.reduce((m, v) => (v.price_pkr < m.price_pkr ? v : m)) : null),
    [sizes],
  );
  const price = useMemo(() => {
    const v = selectedVariant ?? cheapest;
    if (!perfume || !v) return null;
    return resolveVariantPrice(v.price_pkr, promotions, {
      perfumeId: perfume.id,
      variantId: v.id,
      brandId: perfume.brand_id,
      categoryId: perfume.category_id,
    });
  }, [perfume, selectedVariant, cheapest, promotions]);

  const related = useMemo(() => {
    if (!perfume) return [];
    return allPerfumes
      .filter((p) => p.id !== perfume.id)
      .map((p) => {
        let score = 0;
        if (p.category_id && p.category_id === perfume.category_id) score += 2;
        if (p.gender && p.gender === perfume.gender) score += 1;
        if (p.brand_id && p.brand_id === perfume.brand_id) score += 2;
        if (p.family && p.family === perfume.family) score += 2;
        // Overlapping main accords are the strongest real signal that two
        // fragrances smell alike.
        const shared = p.main_accords.filter((a) => perfume.main_accords.includes(a)).length;
        score += Math.min(shared, 5);
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.p);
  }, [perfume, allPerfumes]);

  if (isLoading) {
    return (
      <main className="section-pad px-6 pt-40 text-center text-sm text-foreground/50">
        Loading…
      </main>
    );
  }
  if (!perfume) {
    throw notFound();
  }

  const inStock = selectedVariant
    ? selectedVariant.in_stock
    : sizes.length
      ? sizes.some((v) => v.in_stock)
      : perfume.in_stock;

  const whatsappNumber = settings?.whatsapp_number ?? "923228408507";
  const productUrl =
    typeof window !== "undefined"
      ? window.location.href
      : (absoluteUrl(`/product/${perfume.slug}`) ?? `/product/${perfume.slug}`);

  const promptSize = () => {
    setSizeError(true);
    toast.error("Please choose a size first.");
    sizeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const buildOrderMessage = () => {
    const lines = [
      `Hello! I'd like to order from The Perfume Souq.`,
      ``,
      `Product: ${perfume.name}${brand ? ` (${brand.name})` : ""}`,
    ];
    if (selectedVariant) lines.push(`Size: ${selectedVariant.size_label}`);
    lines.push(`Quantity: ${qty}`);
    if (price) {
      if (price.discountAmount > 0) {
        lines.push(`Original Price: ${formatPKR(price.originalPrice)}`);
        lines.push(
          `Discount: -${formatPKR(price.discountAmount)}${price.appliedPromotions[0] ? ` (${price.appliedPromotions[0].name})` : ""}`,
        );
        lines.push(`Final Price: ${formatPKR(price.finalPrice)}`);
      } else {
        lines.push(`Price: ${formatPKR(price.finalPrice)}`);
      }
      if (qty > 1) lines.push(`Total: ${formatPKR(price.finalPrice * qty)}`);
    }
    lines.push(``, `Link: ${productUrl}`, ``, `Please confirm availability. Thank you!`);
    return lines.join("\n");
  };

  const handleAdd = () => {
    if (!inStock) return;
    if (needsSize) return promptSize();
    add(
      {
        id: selectedVariant?.id ?? perfume.id,
        perfumeId: perfume.id,
        variantId: selectedVariant?.id,
        sizeLabel: selectedVariant?.size_label,
        name: perfume.name,
        price: price ? price.finalPrice : perfume.price_pkr,
        originalPrice: price && price.discountAmount > 0 ? price.originalPrice : undefined,
        promotionName: price?.appliedPromotions[0]?.name,
        img: perfume.image_url || "",
      },
      null,
      qty,
    );
  };

  const handleOrder = (e: React.MouseEvent) => {
    if (needsSize) {
      e.preventDefault();
      return promptSize();
    }
    trackEvent("whatsapp_click", {
      perfumeId: perfume.id,
      variantId: selectedVariant?.id,
      promotionId: price?.appliedPromotions[0]?.id,
      sourcePath: `/product/${perfume.slug}`,
    });
  };

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    try {
      await submitBackInStock.mutateAsync({
        perfumeId: perfume.id,
        variantId: selectedVariant?.id,
        email: notifyEmail.trim(),
      });
      toast.success("We'll let you know the moment it's back.");
      setNotifyEmail("");
    } catch {
      toast.error("Couldn't submit that just now — please try again.");
    }
  };

  const hasNotes = perfume.top_notes.length + perfume.heart_notes.length + perfume.base_notes.length > 0;

  return (
    <main className="section-pad page-top relative px-6 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap sm:mb-10 gap-2 text-[10px] uppercase tracking-[0.35em] text-foreground/40">
          <Link to="/" className="hover:text-gold">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/shop" className="hover:text-gold">
            Shop
          </Link>
          <span aria-hidden="true">/</span>
          {brand && (
            <>
              <Link to="/brand/$slug" params={{ slug: brand.slug }} className="hover:text-gold">
                {brand.name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span className="text-foreground/70">{perfume.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative flex min-h-[240px] items-center justify-center sm:min-h-[320px]">
            {perfume.image_url ? (
              <img
                src={perfume.image_url}
                alt={`${perfume.name}${brand ? ` by ${brand.name}` : ""}`}
                fetchPriority="high"
                decoding="async"
                className={`max-h-[48vh] w-auto max-w-full object-contain sm:max-h-[560px] ${inStock ? "" : "opacity-50"}`}
              />
            ) : (
              <div className="flex h-60 w-full max-w-sm items-center justify-center rounded-sm border border-dashed sm:h-80 border-foreground/15 text-[10px] uppercase tracking-[0.3em] text-foreground/30">
                Image Coming Soon
              </div>
            )}
          </div>

          <div>
            {brand && <p className="label-eyebrow mb-3">{brand.name}</p>}
            <h1
              className="heading-section text-gradient-gold"
              style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)" }}
            >
              {perfume.name}
            </h1>
            {perfume.tagline && (
              <p className="mt-3 text-sm italic text-foreground/60">{perfume.tagline}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {price && price.discountAmount > 0 && (
                <span className="text-sm text-foreground/40 line-through">
                  {formatPKR(price.originalPrice)}
                </span>
              )}
              <span className="text-gradient-gold font-display text-3xl">
                {needsSize ? "From " : ""}
                {price ? formatPKR(price.finalPrice) : formatPKR(perfume.price_pkr)}
              </span>
              {price?.appliedPromotions[0]?.badge_text && (
                <span className="rounded-full border border-gold/50 px-3 py-1 text-[8px] uppercase tracking-[0.3em] text-gold">
                  {price.appliedPromotions[0].badge_text}
                </span>
              )}
            </div>

            {sizes.length > 0 && (
              <div className="mt-8" id="size" ref={sizeGroupRef}>
                <p className="mb-3 text-[9px] uppercase tracking-[0.4em] text-foreground/50">
                  {isMulti ? "Choose a size" : "Size"}
                </p>
                <div role="radiogroup" aria-label="Choose a size" className="flex flex-wrap gap-2">
                  {sizes.map((v) => {
                    const selected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          setSizeError(false);
                        }}
                        disabled={!v.in_stock}
                        className={`min-h-10 rounded-full border px-5 py-2.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected
                            ? "border-gold bg-gold text-obsidian"
                            : sizeError
                              ? "border-destructive/70 text-foreground/70 hover:border-gold"
                              : "border-gold/25 text-foreground/70 hover:border-gold/60"
                        }`}
                      >
                        {v.size_label}
                        {isMulti && (
                          <span className={`ml-2 ${selected ? "opacity-80" : "opacity-60"}`}>
                            {formatPKR(priceFor(v).finalPrice)}
                          </span>
                        )}
                        {!v.in_stock && " (Out of Stock)"}
                      </button>
                    );
                  })}
                </div>
                {sizeError && needsSize && (
                  <p role="alert" className="mt-3 text-xs text-destructive">
                    Please choose a size to continue.
                  </p>
                )}
              </div>
            )}


            {inStock && (
              <div className="mt-8 flex items-center gap-4">
                <span className="text-[9px] uppercase tracking-[0.4em] text-foreground/50">Quantity</span>
                <div className="flex items-center rounded-full border border-gold/25">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="flex h-10 w-10 items-center justify-center text-foreground/70 hover:text-gold disabled:opacity-30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span aria-live="polite" className="min-w-[2rem] text-center text-sm">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    disabled={qty >= 10}
                    className="flex h-10 w-10 items-center justify-center text-foreground/70 hover:text-gold disabled:opacity-30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {inStock ? (
                <>
                  <button
                    type="button"
                    onClick={handleAdd}
                    aria-disabled={needsSize}
                    className={`btn-gold inline-block px-10 py-4 text-[10px] uppercase tracking-[0.4em] ${needsSize ? "opacity-70" : ""}`}
                  >
                    {needsSize ? "Select a Size" : "Add to Cart"}
                  </button>
                  <a
                    href={needsSize ? "#size" : waLink(whatsappNumber, buildOrderMessage())}
                    target={needsSize ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    onClick={handleOrder}
                    className="link-underline inline-flex items-center px-2 text-[10px] uppercase tracking-[0.35em] text-gold/80"
                  >
                    Order via WhatsApp
                  </a>
                </>
              ) : (
                <span className="rounded-sm border border-foreground/20 px-6 py-3 text-[10px] uppercase tracking-[0.35em] text-foreground/50">
                  Currently Out of Stock
                </span>
              )}
              <a
                href="/#comparison"
                className="link-underline inline-flex items-center px-2 text-[10px] uppercase tracking-[0.35em] text-gold/80"
              >
                Compare with others
              </a>
            </div>

            {!inStock && (
              <form onSubmit={handleNotify} className="mt-6 flex flex-wrap gap-3">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  aria-label="Email for back-in-stock alert"
                  placeholder="Your email for a back-in-stock alert"
                  className="min-w-0 flex-1 basis-60 rounded-sm border border-border bg-transparent px-4 py-3 text-base text-foreground sm:text-sm placeholder:text-foreground/40"
                />
                <button
                  type="submit"
                  className="rounded-sm border border-gold/50 px-6 py-3 text-[10px] uppercase tracking-[0.35em] text-gold"
                >
                  Notify Me
                </button>
              </form>
            )}

            {/* Fragrance details come after the purchase controls so size ->
                quantity -> Add to Cart stay together on phones. */}
            <section aria-labelledby="fragrance-profile" className="mt-12 border-t border-gold/15 pt-8">
              <h2 id="fragrance-profile" className="text-[10px] uppercase tracking-[0.4em] text-gold">
                Fragrance Profile
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {perfume.gender && <span className={chipCls}>{genderLabel(perfume.gender)}</span>}
                {perfume.concentration && <span className={chipCls}>{perfume.concentration}</span>}
                {perfume.family && <span className={chipCls}>{perfume.family}</span>}
              </div>

              {perfume.main_accords.length > 0 && (
                <div className="mt-8">
                  <p className="mb-3 text-[9px] uppercase tracking-[0.4em] text-foreground/50">Main Accords</p>
                  <ul className="flex flex-wrap gap-2">
                    {perfume.main_accords.map((a) => (
                      <li
                        key={a}
                        className="rounded-full border border-gold/25 px-3 py-1 text-[10px] capitalize tracking-[0.15em] text-foreground/70"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasNotes && (
                <div className="mt-10 space-y-3 border-l border-gold/20 pl-5">
                  <NoteTier label="Top Notes" notes={perfume.top_notes} />
                  <NoteTier label="Heart Notes" notes={perfume.heart_notes} />
                  <NoteTier label="Base Notes" notes={perfume.base_notes} />
                </div>
              )}

              {perfume.description && (
                <p className="mt-8 text-sm font-light leading-relaxed text-foreground/70">
                  {perfume.description}
                </p>
              )}
            </section>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-24">
            <h2 className="label-eyebrow mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="glass-card flex flex-col items-center rounded-sm p-4 text-center"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="mb-3 h-32 w-auto object-contain"
                    />
                  ) : (
                    <div className="mb-3 flex h-32 w-full items-center justify-center text-[9px] uppercase tracking-[0.3em] text-foreground/30">
                      Image coming soon
                    </div>
                  )}
                  <p className="font-display text-sm italic">{p.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
