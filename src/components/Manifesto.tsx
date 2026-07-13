import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const lines = [
  "Turn heads without saying a word.",
  "Command attention in silence.",
  "Dare to be remembered.",
];

export function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.3, 1, 1, 0.3]);

  return (
    <section ref={ref} className="relative overflow-hidden py-40">
      <motion.div style={{ y, opacity }} className="mx-auto max-w-5xl px-6 text-center">
        {lines.map((l, i) => (
          <motion.p
            key={l}
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, delay: i * 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-display text-4xl italic leading-[1.4] text-foreground/85 md:text-6xl"
          >
            {i === 1 ? <span className="text-gradient-gold">{l}</span> : l}
          </motion.p>
        ))}
        <div className="mx-auto mt-12 h-px w-32" style={{ background: "var(--gradient-gold)" }} />
      </motion.div>
    </section>
  );
}
