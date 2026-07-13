import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, type CSSProperties } from "react";
import bottle from "@/assets/hero-bottle.png";
import { Magnetic } from "./Magnetic";
import { Marquee } from "./Marquee";

const HEADLINE = ["A", "scent", "is", "the", "silence", "you", "leave", "behind"];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const scrollRotate = useTransform(scrollYProgress, [0, 1], [0, 10]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Mouse-parallax: bottle + glow drift opposite the cursor across the whole hero.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const smy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });
  const bottleParX = useTransform(smx, [-0.5, 0.5], [-22, 22]);
  const bottleParY = useTransform(smy, [-0.5, 0.5], [-16, 16]);
  const bottleTiltY = useTransform(smx, [-0.5, 0.5], [-6, 6]);
  const glowParX = useTransform(smx, [-0.5, 0.5], [14, -14]);
  const glowParY = useTransform(smy, [-0.5, 0.5], [10, -10]);

  const onMouseMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section
      id="top"
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative flex min-h-[110vh] items-center overflow-hidden hero-mesh"
    >
      <div className="pointer-events-none absolute inset-0 hero-blue-wash" />
      <div className="pointer-events-none absolute inset-0 smoke-mist" />
      <div className="perspective-grid pointer-events-none" />

      <div className="hud-corner hud-corner--tl" style={{ "--hud-delay": "0.5s" } as CSSProperties} />
      <div className="hud-corner hud-corner--tr" style={{ "--hud-delay": "0.65s" } as CSSProperties} />
      <div className="hud-corner hud-corner--bl" style={{ "--hud-delay": "0.8s" } as CSSProperties} />
      <div className="hud-corner hud-corner--br" style={{ "--hud-delay": "0.95s" } as CSSProperties} />

      <div className="relative z-10 mx-auto grid w-full max-w-[1500px] grid-cols-1 items-end gap-10 px-6 pt-40 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-16">
        <div className="order-2 lg:order-1">
          <div className="mb-6 flex items-baseline gap-6">
            <span className="section-index text-[9vw] leading-none md:text-[6vw]">01</span>
            <span
              style={{ "--fib-delay": "0.35s" } as CSSProperties}
              className="fade-in-blur mb-2 text-[10px] uppercase tracking-[0.5em] text-gold"
            >
              The Souq — Est. 2026
            </span>
          </div>

          <h1 className="font-display text-[13vw] italic leading-[0.98] tracking-tight text-foreground md:text-6xl lg:text-[4.6rem]">
            {HEADLINE.map((w, i) => (
              <span
                key={i}
                style={{ "--fib-delay": `${0.5 + i * 0.07}s` } as CSSProperties}
                className={`fade-in-blur mr-[0.28em] inline-block ${w === "silence" ? "text-shimmer" : ""}`}
              >
                {w}
              </span>
            ))}
          </h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.3, duration: 1.2, ease: "easeOut" }}
            style={{ transformOrigin: "left" }}
            className="gold-line my-10 w-2/3 max-w-sm"
          />

          <div
            style={{ "--fib-delay": "1.5s" } as CSSProperties}
            className="fade-in-blur flex flex-wrap items-center gap-6"
          >
            <Magnetic>
              <a href="#signature" className="btn-gold inline-block px-10 py-4 text-[10px] uppercase tracking-[0.4em]">
                Discover the Maison
              </a>
            </Magnetic>
            <a href="#quiz" className="inline-block px-2 py-4 text-[10px] uppercase tracking-[0.35em] text-foreground/70 hover-underline">
              Find Your Signature Scent
            </a>
          </div>
        </div>

        <motion.div
          style={{ y: scrollY, rotate: scrollRotate, opacity: fade }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 1.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="order-1 flex justify-center lg:order-2 lg:justify-end"
        >
          <motion.div style={{ x: bottleParX, y: bottleParY }} className="relative">
            <motion.div
              style={{ x: glowParX, y: glowParY }}
              className="absolute inset-0 -z-10 blur-3xl opacity-70"
            >
              <div
                className="h-full w-full"
                style={{ background: "radial-gradient(circle, oklch(0.55 0.07 232 / 0.5), oklch(0.93 0.025 220 / 0.3) 40%, transparent 70%)" }}
              />
            </motion.div>

            <div className="halo-pulse" />
            <div className="halo-pulse halo-pulse--delay" />

            <motion.div style={{ rotateY: bottleTiltY }} className="relative" transition={{ type: "spring" }}>
              <div className="glint-sweep" />
              <img
                src={bottle}
                alt="The Perfume Souq signature flacon"
                width={520}
                height={780}
                className="float-bottle relative max-h-[72vh] w-auto"
                style={{ filter: "drop-shadow(0 50px 60px rgba(0,0,0,0.9))" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 lg:left-16 lg:translate-x-0">
        <div className="flex flex-col items-center gap-2 opacity-70">
          <span className="text-[9px] uppercase tracking-[0.4em] text-foreground/50">Scroll</span>
          <div className="relative h-8 w-px overflow-hidden bg-gold/20">
            <span className="scroll-cue-dot absolute left-0 top-0 h-2 w-px bg-gold" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-gold/15 bg-obsidian/40 py-5 backdrop-blur-sm">
        <Marquee items={["Oud", "Amber", "Rose", "Saffron", "Musk", "Vetiver"]} />
      </div>
    </section>
  );
}
