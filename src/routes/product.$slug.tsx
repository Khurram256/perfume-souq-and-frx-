import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { waLink } from "@/lib/contact";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("perfumes")
      .select(
        "name,tagline,description,meta_title,meta_description,og_image_url,image_url,price_pkr,in_stock,concentration,brand:brands(name)",
      )
      .eq("slug", params.slug)
      .maybeSingle();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product Not Found — The Perfume Souq" }] };
    }
    const title =
      loaderData.meta_title || `${loaderData.name} — The Perfume Souq by Khurram Shabbir`;
    const description =
      loaderData.meta_description ||
      loaderData.tagline ||
      loaderData.description ||
      `Shop ${loaderData.name} at The Perfume Souq.`;
    const image = loaderData.og_image_url || loaderData.image_url || undefined;
    const canonicalUrl = `https://theperfumesouq.pk/product/${params.slug}`;
    // Only real, verified fields — no fabricated ratings, reviews, or
    // shipping claims (per the explicit "no fake reviews" requirement).
    const productLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: loaderData.name,
      description: loaderData.description || loaderData.tagline || undefined,
      url: canonicalUrl,
      ...(image ? { image } : {}),
      ...(loaderData.brand ? { brand: { "@type": "Brand", name: (loaderData.brand as { name: string }).name } } : {}),
      offers: {
        "@type": "Offer",
        url: canonicalUrl,
        priceCurrency: "PKR",
        price: loaderData.price_pkr,
        availability: loaderData.in_stock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    };
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        { "script:ld+json": productLd },
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
  const [notifyEmail, setNotifyEmail] = useState("");

  useEffect(() => {
    if (variants.length && !selectedVariantId) {
      setSelectedVariantId((variants.find((v) => v.is_default) ?? variants[0]).id);
    }
  }, [variants, selectedVariantId]);

  useEffect(() => {
    if (perfume)
      trackEvent("product_view", { perfumeId: perfume.id, sourcePath: `/product/${perfume.slug}` });
  }, [perfume]);

  const brand = brands.find((b) => b.id === perfume?.brand_id);
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  const price = useMemo(() => {
    if (!perfume || !selectedVariant) return null;
    return resolveVariantPrice(selectedVariant.price_pkr, promotions, {
      perfumeId: perfume.id,
      variantId: selectedVariant.id,
      brandId: perfume.brand_id,
      categoryId: perfume.category_id,
    });
  }, [perfume, selectedVariant, promotions]);

  const related = useMemo(() => {
    if (!perfume) return [];
    return allPerfumes
      .filter((p) => p.id !== perfume.id)
      .map((p) => {
        let score = 0;
        if (p.category_id && p.category_id === perfume.category_id) score += 3;
        if (p.gender && p.gender === perfume.gender) score += 2;
        if (p.brand_id && p.brand_id === perfume.brand_id) score += 2;
        if (p.tag_family && p.tag_family === perfume.tag_family) score += 1;
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

  const inStock = selectedVariant ? selectedVariant.in_stock : perfume.in_stock;

  const whatsappNumber = settings?.whatsapp_number ?? "923228408507";
  const productUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://theperfumesouq.pk/product/${perfume.slug}`;

  const buildOrderMessage = () => {
    const lines = [
      `Hello! I'd like to order from The Perfume Souq.`,
      ``,
      `Product: ${perfume.name}${brand ? ` (${brand.name})` : ""}`,
    ];
    if (selectedVariant) lines.push(`Size: ${selectedVariant.size_label}`);
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
    }
    lines.push(``, `Link: ${productUrl}`, ``, `Please confirm availability. Thank you!`);
    return lines.join("\n");
  };

  const handleAdd = () => {
    if (!inStock) return;
    add({
      id: selectedVariant?.id ?? perfume.id,
      perfumeId: perfume.id,
      variantId: selectedVariant?.id,
      sizeLabel: selectedVariant?.size_label,
      name: perfume.name,
      price: price ? price.finalPrice : perfume.price_pkr,
      originalPrice: price && price.discountAmount > 0 ? price.originalPrice : undefined,
      promotionName: price?.appliedPromotions[0]?.name,
      img: perfume.image_url || "",
    });
  };

  const handleOrder = () => {
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

  return (
    <main className="section-pad relative px-6 pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-10 flex gap-2 text-[10px] uppercase tracking-[0.35em] text-foreground/40">
          <Link to="/shop" className="hover:text-gold">
            Shop
          </Link>
          <span>/</span>
          {brand && (
            <>
              <Link to="/brand/$slug" params={{ slug: brand.slug }} className="hover:text-gold">
                {brand.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground/70">{perfume.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <div className="relative flex min-h-[320px] items-center justify-center">
            {perfume.image_url ? (
              <img
                src={perfume.image_url}
                alt={perfume.name}
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

            <div className="mt-6 flex items-center gap-3">
              {price && price.discountAmount > 0 && (
                <span className="text-sm text-foreground/40 line-through">
                  {formatPKR(price.originalPrice)}
                </span>
              )}
              <span className="text-gradient-gold font-display text-3xl">
                {price ? formatPKR(price.finalPrice) : formatPKR(perfume.price_pkr)}
              </span>
              {price?.appliedPromotions[0]?.badge_text && (
                <span className="rounded-full border border-gold/50 px-3 py-1 text-[8px] uppercase tracking-[0.3em] text-gold">
                  {price.appliedPromotions[0].badge_text}
                </span>
              )}
            </div>

            {variants.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 text-[9px] uppercase tracking-[0.4em] text-foreground/50">
                  Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={!v.in_stock}
                      className={`rounded-full border px-5 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        selectedVariantId === v.id
                          ? "border-gold bg-gold text-obsidian"
                          : "border-gold/25 text-foreground/70 hover:border-gold/60"
                      }`}
                    >
                      {v.size_label}
                      {!v.in_stock && " (Out of Stock)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {perfume.gender && (
                <span className="rounded-full border border-border px-4 py-1.5 text-[9px] uppercase tracking-[0.3em] text-foreground/60">
                  {perfume.gender}
                </span>
              )}
              {perfume.concentration && (
                <span className="rounded-full border border-border px-4 py-1.5 text-[9px] uppercase tracking-[0.3em] text-foreground/60">
                  {perfume.concentration}
                </span>
              )}
              {perfume.family && (
                <span className="rounded-full border border-border px-4 py-1.5 text-[9px] uppercase tracking-[0.3em] text-foreground/60">
                  {perfume.family}
                </span>
              )}
            </div>

            <div className="mt-10 space-y-3 border-l border-gold/20 pl-5">
              <div>
                <p className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">
                  Top Notes
                </p>
                <p className="text-sm text-foreground/75">{perfume.top_notes.join(" · ") || "—"}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">
                  Heart Notes
                </p>
                <p className="text-sm text-foreground/75">
                  {perfume.heart_notes.join(" · ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">
                  Base Notes
                </p>
                <p className="text-sm text-foreground/75">
                  {perfume.base_notes.join(" · ") || "—"}
                </p>
              </div>
            </div>

            {perfume.description && (
              <p className="mt-8 text-sm font-light leading-relaxed text-foreground/70">
                {perfume.description}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-4">
              {inStock ? (
                <>
                  <button
                    onClick={handleAdd}
                    className="btn-gold inline-block px-10 py-4 text-[10px] uppercase tracking-[0.4em]"
                  >
                    Add to Cart
                  </button>
                  <a
                    href={waLink(whatsappNumber, buildOrderMessage())}
                    target="_blank"
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
              <Link
                to="/shop"
                className="link-underline inline-flex items-center px-2 text-[10px] uppercase tracking-[0.35em] text-gold/80"
              >
                Compare with others
              </Link>
            </div>

            {!inStock && (
              <form onSubmit={handleNotify} className="mt-6 flex flex-wrap gap-3">
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
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
            <p className="label-eyebrow mb-6">You May Also Like</p>
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
