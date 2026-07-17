import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import logoMark from "@/assets/logo-mark.png";

const SESSION_KEY = "tps_boutique_intro_shown";

// A one-time-per-session cinematic entrance, not a network-loading spinner —
// it plays regardless of load speed so the boutique-opening feeling is
// consistent, then never repeats until the tab is closed.
export function BoutiqueLoader() {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);

    const timers = [
      setTimeout(() => setStage(1), 150), // logo
      setTimeout(() => setStage(2), 700), // gold line
      setTimeout(() => setStage(3), 1100), // wordmark
      setTimeout(() => setStage(4), 1750), // glow hold
      setTimeout(() => setStage(5), 1900), // champagne light sweep
      setTimeout(() => setVisible(false), 2500), // fade out
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-obsidian"
        >
          <motion.img
            src={logoMark}
            alt=""
            width={64}
            height={64}
            initial={{ opacity: 0, scale: 0.85, rotate: -12 }}
            animate={stage >= 1 ? { opacity: 1, scale: 1, rotate: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ filter: "drop-shadow(0 0 20px oklch(0.66 0.12 74 / 0.5))" }}
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={stage >= 2 ? { scaleX: 1 } : {}}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ transformOrigin: "center" }}
            className="gold-line mt-6 w-20"
          />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={stage >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="mt-6 text-center font-display text-xl italic tracking-[0.2em] text-gradient-gold"
          >
            The Perfume Souq
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={stage >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-2 text-center text-[10px] uppercase tracking-[0.4em] text-foreground/50"
          >
            by Khurram Shabbir
          </motion.p>
          {stage >= 5 && <div className="intro-sweep" />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
