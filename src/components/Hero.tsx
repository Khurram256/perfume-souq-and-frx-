import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useMemo, useRef, type CSSProperties } from "react";
import bottle from "@/assets/hero-bottle.png";
import logoMark from "@/assets/logo-mark.png";
import { Magnetic } from "./Magnetic";
import { Marquee } from "./Marquee";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { FragranceNotes } from "./FragranceNotes";
import { HeroBottle } from "./HeroBottle";
import { useContent, usePerfumes, useAllVariants, usePromotions } from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { formatPKR } from "@/lib/format";

const FALLBACK_HEADLINE = "A scent is the silence you leave behind";

export function Hero() {
  const visible = useContent("hero.visible", "true");
  const ribbon = useContent("hero.promo_ribbon", "");
  const headline = useContent("hero.headline", FALLBACK_HEADLINE);
  const description = useContent("hero.description", "");
  const ctaPrimaryLabel = useContent("hero.cta_primary_label", "Shop Now");
  const ctaPrimaryHref = useContent("hero.cta_primary_href", "/shop");
  const ctaSecondaryLabel = useContent("hero.cta_secondary_label", "Find Your Signature Scent");
  const ctaSecondaryHref = useContent("hero.cta_secondary_href", "#quiz");
  const featuredPerfumeId = useContent("hero.featured_perfume_id", "");

  const { data: perfumes = [] } = usePerfumes();
  const { data: variants = [] } = useAllVariants();
  const { data: promotions = [] } = usePromotions();

  // One real perfume, never invented/placeholder imagery: the admin's pick
  // if set, otherwise the best available featured/spotlight-eligible one.
  const featured = useMemo(() => {
    const withImage = perfumes.filter((p) => p.image_url);
    const p =
      withImage.find((x) => x.id === featuredPerfumeId) ??
      [...withImage].sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          Number(b.spotlight_eligible) - Number(a.spotlight_eligible),
      )[0];
    if (!p) return null;
    const pv = variants.filter((v) => v.perfume_id === p.id);
    const dv = pv.find((v) => v.is_default) ?? pv[0];
    const inStock = pv.length ? pv.some((v) => v.in_stock) : p.in_stock;
    const price = dv
      ? resolveVariantPrice(dv.price_pkr, promotions, {
          perfumeId: p.id,
          variantId: dv.id,
          brandId: p.brand_id,
          categoryId: p.category_id,
        })
      : {
          originalPrice: p.price_pkr,
          finalPrice: p.price_pkr,
          discountAmount: 0,
          appliedPromotions: [],
        };
    return { perfume: p, inStock, price };
  }, [perfumes, variants, promotions, featuredPerfumeId]);

  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 140]);
  const scrollRotate = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 10]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const exitLineScale = useTransform(scrollYProgress, [0, 0.6], [0, 1]);

  // Mouse-parallax: bottle, glow and fragrance notes drift opposite the
  // cursor across the whole hero. Never fires on touch (no mousemove there).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const smy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });
  const bottleParX = useTransform(smx, [-0.5, 0.5], [-22, 22]);
  const bottleParY = useTransform(smy, [-0.5, 0.5], [-16, 16]);
  // Luxury restraint: max ~3.5° tilt, never more (per design direction).
  const bottleTiltY = useTransform(smx, [-0.5, 0.5], [-3.5, 3.5]);
  const glowParX = useTransform(smx, [-0.5, 0.5], [14, -14]);
  const glowParY = useTransform(smy, [-0.5, 0.5], [10, -10]);

  // Viewport-relative, deliberately not getBoundingClientRect(): reading the
  // rect on every mousemove forces a synchronous layout (jank under motion),
  // and the hero is full-bleed at the top of the page anyway.
  const onMouseMove = (e: React.MouseEvent) => {
    if (reduceMotion) return;
    mx.set(e.clientX / window.innerWidth - 0.5);
    my.set(e.clientY / window.innerHeight - 0.5);
  };

  if (visible === "false") return null;

  return (
    <section
      id="top"
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative flex min-h-[105vh] flex-col items-center overflow-hidden lg:min-h-[110vh]"
    >
      <HeroAtmosphere />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 pb-16 pt-32 text-center sm:pt-36">
        {ribbon && (
          <p
            style={{ "--fib-delay": "0.15s" } as CSSProperties}
            className="fade-in-blur mb-5 inline-block rounded-full border border-gold/40 px-4 py-1.5 text-[9px] uppercase tracking-[0.35em] text-gold"
          >
            {ribbon}
          </p>
        )}

        {/* Branding is the dominant visual identity of the hero — logo, then
            THE PERFUME SOUQ large enough to anchor the composition, then
            "by Khurram Shabbir", then the smaller supporting tagline. */}
        <motion.div
          style={{ "--fib-delay": "0.1s" } as CSSProperties}
          className="fade-in-blur mb-4 flex flex-col items-center gap-3"
        >
          <motion.img
            src={logoMark}
            alt=""
            width={72}
            height={72}
            whileHover={
              reduceMotion
                ? undefined
                : {
                    rotate: 180,
                    scale: 1.08,
                    filter: "drop-shadow(0 0 26px oklch(0.66 0.12 74 / 0.7))",
                  }
            }
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="h-14 w-14 sm:h-16 sm:w-16"
            style={{ filter: "drop-shadow(0 0 16px oklch(0.66 0.12 74 / 0.5))" }}
          />
          <div className="leading-none">
            <p className="font-display text-4xl italic tracking-[0.02em] text-gradient-gold sm:text-5xl lg:text-6xl">
              The Perfume Souq
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.5em] text-foreground/60">
              by Khurram Shabbir
            </p>
          </div>
        </motion.div>

        <p
          style={{ "--fib-delay": "0.4s" } as CSSProperties}
          className="fade-in-blur heading-hero-support max-w-xl text-foreground/75"
        >
          {headline}
        </p>

        {description && (
          <p
            style={{ "--fib-delay": "0.65s" } as CSSProperties}
            className="fade-in-blur mt-4 max-w-md text-sm font-light leading-relaxed text-foreground/55"
          >
            {description}
          </p>
        )}

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
          className="gold-line my-7 w-32 sm:w-40"
        />

        {/* Bottle stage: the perfume bottle as visual centrepiece, with
            fragrance-note chips orbiting it. The stage is deliberately
            TALLER than the bottle image's own max-height (see HeroBottle)
            so the bottle can never overflow past this box onto the CTA
            cluster below it. */}
        <div className="relative flex h-[38vh] w-full items-center justify-center sm:h-[42vh] lg:h-[46vh]">
          <FragranceNotes smx={smx} smy={smy} reduceMotion={reduceMotion} />
          <HeroBottle
            src={featured?.perfume.image_url || bottle}
            alt={featured ? featured.perfume.name : "The Perfume Souq signature flacon"}
            scrollY={scrollY}
            scrollRotate={scrollRotate}
            fade={fade}
            parX={bottleParX}
            parY={bottleParY}
            tiltY={bottleTiltY}
            glowParX={glowParX}
            glowParY={glowParY}
          />
        </div>

        <div
          style={{ "--fib-delay": "1.15s" } as CSSProperties}
          className="fade-in-blur relative z-20 mt-2 flex flex-col items-center gap-5"
        >
          <Magnetic>
            {ctaPrimaryHref.startsWith("/") ? (
              <Link
                to={ctaPrimaryHref}
                className="btn-hero-primary inline-block px-16 py-5 text-[11px] font-medium uppercase tracking-[0.4em]"
              >
                {ctaPrimaryLabel}
              </Link>
            ) : (
              <a
                href={ctaPrimaryHref}
                className="btn-hero-primary inline-block px-16 py-5 text-[11px] font-medium uppercase tracking-[0.4em]"
              >
                {ctaPrimaryLabel}
              </a>
            )}
          </Magnetic>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {ctaSecondaryLabel &&
              (ctaSecondaryHref.startsWith("/") ? (
                <Link
                  to={ctaSecondaryHref}
                  className="link-underline inline-block py-2 text-[10px] uppercase tracking-[0.4em] text-foreground/70 hover:text-gold"
                >
                  {ctaSecondaryLabel}
                </Link>
              ) : (
                <a
                  href={ctaSecondaryHref}
                  className="link-underline inline-block py-2 text-[10px] uppercase tracking-[0.4em] text-foreground/70 hover:text-gold"
                >
                  {ctaSecondaryLabel}
                </a>
              ))}
            <Link
              to="/brands"
              className="link-underline inline-block py-2 text-[10px] uppercase tracking-[0.4em] text-foreground/70 hover:text-gold"
            >
              Explore Full Maison
            </Link>
          </div>
        </div>

        {featured && (
          <Link
            to="/product/$slug"
            params={{ slug: featured.perfume.slug }}
            style={{ "--fib-delay": "1.4s" } as CSSProperties}
            className="fade-in-blur relative z-20 mt-8 inline-flex items-center gap-3 rounded-full border border-gold/20 bg-card/60 px-5 py-2.5 text-xs text-foreground/70 backdrop-blur-md hover:border-gold/40"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] text-gold">Featured</span>
            <span className="font-display italic">{featured.perfume.name}</span>
            <span className="text-gold">{formatPKR(featured.price.finalPrice)}</span>
            {!featured.inStock && (
              <span className="text-[9px] uppercase tracking-[0.3em] text-foreground/40">
                Out of Stock
              </span>
            )}
          </Link>
        )}
      </div>

      <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 opacity-70" aria-hidden="true">
          <div className="relative h-8 w-px overflow-hidden bg-gold/20">
            <span className="scroll-cue-dot absolute left-0 top-0 h-2 w-px bg-gold" />
          </div>
        </div>
      </div>

      <motion.div
        style={{ scaleX: exitLineScale, transformOrigin: "center" }}
        className="gold-line absolute inset-x-10 bottom-[72px] z-10"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-gold/15 bg-obsidian/40 py-5 backdrop-blur-sm">
        <Marquee items={["Oud", "Amber", "Rose", "Saffron", "Musk", "Vetiver"]} />
      </div>
    </section>
  );
}
