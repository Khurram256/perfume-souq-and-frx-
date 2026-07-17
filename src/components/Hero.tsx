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

  // A second real product staged behind the first — the "one bottle behind,
  // one forward, different depths" studio composition, built from whatever
  // else in the live catalogue has a usable photo. Simply absent if the
  // catalogue doesn't have a second product with an image yet.
  const secondary = useMemo(() => {
    if (!featured) return null;
    const withImage = perfumes.filter((p) => p.image_url && p.id !== featured.perfume.id);
    return [...withImage].sort(
      (a, b) => Number(b.spotlight_eligible) - Number(a.spotlight_eligible),
    )[0];
  }, [perfumes, featured]);

  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 140]);
  const scrollRotate = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 10]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const exitLineScale = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  // Background moves at a fraction of the bottles' scroll speed — different
  // depths moving at different rates is what actually reads as "alive" on
  // scroll, rather than everything sliding together as one flat layer.
  const bgParallaxY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 45]);

  // Mouse-parallax: bottles, glow and fragrance notes drift opposite the
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
      className="relative flex min-h-[100vh] flex-col overflow-hidden lg:min-h-[105vh]"
    >
      <motion.div style={{ y: bgParallaxY }} className="pointer-events-none absolute inset-0">
        <HeroAtmosphere />
      </motion.div>

      {/* Editorial split: content anchors the left column (top on mobile,
          where it must stay reachable without much scrolling), the bottle
          stage owns the right — never a centered, symmetric layout. */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 gap-8 px-6 pb-16 pt-32 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-10 lg:px-12 lg:pt-36 xl:px-16">
        <div className="order-1 flex flex-col items-center text-center lg:items-start lg:text-left">
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
            className="fade-in-blur mb-4 flex flex-col items-center gap-3 lg:items-start"
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
              <p className="title-shimmer font-display text-5xl italic tracking-[0.01em] sm:text-6xl lg:text-[4.5rem] xl:text-[5.25rem]">
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
            style={{ transformOrigin: "left" }}
            className="gold-line my-7 w-32 self-center sm:w-40 lg:self-start"
          />

          <div
            style={{ "--fib-delay": "1.15s" } as CSSProperties}
            className="fade-in-blur flex flex-col items-center gap-5 lg:items-start"
          >
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Magnetic>
                {ctaPrimaryHref.startsWith("/") ? (
                  <Link
                    to={ctaPrimaryHref}
                    className="btn-hero-primary inline-block px-14 py-5 text-[11px] font-medium uppercase tracking-[0.4em]"
                  >
                    {ctaPrimaryLabel}
                  </Link>
                ) : (
                  <a
                    href={ctaPrimaryHref}
                    className="btn-hero-primary inline-block px-14 py-5 text-[11px] font-medium uppercase tracking-[0.4em]"
                  >
                    {ctaPrimaryLabel}
                  </a>
                )}
              </Magnetic>
              {ctaSecondaryLabel &&
                (ctaSecondaryHref.startsWith("/") ? (
                  <Link
                    to={ctaSecondaryHref}
                    className="btn-hero-outline inline-block px-10 py-5 text-[11px] uppercase tracking-[0.4em]"
                  >
                    {ctaSecondaryLabel}
                  </Link>
                ) : (
                  <a
                    href={ctaSecondaryHref}
                    className="btn-hero-outline inline-block px-10 py-5 text-[11px] uppercase tracking-[0.4em]"
                  >
                    {ctaSecondaryLabel}
                  </a>
                ))}
            </div>
            <Link
              to="/brands"
              className="link-underline inline-block py-1 text-[10px] uppercase tracking-[0.4em] text-foreground/60 hover:text-gold"
            >
              Explore Full Maison
            </Link>
          </div>

          {featured && (
            <Link
              to="/product/$slug"
              params={{ slug: featured.perfume.slug }}
              style={{ "--fib-delay": "1.4s" } as CSSProperties}
              className="fade-in-blur mt-9 inline-flex items-center gap-3 rounded-full border border-gold/20 bg-card/60 px-5 py-2.5 text-xs text-foreground/70 backdrop-blur-md hover:border-gold/40"
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

        {/* Bottle stage: the perfume bottle(s) as visual centrepiece. The
            stage is deliberately TALLER than the bottles' own max-height
            (see HeroBottle) so nothing can ever bleed past this box onto
            the CTA cluster — that overflow was exactly what made "Shop Now"
            unclickable once before. */}
        <div className="order-2 relative flex h-[46vh] w-full items-center justify-center sm:h-[54vh] lg:h-[62vh]">
          <HeroBottle
            src={featured?.perfume.image_url || bottle}
            alt={featured ? featured.perfume.name : "The Perfume Souq signature flacon"}
            secondarySrc={secondary?.image_url ?? undefined}
            secondaryAlt={secondary?.name}
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
