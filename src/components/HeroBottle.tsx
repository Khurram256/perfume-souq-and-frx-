import { motion, useTransform, type MotionValue } from "framer-motion";

// The perfume bottles as the hero's dimensional centrepiece — glass halo,
// cursor-responsive tilt, drifting fragrance mist and a light-catching
// glint sweep, plus an optional second bottle staged behind the first for
// a true studio "two products at different depths" composition. Both are
// always real catalogue products — never invented imagery — the parent
// (Hero.tsx) picks them from live data. Scroll-linked transforms are
// computed by the parent since they depend on the section's scroll ref.
export function HeroBottle({
  src,
  alt,
  secondarySrc,
  secondaryAlt,
  scrollY,
  scrollRotate,
  fade,
  parX,
  parY,
  tiltY,
  glowParX,
  glowParY,
}: {
  src: string;
  alt: string;
  secondarySrc?: string;
  secondaryAlt?: string;
  scrollY: MotionValue<number>;
  scrollRotate: MotionValue<number>;
  fade: MotionValue<number>;
  parX: MotionValue<number>;
  parY: MotionValue<number>;
  tiltY: MotionValue<number>;
  glowParX: MotionValue<number>;
  glowParY: MotionValue<number>;
}) {
  // The background bottle drifts at roughly half the foreground's parallax
  // strength — different depths should move at different speeds, not lock
  // together, or the "studio depth" illusion falls apart.
  const secondaryParX = useTransform(parX, (v) => v * 0.45);
  const secondaryParY = useTransform(parY, (v) => v * 0.45);

  return (
    <motion.div
      style={{ y: scrollY, rotate: scrollRotate, opacity: fade }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex h-full items-center justify-center"
    >
      {secondarySrc && (
        <motion.div
          style={{ x: secondaryParX, y: secondaryParY }}
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-[8%] top-[6%] -z-10 sm:left-[2%]"
        >
          <img
            src={secondarySrc}
            alt={secondaryAlt ?? ""}
            width={420}
            height={640}
            loading="lazy"
            decoding="async"
            className="bottle-secondary float-bottle relative h-full max-h-[26vh] w-auto sm:max-h-[30vh] lg:max-h-[34vh]"
            style={{ filter: "blur(1.5px) saturate(0.85) brightness(0.97) drop-shadow(0 24px 30px rgba(0,0,0,0.35))" }}
          />
        </motion.div>
      )}

      <motion.div
        style={{ x: parX, y: parY }}
        className="relative flex items-center justify-center"
      >
        <div className="spotlight-cone" />
        <div className="bottle-mist" />

        <motion.div
          style={{ x: glowParX, y: glowParY }}
          className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-90"
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

        {/* Image height is capped BELOW the bottle stage's container height
            (see the h-[…] on the stage div in Hero.tsx) so it never bleeds
            past its box onto the CTA cluster beneath — that overflow was
            exactly what made "Shop Now" visually covered and unclickable. */}
        <motion.div style={{ rotateY: tiltY }} className="relative" transition={{ type: "spring" }}>
          <div className="glint-sweep" />
          <img
            src={src}
            alt={alt}
            width={520}
            height={780}
            fetchPriority="high"
            decoding="async"
            className="float-bottle relative h-full max-h-[36vh] w-auto sm:max-h-[42vh] lg:max-h-[48vh]"
            style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.5))" }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
