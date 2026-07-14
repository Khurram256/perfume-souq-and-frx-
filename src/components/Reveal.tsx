import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// Single signature motion language used everywhere — the consistency itself
// is the luxury cue (LV/Tom Ford never mix five different reveal styles on
// one page). All variants share the same easing curve and speed family.
const EASE = [0.16, 1, 0.3, 1] as const;

const VARIANTS: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 48 },
    show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE } },
  },
  mask: {
    hidden: { opacity: 0, y: 24, clipPath: "inset(0 0 100% 0)" },
    show: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", transition: { duration: 1.2, ease: EASE } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1, transition: { duration: 1.2, ease: EASE } },
  },
  blur: {
    hidden: { opacity: 0, y: 20, filter: "blur(14px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.1, ease: EASE } },
  },
};

export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
  once = true,
  margin = "-80px",
}: {
  children: ReactNode;
  variant?: "up" | "mask" | "scale" | "blur";
  delay?: number;
  className?: string;
  once?: boolean;
  margin?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: margin as any }}
      variants={VARIANTS[variant]}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggers a group of children with the same signature motion — for card
// grids, note pills, feature lists.
export function RevealGroup({
  children,
  variant = "up",
  stagger = 0.08,
  className,
}: {
  children: ReactNode;
  variant?: "up" | "mask" | "scale" | "blur";
  stagger?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={VARIANTS[variant]}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
