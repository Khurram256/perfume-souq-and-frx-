import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { usePerfumes, useCategories, type Perfume } from "@/lib/api/queries";
import { formatPKR } from "@/lib/format";
import { SplitHeading } from "./SplitHeading";

function ProductCard({ p }: { p: Perfume }) {
  const { add } = useCart();
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
    if (!p.in_stock) return;
    const rect = imgRef.current?.getBoundingClientRect() ?? null;
    add({ id: p.id, name: p.name, price: p.price_pkr, img: p.image_url || "" }, rect);
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

      {!p.in_stock && (
        <span className="absolute left-4 top-4 z-[3] rounded-full border border-foreground/30 bg-black/60 px-3 py-1 text-[8px] uppercase tracking-[0.4em] text-foreground/70">
          Out of Stock
        </span>
      )}
      {p.featured && p.in_stock && (
        <span className="absolute right-4 top-4 z-[3] rounded-full border border-gold/50 px-3 py-1 text-[8px] uppercase tracking-[0.4em] text-gold">
          Featured
        </span>
      )}

      {/* Product photography is the hero here — much larger stage, quiet grayscale-to-color bloom on hover */}
      <div className="relative mb-8 h-80 w-full overflow-visible" style={{ transform: "translateZ(30px)" }}>
        {p.image_url && (
          <img
            ref={imgRef}
            src={p.image_url}
            alt={p.name}
            loading="lazy"
            width={400}
            height={400}
            className={`img-reveal relative mx-auto h-full w-auto object-contain ${p.in_stock ? "" : "opacity-50"}`}
          />
        )}
      </div>

      <p className="label-eyebrow mb-3 text-[9px]">{p.family}</p>
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

      <div className="mt-7 flex w-full items-center justify-between border-t border-border pt-6">
        <span className="text-gradient-gold font-display text-xl">{formatPKR(p.price_pkr)}</span>
        <button
          onClick={handleAdd}
          disabled={!p.in_stock}
          className="link-underline flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          {p.in_stock ? "Add to Cart" : "Sold Out"}
        </button>
      </div>
    </motion.article>
  );
}

export function Collection() {
  const { data: perfumes = [] } = usePerfumes();
  const { data: categories = [] } = useCategories();
  const [filter, setFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return perfumes;
    const cat = categories.find((c) => c.name === filter);
    return perfumes.filter((p) => p.category_id === cat?.id);
  }, [filter, perfumes, categories]);

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

        <div className="mb-14 flex flex-wrap gap-2">
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {!perfumes.length && (
          <p className="mt-10 text-center text-sm font-light text-foreground/50">
            The collection is being prepared. Please return shortly.
          </p>
        )}
      </div>
    </section>
  );
}
