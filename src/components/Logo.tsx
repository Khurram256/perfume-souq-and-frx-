import { motion, useReducedMotion } from "framer-motion";
import logoMark from "@/assets/logo-mark.png";

export function Logo({ size = 56, withText = true, forceLight }: { size?: number; withText?: boolean; forceLight?: boolean }) {
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
          <span className="whitespace-nowrap font-display text-[13px] uppercase tracking-[0.12em] text-gradient-gold sm:text-[18px] sm:tracking-[0.32em] md:text-[20px]">
            The Perfume Souq
          </span>
          <span
            style={forceLight ? { color: "oklch(0.96 0.012 220 / 0.65)" } : undefined}
            className={`mt-1.5 whitespace-nowrap font-display text-[9px] italic tracking-[0.15em] sm:text-[11px] sm:tracking-[0.28em] ${forceLight ? "" : "text-foreground/65"}`}
          >
            by Khurram Shabbir
          </span>
        </span>
      )}
    </a>
  );
}
