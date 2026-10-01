import { motion, useReducedMotion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";
import logoMark from "@/assets/logo-mark.png";

export function Logo({ size = 56, withText = true, forceLight }: { size?: number; withText?: boolean; forceLight?: boolean }) {
  const reduceMotion = useReducedMotion();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Link
      to="/"
      onClick={(e) => {
        // Already home: glide back to the top instead of a no-op navigation.
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        }
      }}
      className={`flex min-w-0 items-center ${withText ? "gap-2 min-[400px]:gap-2.5 sm:gap-4" : "gap-4"}`}
      aria-label="The Perfume Souq — Home"
    >
      <motion.img
        src={logoMark}
        alt=""
        width={size}
        height={size}
        className={withText ? "h-9 w-9 flex-shrink-0 min-[400px]:h-10 min-[400px]:w-10 sm:h-14 sm:w-14" : undefined}
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
        <span className="hidden flex-col leading-none min-[360px]:flex">
          <span className="whitespace-nowrap font-display text-[12px] uppercase tracking-[0.08em] text-gradient-gold min-[400px]:text-[13px] sm:text-[18px] sm:tracking-[0.32em] md:text-[20px]">
            The Perfume Souq
          </span>
          <span
            style={forceLight ? { color: "oklch(0.96 0.012 220 / 0.65)" } : undefined}
            className={`mt-1.5 whitespace-nowrap font-display text-[9px] italic tracking-[0.1em] min-[400px]:tracking-[0.15em] sm:text-[11px] sm:tracking-[0.28em] ${forceLight ? "" : "text-foreground/65"}`}
          >
            by Khurram Shabbir
          </span>
        </span>
      )}
    </Link>
  );
}
