import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useSpotlight, usePerfumes } from "@/lib/api/queries";
import { Magnetic } from "./Magnetic";

export function Signature() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [90, -90]);
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.06, 0.94]);

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
      className="section-pad relative overflow-hidden"
      style={{ background: "var(--obsidian)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.70 0.10 70 / 0.20), transparent 62%)",
        }}
      />
      <div className="glow-orb pointer-events-none" style={{ width: 460, height: 460, top: "10%", left: "-8%", background: "oklch(0.62 0.08 232 / 0.30)" }} />
      <div className="glow-orb pointer-events-none" style={{ width: 380, height: 380, bottom: "0%", right: "-4%", background: "oklch(0.87 0.06 68 / 0.24)", animationDelay: "-9s" }} />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-6 lg:grid-cols-[auto_1fr_1fr] lg:px-16">
        <span className="section-index hidden text-[7vw] leading-none lg:block">03</span>

        <motion.div
          style={{ y: imgY, scale: imgScale }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          className="relative flex justify-center"
        >
          <div className="relative">
            <div className="spotlight-cone" style={{ width: "90%" }} />
            <div
              className="absolute inset-0 -z-10 blur-3xl"
              style={{
                background: "radial-gradient(circle, oklch(0.78 0.09 228 / 0.45), oklch(0.87 0.06 68 / 0.2) 45%, transparent 68%)",
              }}
            />
            {/* Soft reflection pooling beneath the bottle */}
            <div
              className="absolute -bottom-6 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-[50%] blur-2xl"
              style={{ background: "oklch(0.78 0.09 228 / 0.25)" }}
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
            className="label-eyebrow mb-5"
          >
            Maison Spotlight
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="heading-section text-gradient-gold"
            style={{ lineHeight: 0.95, fontSize: "clamp(2.75rem, 6.5vw, 6.5rem)" }}
          >
            {p.name}
          </motion.h2>
          {p.family && (
            <p className="mt-4 text-xs uppercase tracking-[0.4em]" style={{ color: "oklch(0.96 0.012 220 / 0.45)" }}>{p.family}</p>
          )}

          {description && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 1 }}
              className="mt-8 max-w-md text-sm font-light leading-relaxed"
              style={{ color: "oklch(0.96 0.012 220 / 0.7)" }}
            >
              {description}
            </motion.p>
          )}

          {notes.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-3">
              {notes.map((n, i) => (
                <motion.span
                  key={n + i}
                  initial={{ scale: 0, opacity: 0, y: 10 }}
                  whileInView={{ scale: 1, opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.08, borderColor: "var(--gold)" }}
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
