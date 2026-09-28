import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Plus, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import {
  usePerfumes,
  useCategories,
  useBrands,
  useAllVariants,
  usePromotions,
  type Perfume,
  type ProductVariant,
} from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";
import { formatSizeList } from "@/lib/catalog";
import { SplitHeading } from "./SplitHeading";
import { BackInStockButton } from "./BackInStockButton";
import { Slider } from "./ui/slider";

const PAGE_SIZE = 6;

function ProductCard({
  p,
  variant,
  promotions,
  multipleSizes,
  sizes,
  brandName,
  anySizeInStock,
}: {
  p: Perfume;
  variant?: ProductVariant;
  promotions: ReturnType<typeof usePromotions>["data"];
  multipleSizes?: boolean;
  sizes?: string;
  brandName?: string;
  anySizeInStock?: boolean;
}) {
  const { add } = useCart();
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const price = variant
    ? resolveVariantPrice(variant.price_pkr, promotions ?? [], {
        perfumeId: p.id,
        variantId: variant.id,
        brandId: p.brand_id,
        categoryId: p.category_id,
      })
    : {
        originalPrice: p.price_pkr,
        finalPrice: p.price_pkr,
        discountAmount: 0,
        appliedPromotions: [],
      };
  const inStock = anySizeInStock ?? (variant ? variant.in_stock : p.in_stock);

  // Luxury-subtle tilt — max ~3° per the design direction (nothing exaggerated).
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 260, damping: 24 });
  const sry = useSpring(ry, { stiffness: 260, damping: 24 });
  const rotateX = useTransform(srx, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(sry, [-0.5, 0.5], [-3, 3]);
  const [hovering, setHovering] = useState(false);

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    ry.set((e.clientX - r.left) / r.width - 0.5);
    rx.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    setHovering(false);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inStock) return;
    const rect = imgRef.current?.getBoundingClientRect() ?? null;
    add(
      {
        id: variant?.id ?? p.id,
        perfumeId: p.id,
        variantId: variant?.id,
        sizeLabel: variant?.size_label,
        name: p.name,
        price: price.finalPrice,
        originalPrice: price.discountAmount > 0 ? price.originalPrice : undefined,
        promotionName: price.appliedPromotions[0]?.name,
        img: p.image_url || "",
      },
      rect,
    );
  };

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, perspective: 1000, y: hovering ? -6 : 0 }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8 }}
      className={`img-reveal-trigger tilt-card glass-card relative flex flex-col items-center overflow-hidden rounded-sm p-6 text-center transition-[transform] duration-300 sm:p-8 ${p.featured ? "spotlight-card" : ""}`}
    >
      <span className="card-sheen pointer-events-none" style={{ opacity: hovering ? 1 : 0 }} />

      {!inStock && (
        <span className="absolute left-4 top-4 z-[3] rounded-full border border-foreground/30 bg-black/60 px-3 py-1 text-[8px] uppercase tracking-[0.4em] text-foreground/70">
          Out of Stock
        </span>
      )}
      {p.featured && inStock && (
        <span className="absolute right-4 top-4 z-[3] rounded-full border border-gold/50 px-3 py-1 text-[8px] uppercase tracking-[0.4em] text-gold">
          Featured
        </span>
      )}

      {/* Product photography is the hero here — much larger stage, quiet grayscale-to-color bloom on hover */}
      <div
        className="relative mb-8 h-80 w-full overflow-visible"
        style={{ transform: "translateZ(30px)" }}
      >
        {p.image_url ? (
          <img
            ref={imgRef}
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            width={400}
            height={400}
            className={`img-reveal relative mx-auto h-full w-auto object-contain ${inStock ? "" : "opacity-50"}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-foreground/15 text-[9px] uppercase tracking-[0.3em] text-foreground/30">
            Image Coming Soon
          </div>
        )}
      </div>

      <p className="label-eyebrow mb-3 text-[9px]">{[brandName, p.family].filter(Boolean).join(" · ")}</p>
      <h3 className="font-display text-3xl italic">{p.name}</h3>
      {p.tagline && (
        <p className="mt-3 max-w-xs text-xs font-light leading-relaxed text-foreground/55">
          {p.tagline}
        </p>
      )}

      <details className="mt-6 w-full text-left">
        <summary className="link-underline cursor-pointer text-[9px] uppercase tracking-[0.4em] text-gold/80">
          Fragrance Notes
        </summary>
        <div className="mt-4 space-y-2 border-l border-gold/20 pl-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">Top</p>
            <p className="text-xs text-foreground/75">{p.top_notes.join(" · ") || "—"}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">Heart</p>
            <p className="text-xs text-foreground/75">{p.heart_notes.join(" · ") || "—"}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-[0.4em] text-foreground/40">Base</p>
            <p className="text-xs text-foreground/75">{p.base_notes.join(" · ") || "—"}</p>
          </div>
        </div>
      </details>

      <div className="mt-7 w-full border-t border-border pt-6">
        <span className="flex items-baseline justify-center gap-2">
          {price.discountAmount > 0 && (
            <span className="text-xs text-foreground/40 line-through">
              {formatPKR(price.originalPrice)}
            </span>
          )}
          <span className="text-gradient-gold font-display text-xl">
            {multipleSizes ? "From " : ""}
            {formatPKR(price.finalPrice)}
          </span>
        </span>
        {multipleSizes && sizes && (
          <p className="mt-2 text-[10px] tracking-[0.2em] text-foreground/60" aria-label={`Available sizes: ${sizes}`}>
            {sizes}
          </p>
        )}

        {/* Add to Cart and View Details are two distinct, always-available
            actions — Add to Cart works whether or not this perfume has a
            configured size (see order.functions.ts), it never disappears
            in favour of View Details. */}
        <div className="mt-4 flex items-center justify-center gap-5">
          {inStock ? (
            multipleSizes ? (
              <Link
                to="/product/$slug"
                params={{ slug: p.slug }}
                hash="size"
                className="tap-target flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold hover:text-gold/80"
              >
                Choose Size
              </Link>
            ) : (
              <button
                onClick={handleAdd}
                className="tap-target flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold hover:text-gold/80"
              >
                <Plus className="h-3 w-3" />
                Add to Cart
              </button>
            )
          ) : (
            <BackInStockButton
              perfumeId={p.id}
              variantId={variant?.id}
              className="tap-target text-[10px] uppercase tracking-[0.35em] text-gold hover:text-gold/80"
            />
          )}
          <Link
            to="/product/$slug"
            params={{ slug: p.slug }}
            className="tap-target link-underline text-[10px] uppercase tracking-[0.35em] text-foreground/60 hover:text-gold"
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export function Collection() {
  const { data: perfumes = [] } = usePerfumes();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: variants = [] } = useAllVariants();
  const promotions = usePromotions();
  const [filter, setFilter] = useState<string>("All");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Effective price of each perfume — cheapest live variant if it has any,
  // else its own base price — so the slider bounds and filtering reflect
  // what a customer actually pays, the same source of truth /shop uses.
  const priceByPerfumeId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of perfumes) {
      const pv = variants.filter((v) => v.perfume_id === p.id);
      const cheapest = pv.length ? Math.min(...pv.map((v) => v.price_pkr)) : p.price_pkr;
      map.set(p.id, cheapest);
    }
    return map;
  }, [perfumes, variants]);

  const priceBounds = useMemo(() => {
    const prices = [...priceByPerfumeId.values()].filter((p) => p > 0);
    if (!prices.length) return { min: 0, max: 100000 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [priceByPerfumeId]);

  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  // Plain numbers (not a fresh array each render) so the memo/effect below
  // only re-run when the range actually changes.
  const priceLo = priceRange?.[0] ?? priceBounds.min;
  const priceHi = priceRange?.[1] ?? priceBounds.max;
  const activePriceRange: [number, number] = [priceLo, priceHi];

  // Brands sorted alphabetically and de-duplicated case-insensitively so a
  // brand added twice with different casing (e.g. "Gucci" / "gucci") never
  // shows up as two separate filter options.
  const sortedBrands = useMemo(() => {
    const used = new Set(perfumes.map((p) => p.brand_id));
    const seen = new Map<string, { id: string; name: string }>();
    for (const b of brands) {
      if (!used.has(b.id)) continue;
      const key = b.name.trim().toLowerCase();
      if (!seen.has(key)) seen.set(key, { id: b.id, name: b.name });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [brands, perfumes]);

  const filtered = useMemo(() => {
    let list = perfumes;
    if (filter !== "All") {
      const cat = categories.find((c) => c.name === filter);
      list = list.filter((p) => p.category_id === cat?.id);
    }
    if (brandFilter) list = list.filter((p) => p.brand_id === brandFilter);
    list = list.filter((p) => {
      const price = priceByPerfumeId.get(p.id) ?? 0;
      return price >= priceLo && price <= priceHi;
    });
    return list;
  }, [filter, brandFilter, priceLo, priceHi, perfumes, categories, priceByPerfumeId]);

  // Visible-count resets to the first page whenever any filter changes —
  // otherwise "Show More" state from a previous, larger filtered list would
  // leak into a new, smaller one.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, brandFilter, priceLo, priceHi]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section id="collection" className="section-pad relative px-6 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 grid grid-cols-1 items-end gap-8 lg:grid-cols-[auto_1fr]">
          <span className="section-index text-[16vw] leading-none md:text-[8vw]">04</span>
          <div>
            <p className="label-eyebrow mb-5">La Collection</p>
            <SplitHeading
              text="The Maison Collection"
              accentWords={["Maison"]}
              className="heading-section"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {["All", ...categories.map((c) => c.name)].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-5 py-2 text-[9px] uppercase tracking-[0.35em] transition-all ${
                filter === f
                  ? "border-gold bg-gold text-obsidian"
                  : "border-gold/25 text-foreground/60 hover:border-gold/60 hover:text-gold"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mb-14 flex flex-wrap items-center gap-4">
          {/* Brands: a compact dropdown rather than a row of pills — the
              brand list grows as new maisons are added, so it can't be a
              fixed-width chip row without wrapping badly. */}
          <div className="relative">
            <button
              onClick={() => setBrandMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={brandMenuOpen}
              className="flex items-center gap-2 rounded-full border border-gold/25 px-5 py-2 text-[9px] uppercase tracking-[0.35em] text-foreground/60 hover:border-gold/60 hover:text-gold"
            >
              {brandFilter ? sortedBrands.find((b) => b.id === brandFilter)?.name ?? "Brand" : "All Brands"}
              <ChevronDown className="h-3 w-3" />
            </button>
            {brandMenuOpen && (
              <>
                <div className="fixed inset-0 z-[80]" onClick={() => setBrandMenuOpen(false)} />
                <div
                  role="listbox"
                  className="absolute left-0 top-full z-[90] mt-2 max-h-72 w-56 overflow-y-auto rounded-sm border border-gold/30 bg-card p-2 shadow-lg"
                >
                  <button
                    role="option"
                    aria-selected={!brandFilter}
                    onClick={() => {
                      setBrandFilter("");
                      setBrandMenuOpen(false);
                    }}
                    className={`block w-full rounded-sm px-3 py-2 text-left text-xs uppercase tracking-[0.2em] ${
                      !brandFilter ? "bg-gold/15 text-gold" : "text-foreground/70 hover:bg-gold/10"
                    }`}
                  >
                    All Brands
                  </button>
                  {sortedBrands.map((b) => (
                    <button
                      key={b.id}
                      role="option"
                      aria-selected={brandFilter === b.id}
                      onClick={() => {
                        setBrandFilter(b.id);
                        setBrandMenuOpen(false);
                      }}
                      className={`block w-full rounded-sm px-3 py-2 text-left text-xs uppercase tracking-[0.2em] ${
                        brandFilter === b.id ? "bg-gold/15 text-gold" : "text-foreground/70 hover:bg-gold/10"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Price range */}
          <div className="flex min-w-[220px] flex-1 items-center gap-4 sm:max-w-xs">
            <span className="whitespace-nowrap text-[9px] uppercase tracking-[0.3em] text-foreground/50">Price</span>
            <Slider
              min={priceBounds.min}
              max={priceBounds.max}
              step={500}
              value={activePriceRange}
              onValueChange={(v) => setPriceRange(v as [number, number])}
              className="flex-1"
            />
            <span className="whitespace-nowrap text-[10px] text-foreground/60">
              {formatPKR(activePriceRange[0])} – {formatPKR(activePriceRange[1])}
            </span>
          </div>

          {(brandFilter || priceRange) && (
            <button
              onClick={() => {
                setBrandFilter("");
                setPriceRange(null);
              }}
              className="text-[9px] uppercase tracking-[0.35em] text-foreground/40 hover:text-gold"
            >
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const pv = variants.filter((v) => v.perfume_id === p.id);
            // Several sizes: price the card from the cheapest bottle (the
            // smallest size is not always the cheapest). One size: that size.
            const priced = pv.length ? pv.reduce((m, v) => (v.price_pkr < m.price_pkr ? v : m)) : undefined;
            return (
              <ProductCard
                key={p.id}
                p={p}
                variant={priced}
                promotions={promotions.data}
                multipleSizes={pv.length > 1}
                sizes={formatSizeList(pv)}
                anySizeInStock={pv.length ? pv.some((v) => v.in_stock) : undefined}
                brandName={brands.find((b) => b.id === p.brand_id)?.name}
              />
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="btn-gold w-full max-w-xs px-10 py-4 text-[10px] uppercase tracking-[0.4em] sm:w-auto"
            >
              Explore More Perfumes
            </button>
          </div>
        )}

        {!perfumes.length && (
          <p className="mt-10 text-center text-sm font-light text-foreground/50">
            The collection is being prepared. Please return shortly.
          </p>
        )}
        {perfumes.length > 0 && !filtered.length && (
          <p className="mt-10 text-center text-sm font-light text-foreground/50">
            No perfumes match these filters yet. Try widening your search.
          </p>
        )}
      </div>
    </section>
  );
}
