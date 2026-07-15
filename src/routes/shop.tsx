import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { FlyToCart } from "@/components/FlyToCart";
import { ContactButton } from "@/components/ContactButton";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  usePerfumes,
  useBrands,
  useCategories,
  useAllVariants,
  usePromotions,
  type Perfume,
} from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";

type ShopSearch = {
  gender?: "men" | "women" | "unisex";
  brands?: string[];
  category?: string;
  min?: number;
  max?: number;
  inStock?: boolean;
  sort?: "price-asc" | "price-desc" | "name";
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    gender: search.gender as ShopSearch["gender"],
    brands: Array.isArray(search.brands) ? (search.brands as string[]) : search.brands ? [String(search.brands)] : undefined,
    category: search.category ? String(search.category) : undefined,
    min: search.min !== undefined ? Number(search.min) : undefined,
    max: search.max !== undefined ? Number(search.max) : undefined,
    inStock: search.inStock === true || search.inStock === "true" ? true : undefined,
    sort: search.sort as ShopSearch["sort"],
  }),
  head: () => ({
    meta: [
      { title: "Shop — The Perfume Souq by Khurram Shabbir" },
      { name: "description", content: "Browse the full Perfume Souq catalogue — filter by gender, maison, fragrance family, and price." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  return (
    <CartProvider>
      <div className="min-h-screen">
        <Navbar />
        <ShopContent />
        <Footer />
        <CartDrawer />
        <FlyToCart />
        <ContactButton />
      </div>
    </CartProvider>
  );
}

function ShopContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: perfumes = [], isLoading } = usePerfumes();
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const { data: variants = [] } = useAllVariants();
  const { data: promotions = [] } = usePromotions();

  const priceBounds = useMemo(() => {
    const prices = variants.map((v) => v.price_pkr).filter((p) => p > 0);
    if (!prices.length) return { min: 0, max: 100000 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [variants]);

  const [minInput, maxInput] = [search.min ?? priceBounds.min, search.max ?? priceBounds.max];

  const priced = useMemo(() => {
    return perfumes.map((p) => {
      const perfumeVariants = variants.filter((v) => v.perfume_id === p.id);
      const defaultVariant = perfumeVariants.find((v) => v.is_default) ?? perfumeVariants[0];
      const basePrice = defaultVariant?.price_pkr ?? p.price_pkr;
      const resolved = defaultVariant
        ? resolveVariantPrice(basePrice, promotions, {
            perfumeId: p.id,
            variantId: defaultVariant.id,
            brandId: p.brand_id,
            categoryId: p.category_id,
          })
        : { originalPrice: basePrice, finalPrice: basePrice, discountAmount: 0, appliedPromotions: [] };
      const inStock = perfumeVariants.length ? perfumeVariants.some((v) => v.in_stock) : p.in_stock;
      return { perfume: p, price: resolved, inStock };
    });
  }, [perfumes, variants, promotions]);

  const filtered = useMemo(() => {
    let list = priced;
    if (search.gender) list = list.filter((x) => x.perfume.gender === search.gender);
    if (search.brands?.length) list = list.filter((x) => x.perfume.brand_id && search.brands!.includes(x.perfume.brand_id));
    if (search.category) list = list.filter((x) => x.perfume.category_id === search.category);
    if (search.min !== undefined) list = list.filter((x) => x.price.finalPrice >= search.min!);
    if (search.max !== undefined) list = list.filter((x) => x.price.finalPrice <= search.max!);
    if (search.inStock) list = list.filter((x) => x.inStock);

    const sorted = [...list];
    if (search.sort === "price-asc") sorted.sort((a, b) => a.price.finalPrice - b.price.finalPrice);
    else if (search.sort === "price-desc") sorted.sort((a, b) => b.price.finalPrice - a.price.finalPrice);
    else if (search.sort === "name") sorted.sort((a, b) => a.perfume.name.localeCompare(b.perfume.name));
    return sorted;
  }, [priced, search]);

  const patch = (next: Partial<ShopSearch>) => navigate({ search: (prev) => ({ ...prev, ...next }) });

  const toggleBrand = (id: string) => {
    const current = search.brands ?? [];
    const next = current.includes(id) ? current.filter((b) => b !== id) : [...current, id];
    patch({ brands: next.length ? next : undefined });
  };

  const clearFilters = () => navigate({ search: {} });

  const activeFilterCount =
    (search.gender ? 1 : 0) + (search.brands?.length ?? 0) + (search.category ? 1 : 0) + (search.inStock ? 1 : 0) +
    (search.min !== undefined || search.max !== undefined ? 1 : 0);

  return (
    <main className="section-pad relative px-6 pt-32 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14">
          <p className="label-eyebrow mb-4">The Full Collection</p>
          <h1 className="heading-section">Shop the Souq</h1>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[260px_1fr]">
          {/* Filters */}
          <aside className="space-y-8">
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold">
                <X className="h-3 w-3" /> Clear all ({activeFilterCount})
              </button>
            )}

            <div>
              <p className="label-eyebrow mb-4 text-[9px]">Gender</p>
              <div className="flex flex-wrap gap-2">
                {(["men", "women", "unisex"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => patch({ gender: search.gender === g ? undefined : g })}
                    className={`rounded-full border px-4 py-1.5 text-[9px] uppercase tracking-[0.3em] transition-colors ${
                      search.gender === g ? "border-gold bg-gold text-obsidian" : "border-gold/25 text-foreground/60 hover:border-gold/60"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label-eyebrow mb-4 text-[9px]">Maison</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {brands.map((b) => (
                  <label key={b.id} className="flex items-center gap-3 text-sm cursor-pointer">
                    <Checkbox checked={search.brands?.includes(b.id) ?? false} onCheckedChange={() => toggleBrand(b.id)} />
                    <span className="text-foreground/75">{b.name}</span>
                  </label>
                ))}
                {!brands.length && <p className="text-xs text-foreground/40">No maisons added yet.</p>}
              </div>
            </div>

            <div>
              <p className="label-eyebrow mb-4 text-[9px]">Fragrance Family</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => patch({ category: search.category === c.id ? undefined : c.id })}
                    className={`rounded-full border px-4 py-1.5 text-[9px] uppercase tracking-[0.3em] transition-colors ${
                      search.category === c.id ? "border-gold bg-gold text-obsidian" : "border-gold/25 text-foreground/60 hover:border-gold/60"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label-eyebrow mb-4 text-[9px]">Price</p>
              <Slider
                min={priceBounds.min}
                max={priceBounds.max}
                step={500}
                value={[minInput, maxInput]}
                onValueChange={([lo, hi]) => patch({ min: lo, max: hi })}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <input
                  type="number"
                  value={minInput}
                  onChange={(e) => patch({ min: Number(e.target.value) })}
                  className="w-24 rounded-sm border border-border bg-transparent px-2 py-1 text-foreground"
                  aria-label="Minimum price"
                />
                <span>—</span>
                <input
                  type="number"
                  value={maxInput}
                  onChange={(e) => patch({ max: Number(e.target.value) })}
                  className="w-24 rounded-sm border border-border bg-transparent px-2 py-1 text-foreground"
                  aria-label="Maximum price"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <Checkbox checked={search.inStock ?? false} onCheckedChange={(v) => patch({ inStock: v ? true : undefined })} />
              <span className="text-foreground/75">In stock only</span>
            </label>
          </aside>

          {/* Results */}
          <div>
            <div className="mb-8 flex items-center justify-between">
              <p className="text-xs text-foreground/50">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
              <select
                value={search.sort ?? ""}
                onChange={(e) => patch({ sort: (e.target.value || undefined) as ShopSearch["sort"] })}
                className="rounded-sm border border-border bg-transparent px-3 py-2 text-xs text-foreground"
              >
                <option value="">Featured order</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {isLoading && <p className="text-sm text-foreground/50">Loading the collection…</p>}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ perfume, price, inStock }) => (
                <ShopCard key={perfume.id} perfume={perfume} price={price} inStock={inStock} brandName={brands.find((b) => b.id === perfume.brand_id)?.name} />
              ))}
            </div>

            {!isLoading && !filtered.length && (
              <p className="mt-16 text-center text-sm font-light text-foreground/50">
                No perfumes match these filters yet. Try widening your search.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ShopCard({
  perfume,
  price,
  inStock,
  brandName,
}: {
  perfume: Perfume;
  price: { originalPrice: number; finalPrice: number; discountAmount: number };
  inStock: boolean;
  brandName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
    >
      <Link
        to="/product/$slug"
        params={{ slug: perfume.slug }}
        className="glass-card group relative flex flex-col items-center overflow-hidden rounded-sm p-6 text-center transition-transform hover:-translate-y-1"
      >
        {!inStock && (
          <span className="absolute left-4 top-4 z-[3] rounded-full border border-foreground/30 bg-black/60 px-3 py-1 text-[8px] uppercase tracking-[0.4em] text-foreground/70">
            Out of Stock
          </span>
        )}
        {price.discountAmount > 0 && (
          <span className="absolute right-4 top-4 z-[3] rounded-full border border-gold/50 px-3 py-1 text-[8px] uppercase tracking-[0.4em] text-gold">
            Offer
          </span>
        )}
        <div className="relative mb-6 h-64 w-full">
          {perfume.image_url && (
            <img src={perfume.image_url} alt={perfume.name} loading="lazy" className={`mx-auto h-full w-auto object-contain ${inStock ? "" : "opacity-50"}`} />
          )}
        </div>
        {brandName && <p className="label-eyebrow mb-2 text-[8px]">{brandName}</p>}
        <h3 className="font-display text-2xl italic">{perfume.name}</h3>
        <div className="mt-4 flex items-center gap-2">
          {price.discountAmount > 0 && (
            <span className="text-xs text-foreground/40 line-through">{formatPKR(price.originalPrice)}</span>
          )}
          <span className="text-gradient-gold font-display text-lg">{formatPKR(price.finalPrice)}</span>
        </div>
      </Link>
    </motion.div>
  );
}
