import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useSpotlight, usePerfumes } from "@/lib/api/queries";
import { Magnetic } from "./Magnetic";

export function Signature() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [80, -80]);

  const { data: spotlight } = useSpotlight();
  const { data: perfumes = [] } = usePerfumes();
  const p =
    perfumes.find((x) => x.id === spotlight?.perfume_id) ||
    perfumes.find((x) => x.spotlight_eligible) ||
    perfumes[0];
  if (!p) return null;

  const description = spotlight?.description_override || p.description || "";
  const notes = [...p.top_notes, ...p.heart_notes, ...p.base_notes].slice(0, 6);

  return (
    <section
      id="signature"
      ref={ref}
      className="relative overflow-hidden py-40"
      style={{ background: "var(--obsidian)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.55 0.07 232 / 0.14), transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-6 lg:grid-cols-[auto_1fr_1fr] lg:px-16">
        <span className="section-index hidden text-[7vw] leading-none lg:block">03</span>

        <motion.div
          style={{ y: imgY }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          className="relative flex justify-center"
        >
          <div className="relative">
            <div
              className="absolute inset-0 -z-10 blur-3xl"
              style={{
                background: "radial-gradient(circle, oklch(0.78 0.09 228 / 0.40), transparent 65%)",
              }}
            />
            {p.image_url && (
              <img
                src={p.image_url}
                alt={p.name}
                loading="lazy"
                className="relative max-h-[560px] w-auto"
                style={{ filter: "drop-shadow(0 50px 70px rgba(0,0,0,0.9))" }}
              />
            )}
          </div>
        </motion.div>

        <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="mb-4 text-[10px] uppercase tracking-[0.5em] text-gold"
          >
            Maison Spotlight
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="font-display text-6xl italic leading-[0.95] text-gradient-gold"
          >
            {p.name}
          </motion.h2>
          {p.family && (
            <p className="mt-4 text-xs uppercase tracking-[0.4em] text-foreground/45">{p.family}</p>
          )}

          {description && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mt-8 max-w-md text-sm font-light leading-relaxed text-foreground/70"
            >
              {description}
            </motion.p>
          )}

          {notes.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-3">
              {notes.map((n, i) => (
                <motion.span
                  key={n + i}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 200, damping: 18 }}
                  className="rounded-full border border-gold/40 px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-gold"
                >
                  {n}
                </motion.span>
              ))}
            </div>
          )}

          <div className="mt-12">
            <Magnetic>
              <a
                href="#collection"
                className="btn-gold inline-block px-10 py-4 text-[10px] uppercase tracking-[0.4em]"
              >
                Explore the Collection
              </a>
            </Magnetic>
          </div>
        </div>
      </div>
    </section>
  );
}
