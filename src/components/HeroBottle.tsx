import { motion, type MotionValue } from "framer-motion";

// The two final hero bottles, side by side — a deliberate feminine/masculine
// pairing, not a depth-staged "one behind the other" studio shot (that
// composition is what caused the camouflage/hidden-bottle issue this
// replaces). Both images are static, bundled assets — never swapped,
// randomized, or fetched from catalogue data — so there is nothing that can
// flicker or briefly show a different bottle while data loads.
export function HeroBottle({
  leftSrc,
  leftAlt,
  rightSrc,
  rightAlt,
  fade,
  parX,
  parY,
}: {
  leftSrc: string;
  leftAlt: string;
  rightSrc: string;
  rightAlt: string;
  fade: MotionValue<number>;
  parX: MotionValue<number>;
  parY: MotionValue<number>;
}) {
  return (
    <motion.div
      style={{ opacity: fade }}
      className="relative flex h-full w-full items-end justify-center gap-4 sm:gap-8 lg:gap-12"
    >
      <motion.div
        style={{ x: parX, y: parY }}
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center blur-3xl"
      >
        <div
          className="h-2/3 w-2/3"
          style={{
            background:
              "radial-gradient(circle, oklch(0.70 0.10 70 / 0.45), oklch(0.93 0.05 75 / 0.28) 45%, transparent 72%)",
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ x: parX, y: parY }}
        className="relative flex flex-1 items-end justify-center self-stretch"
      >
        <img
          src={leftSrc}
          alt={leftAlt}
          width={520}
          height={780}
          fetchPriority="high"
          decoding="async"
          className="float-bottle relative mx-auto h-full max-h-[30vh] w-auto object-contain sm:max-h-[38vh] lg:max-h-[46vh]"
          style={{ filter: "drop-shadow(0 0 60px oklch(0.78 0.09 78 / 0.3)) drop-shadow(0 26px 34px rgba(0,0,0,0.45))" }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ x: parX, y: parY }}
        className="relative flex flex-1 items-end justify-center self-stretch"
      >
        <img
          src={rightSrc}
          alt={rightAlt}
          width={520}
          height={780}
          fetchPriority="high"
          decoding="async"
          className="float-bottle float-bottle--offset relative mx-auto h-full max-h-[27vh] w-auto object-contain sm:max-h-[34vh] lg:max-h-[41vh]"
          style={{ filter: "drop-shadow(0 0 60px oklch(0.78 0.09 78 / 0.3)) drop-shadow(0 26px 34px rgba(0,0,0,0.45))" }}
        />
      </motion.div>
    </motion.div>
  );
}
