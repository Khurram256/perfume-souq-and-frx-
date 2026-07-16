import { motion, useReducedMotion } from "framer-motion";
import logoMark from "@/assets/logo-mark.png";

export function Logo({ size = 56, withText = true }: { size?: number; withText?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <a href="#top" className="flex items-center gap-4" aria-label="The Perfume Souq — Home">
      <motion.img
        src={logoMark}
        alt=""
        width={size}
        height={size}
        style={{ filter: "drop-shadow(0 0 14px oklch(0.78 0.09 78 / 0.55))" }}
        whileHover={
          reduceMotion
            ? undefined
            : {
                rotate: 180,
                scale: 1.08,
                filter: "drop-shadow(0 0 22px oklch(0.78 0.09 78 / 0.85))",
              }
        }
        whileTap={reduceMotion ? undefined : { rotate: 180, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[18px] uppercase tracking-[0.32em] text-gradient-gold md:text-[20px]">
            The Perfume Souq
          </span>
          <span className="mt-1.5 font-display text-[11px] italic tracking-[0.28em] text-foreground/65">
            by Khurram Shabbir
          </span>
        </span>
      )}
    </a>
  );
}
