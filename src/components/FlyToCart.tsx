import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

export function FlyToCart() {
  const { fly, clearFly } = useCart();
  if (!fly) return null;

  // Cart icon sits top-right in navbar. Approximate target.
  const targetX = window.innerWidth - 60;
  const targetY = 40;

  return (
    <AnimatePresence onExitComplete={clearFly}>
      <motion.div
        key={fly.id}
        initial={{ x: fly.fromX - 40, y: fly.fromY - 50, opacity: 0, scale: 1, rotate: 0 }}
        animate={{
          x: [fly.fromX - 40, (fly.fromX + targetX) / 2 - 60, targetX - 20],
          y: [fly.fromY - 50, fly.fromY - 220, targetY - 20],
          opacity: [0, 1, 1, 0.2],
          scale: [1, 0.85, 0.25],
          rotate: [0, -12, 18],
        }}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], times: [0, 0.4, 1] }}
        onAnimationComplete={() => setTimeout(clearFly, 50)}
        className="pointer-events-none fixed left-0 top-0 z-[180]"
        style={{ filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.7))" }}
      >
        <div className="relative h-[100px] w-[80px]">
          {/* "Box" tray */}
          <div
            className="absolute inset-0 rounded-sm border border-gold/60"
            style={{
              background: "linear-gradient(160deg, oklch(0.14 0.02 250), oklch(0.06 0.015 250))",
            }}
          />
          <img src={fly.img} alt="" className="relative h-full w-full object-contain p-2" />
          <div
            className="absolute inset-0 rounded-sm"
            style={{ boxShadow: "inset 0 0 20px oklch(0.78 0.09 228 / 0.4)" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
