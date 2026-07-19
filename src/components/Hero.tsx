import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useRef, type CSSProperties } from "react";
import goodGirlBottle from "@/assets/hero-bottle-good-girl.png";
import jpgBottle from "@/assets/hero-bottle-jpg.png";
import logoMark from "@/assets/logo-mark.png";
import { Magnetic } from "./Magnetic";
import { Marquee } from "./Marquee";
import { HeroAtmosphere } from "./HeroAtmosphere";
import { HeroBottle } from "./HeroBottle";
import { useContent } from "@/lib/api/queries";

// Exact wording required for the final hero copy — the CMS ("hero.headline"
// in site_content) can still override this from the admin dashboard, this
// is only the fallback shown when that field is empty.
const FALLBACK_HEADLINE = "A scent is the memory you leave behind";

export function Hero() {
  const visible = useContent("hero.visible", "true");
  const ribbon = useContent("hero.promo_ribbon", "");
  const headline = useContent("hero.headline", FALLBACK_HEADLINE);
  const ctaPrimaryLabel = useContent("hero.cta_primary_label", "Shop Now");
  const ctaPrimaryHref = useContent("hero.cta_primary_href", "/shop");
  const ctaSecondaryLabel = useContent("hero.cta_secondary_label", "Find Your Signature Scent");
  const ctaSecondaryHref = useContent("hero.cta_secondary_href", "#quiz");

  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const exitLineScale = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  // Background moves at a fraction of the bottles' scroll speed — different
  // depths moving at different rates is what actually reads as "alive" on
  // scroll, rather than everything sliding together as one flat layer.
  const bgParallaxY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 45]);

  // Mouse-parallax: the bottle composition and its glow drift opposite the
  // cursor. Deliberately restrained (small px range) per the "no dramatic
  // movement" direction — never fires on touch (no mousemove there).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const smy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });
  const bottleParX = useTransform(smx, [-0.5, 0.5], [-10, 10]);
  const bottleParY = useTransform(smy, [-0.5, 0.5], [-8, 8]);

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
      className="relative flex min-h-[100svh] flex-col overflow-hidden lg:min-h-[100dvh]"
    >
      <motion.div style={{ y: bgParallaxY }} className="pointer-events-none absolute inset-0">
        <HeroAtmosphere />
      </motion.div>

      {/* Single centered column at every breakpoint — logo, brand name,
          founder line, tagline, actions, then the bottle composition below.
          This intentionally replaces the previous asymmetric left/right
          split: the two-bottle composition needs to sit as a wide, balanced
          pair beneath the text rather than squeezed into a side column. */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 pb-10 pt-28 text-center lg:pt-32">
        {ribbon && (
          <p
            style={{ "--fib-delay": "0.15s" } as CSSProperties}
            className="fade-in-blur mb-5 inline-block rounded-full border border-gold/40 px-4 py-1.5 text-[9px] uppercase tracking-[0.35em] text-gold"
          >
            {ribbon}
          </p>
        )}

        <motion.img
          src={logoMark}
          alt="The Perfume Souq crest"
          width={96}
          height={96}
          style={{ "--fib-delay": "0.1s", filter: "drop-shadow(0 0 16px oklch(0.66 0.12 74 / 0.5))" } as CSSProperties}
          whileHover={
            reduceMotion
              ? undefined
              : {
                  scale: 1.08,
                  filter: "drop-shadow(0 0 26px oklch(0.66 0.12 74 / 0.7))",
                }
          }
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="fade-in-blur mb-5 h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
        />

        <h1
          style={{
            "--fib-delay": "0.2s",
            fontSize: "clamp(2.1rem, 7vw, 5.5rem)",
          } as CSSProperties}
          className="title-shimmer fade-in-blur whitespace-nowrap font-display italic leading-[1.05] tracking-[0.01em] sm:whitespace-nowrap"
        >
          {/* A non-breaking space between "The" and "Perfume" means that if
              the line ever has to wrap on a very narrow screen, it breaks as
              "The Perfume / Souq" rather than a jarring one-word-per-line
              stack. */}
          The&nbsp;Perfume Souq
        </h1>
        <p
          style={{ "--fib-delay": "0.35s" } as CSSProperties}
          className="fade-in-blur mt-3 whitespace-nowrap text-[10px] uppercase tracking-[0.5em] text-foreground/60 sm:text-[11px]"
        >
          by Khurram Shabbir
        </p>

        <p
          style={{
            "--fib-delay": "0.5s",
            fontSize: "clamp(1.05rem, 2.4vw, 1.6rem)",
          } as CSSProperties}
          className="fade-in-blur heading-hero-support mt-6 max-w-xl text-foreground/75"
        >
          {headline}
        </p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
          className="gold-line my-7 w-32 sm:w-40"
        />

        <div
          style={{ "--fib-delay": "0.75s" } as CSSProperties}
          className="fade-in-blur flex flex-col items-center gap-5"
        >
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

          {/* Priority tier below Shop Now: Find Your Signature Scent reads
              slightly bolder/larger than Explore Full Maison, so the two
              secondary actions still have a clear pecking order even though
              neither is boxed. */}
          <div className="flex flex-col items-center gap-3">
            {ctaSecondaryLabel &&
              (ctaSecondaryHref.startsWith("/") ? (
                <Link to={ctaSecondaryHref} className="link-shimmer-underline text-[12px] font-medium uppercase tracking-[0.35em] text-foreground/85 hover:text-gold">
                  {ctaSecondaryLabel}
                </Link>
              ) : (
                <a href={ctaSecondaryHref} className="link-shimmer-underline text-[12px] font-medium uppercase tracking-[0.35em] text-foreground/85 hover:text-gold">
                  {ctaSecondaryLabel}
                </a>
              ))}
            <Link to="/brands" className="link-underline inline-block py-1 text-[10px] uppercase tracking-[0.4em] text-foreground/55 hover:text-gold">
              Explore Full Maison
            </Link>
          </div>
        </div>

        {/* Bottle composition: the two final, static campaign images, side
            by side. Deliberately a fixed height stage taller than either
            bottle's own max-height so nothing can ever bleed past this box
            onto the actions above it. */}
        <div className="relative mt-10 flex h-[30vh] w-full items-end justify-center sm:h-[38vh] lg:mt-14 lg:h-[46vh]">
          <HeroBottle
            leftSrc={goodGirlBottle}
            leftAlt="Carolina Herrera Good Girl eau de parfum bottle"
            rightSrc={jpgBottle}
            rightAlt="Jean Paul Gaultier Le Male eau de toilette bottle"
            fade={fade}
            parX={bottleParX}
            parY={bottleParY}
          />
        </div>
      </div>

      <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 hidden sm:block">
        <div className="flex flex-col items-center gap-2 opacity-70" aria-hidden="true">
          <div className="relative h-8 w-px overflow-hidden bg-gold/20">
            <span className="scroll-cue-dot absolute left-0 top-0 h-2 w-px bg-gold" />
          </div>
        </div>
      </div>

      <motion.div
        style={{ scaleX: exitLineScale, transformOrigin: "center" }}
        className="gold-line absolute inset-x-10 bottom-[72px] z-10 hidden sm:block"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-gold/15 bg-obsidian/40 py-5 backdrop-blur-sm">
        <Marquee items={["Oud", "Amber", "Rose", "Saffron", "Musk", "Vetiver"]} />
      </div>
    </section>
  );
}
