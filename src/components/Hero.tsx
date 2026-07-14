import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import bottle from "@/assets/hero-bottle.png";
import { Magnetic } from "./Magnetic";
import { Marquee } from "./Marquee";
import { useContent } from "@/lib/api/queries";

const FALLBACK_HEADLINE = "A scent is the silence you leave behind";

type Mote = { id: number; left: number; size: number; delay: number; duration: number; x: number; op: number };

export function Hero() {
  const headline = useContent("hero.headline", FALLBACK_HEADLINE);
  const words = headline.split(" ");
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
  // Luxury restraint: max ~3.5° tilt, never more (per design direction).
  const bottleTiltY = useTransform(smx, [-0.5, 0.5], [-3.5, 3.5]);
  const glowParX = useTransform(smx, [-0.5, 0.5], [14, -14]);
  const glowParY = useTransform(smy, [-0.5, 0.5], [10, -10]);

  const onMouseMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  // Floating light-catching dust — luminous, not smoke.
  const [motes, setMotes] = useState<Mote[]>([]);
  useEffect(() => {
    const n = window.innerWidth < 768 ? 10 : 20;
    setMotes(
      Array.from({ length: n }).map((_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        size: Math.random() * 2.5 + 1,
        delay: Math.random() * 10,
        duration: Math.random() * 8 + 10,
        x: (Math.random() - 0.5) * 60,
        op: Math.random() * 0.35 + 0.25,
      }))
    );
  }, []);

  return (
    <section
      id="top"
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative flex min-h-[115vh] items-center overflow-hidden hero-mesh"
    >
      <div className="pointer-events-none absolute inset-0 hero-blue-wash" />
      <div className="pointer-events-none absolute inset-0 smoke-mist" />
      <div className="perspective-grid pointer-events-none" />

      {/* Luminous atmosphere: drifting light rays + breathing glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
        <div className="light-ray absolute left-[-20%] top-[20%]" />
        <div className="light-ray light-ray--2 absolute left-[-20%] top-[45%]" />
        <div className="light-ray light-ray--3 absolute left-[-20%] top-[68%]" />
        <div
          className="glow-orb"
          style={{ width: 420, height: 420, top: "-8%", left: "8%", background: "oklch(0.62 0.10 232 / 0.35)" }}
        />
        <div
          className="glow-orb"
          style={{
            width: 500,
            height: 500,
            bottom: "-14%",
            right: "6%",
            background: "oklch(0.87 0.06 68 / 0.22)",
            animationDelay: "-6s",
          }}
        />
      </div>

      {/* Floating gold dust */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {motes.map((m) => (
          <span
            key={m.id}
            className="dust-mote absolute"
            style={
              {
                left: `${m.left}%`,
                bottom: "-10px",
                width: m.size,
                height: m.size,
                animationDuration: `${m.duration}s`,
                animationDelay: `${m.delay}s`,
                "--dust-x": `${m.x}px`,
                "--dust-op": m.op,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="hud-corner hud-corner--tl"
        style={{ "--hud-delay": "0.5s" } as CSSProperties}
      />
      <div
        className="hud-corner hud-corner--tr"
        style={{ "--hud-delay": "0.65s" } as CSSProperties}
      />
      <div
        className="hud-corner hud-corner--bl"
        style={{ "--hud-delay": "0.8s" } as CSSProperties}
      />
      <div
        className="hud-corner hud-corner--br"
        style={{ "--hud-delay": "0.95s" } as CSSProperties}
      />

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

          <h1 className="heading-hero text-foreground">
            {words.map((w, i) => (
              <span
                key={i}
                style={{ "--fib-delay": `${0.5 + i * 0.07}s` } as CSSProperties}
                className={`fade-in-blur mr-[0.28em] inline-block ${w.toLowerCase() === "silence" ? "text-shimmer" : ""}`}
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
            className="gold-line my-12 w-2/3 max-w-sm"
          />

          <div
            style={{ "--fib-delay": "1.5s" } as CSSProperties}
            className="fade-in-blur flex flex-wrap items-center gap-8"
          >
            <Magnetic>
              <a
                href="#signature"
                className="btn-gold inline-block px-12 py-5 text-[10px] uppercase tracking-[0.45em]"
              >
                Discover the Maison
              </a>
            </Magnetic>
            <a
              href="#quiz"
              className="link-underline inline-block px-2 py-5 text-[10px] uppercase tracking-[0.4em] text-foreground/70"
            >
              Find Your Signature Scent
            </a>
          </div>
        </div>

        <motion.div
          style={{ y: scrollY, rotate: scrollRotate, opacity: fade }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className="order-1 flex justify-center lg:order-2 lg:justify-end"
        >
          <motion.div style={{ x: bottleParX, y: bottleParY }} className="relative">
            <div className="spotlight-cone" />
            <motion.div
              style={{ x: glowParX, y: glowParY }}
              className="absolute inset-0 -z-10 blur-3xl opacity-90"
            >
              <div
                className="h-full w-full"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.70 0.10 70 / 0.55), oklch(0.93 0.05 75 / 0.35) 40%, transparent 72%)",
                }}
              />
            </motion.div>

            <div className="halo-pulse" />
            <div className="halo-pulse halo-pulse--delay" />

            <motion.div
              style={{ rotateY: bottleTiltY }}
              className="relative"
              transition={{ type: "spring" }}
            >
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
