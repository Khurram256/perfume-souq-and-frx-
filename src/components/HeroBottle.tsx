import { motion, type MotionValue } from "framer-motion";

// The perfume bottle as the hero's dimensional centrepiece — glass halo,
// cursor-responsive tilt, drifting fragrance mist and a light-catching
// glint sweep. Scroll-linked transforms are computed by the parent (Hero)
// since they depend on the section's scroll-progress ref.
export function HeroBottle({
  src,
  alt,
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
  scrollY: MotionValue<number>;
  scrollRotate: MotionValue<number>;
  fade: MotionValue<number>;
  parX: MotionValue<number>;
  parY: MotionValue<number>;
  tiltY: MotionValue<number>;
  glowParX: MotionValue<number>;
  glowParY: MotionValue<number>;
}) {
  return (
    <motion.div
      style={{ y: scrollY, rotate: scrollRotate, opacity: fade }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex h-full items-center justify-center"
    >
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
            className="float-bottle relative h-full max-h-[34vh] w-auto sm:max-h-[38vh] lg:max-h-[42vh]"
            style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.5))" }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
