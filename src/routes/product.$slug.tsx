import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import {
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
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("perfumes")
      .select(
        "id,name,tagline,description,meta_title,meta_description,og_image_url,image_url,price_pkr,in_stock,concentration,family,brand:brands(name)",
      )
      .eq("slug", params.slug)
      .maybeSingle();
    if (!data) return null;
    // Sizes feed the structured data, so search engines see every real
    // bottle size and price instead of a single flat number.
    const { data: variants } = await supabase
      .from("product_variants")
      .select("size_label,size_ml,price_pkr,in_stock")
      .eq("perfume_id", data.id)
      .order("sort_order");
    return { ...data, variants: variants ?? [] };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product Not Found — The Perfume Souq" }] };
    }
    const brandName = (loaderData.brand as { name: string } | null)?.name;
    const title =
      loaderData.meta_title ||
      `${loaderData.name}${brandName ? ` by ${brandName}` : ""} — The Perfume Souq`;
    const description =
      loaderData.meta_description ||
      loaderData.tagline ||
      loaderData.description ||
      `Shop ${loaderData.name} at The Perfume Souq.`;
    const image = loaderData.og_image_url || loaderData.image_url || undefined;
    const canonicalUrl = `https://theperfumesouq.pk/product/${params.slug}`;

    const availability = (inStock: boolean) =>
      inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
    const variants = loaderData.variants;
    const offerFor = (v: { size_label: string; price_pkr: number; in_stock: boolean }, named: boolean) => ({
      "@type": "Offer",
      url: canonicalUrl,
      ...(named ? { name: v.size_label } : {}),
      priceCurrency: "PKR",
      price: v.price_pkr,
      availability: availability(v.in_stock),
    });
    let offers: Record<string, unknown>;
    if (variants.length > 1) {
      const prices = variants.map((v) => v.price_pkr);
      offers = {
        "@type": "AggregateOffer",
        priceCurrency: "PKR",
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: variants.length,
        offers: variants.map((v) => offerFor(v, true)),
      };
    } else if (variants.length === 1) {
      offers = offerFor(variants[0], false);
    } else {
      offers = offerFor(
        { size_label: "", price_pkr: loaderData.price_pkr, in_stock: loaderData.in_stock },
        false,
      );
    }

    // Only real, verified fields — no fabricated ratings, reviews, or
    // shipping claims (per the explicit "no fake reviews" requirement).
    const productLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: loaderData.name,
      description: loaderData.description || loaderData.tagline || undefined,
      url: canonicalUrl,
      ...(image ? { image } : {}),
      ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
      ...(loaderData.family ? { category: loaderData.family } : {}),
      offers,
    };
    // Mirrors the breadcrumb trail the page actually renders above the title.
    const breadcrumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Shop", item: "https://theperfumesouq.pk/shop" },
        ...(brandName ? [{ "@type": "ListItem", position: 2, name: brandName }] : []),
        { "@type": "ListItem", position: brandName ? 3 : 2, name: loaderData.name, item: canonicalUrl },
      ],
    };
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonicalUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { "script:ld+json": productLd },
        { "script:ld+json": breadcrumbLd },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
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
      : `https://theperfumesouq.pk/product/${perfume.slug}`;

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
    <main className="section-pad relative px-6 pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="mb-10 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.35em] text-foreground/40">
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

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <div className="relative flex min-h-[320px] items-center justify-center">
            {perfume.image_url ? (
              <img
                src={perfume.image_url}
                alt={`${perfume.name}${brand ? ` by ${brand.name}` : ""}`}
                fetchPriority="high"
                decoding="async"
                className={`max-h-[560px] w-auto ${inStock ? "" : "opacity-50"}`}
              />
            ) : (
              <div className="flex h-80 w-full max-w-sm items-center justify-center rounded-sm border border-dashed border-foreground/15 text-[10px] uppercase tracking-[0.3em] text-foreground/30">
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
                        className={`rounded-full border px-5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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

            <div className="mt-8 flex flex-wrap gap-3">
              {perfume.gender && <span className={chipCls}>{genderLabel(perfume.gender)}</span>}
              {perfume.concentration && <span className={chipCls}>{perfume.concentration}</span>}
              {perfume.family && <span className={chipCls}>{perfume.family}</span>}
            </div>

            {(perfume.launch_year || perfume.perfumer) && (
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                {perfume.launch_year && (
                  <>
                    <dt className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">Launched</dt>
                    <dd className="text-foreground/75">{perfume.launch_year}</dd>
                  </>
                )}
                {perfume.perfumer && (
                  <>
                    <dt className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">Perfumer</dt>
                    <dd className="text-foreground/75">{perfume.perfumer}</dd>
                  </>
                )}
              </dl>
            )}

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

            {inStock && (
              <div className="mt-10 flex items-center gap-4">
                <span className="text-[9px] uppercase tracking-[0.4em] text-foreground/50">Quantity</span>
                <div className="flex items-center rounded-full border border-gold/25">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="px-3 py-2 text-foreground/70 hover:text-gold disabled:opacity-30"
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
                    className="px-3 py-2 text-foreground/70 hover:text-gold disabled:opacity-30"
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
                  className="min-w-[240px] flex-1 rounded-sm border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-foreground/40"
                />
                <button
                  type="submit"
                  className="rounded-sm border border-gold/50 px-6 py-3 text-[10px] uppercase tracking-[0.35em] text-gold"
                >
                  Notify Me
                </button>
              </form>
            )}
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
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="mb-3 h-32 w-auto object-contain"
                    />
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
