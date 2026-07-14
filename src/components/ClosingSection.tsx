import { motion } from "framer-motion";
import { useContent } from "@/lib/api/queries";

const FALLBACK_LINES = [
  "Turn heads without saying a word.",
  "Command attention in silence.",
  "Dare to be remembered.",
  "A scent is the silence you leave behind.",
];

export function ClosingSection() {
  // Reads live from the CMS (site_content) with the original copy as
  // fallback — previously this text was fully hardcoded and ignored
  // whatever the admin saved in the Content tab.
  const line0 = useContent("closing.line0", FALLBACK_LINES[0]);
  const line1 = useContent("closing.line1", FALLBACK_LINES[1]);
  const line2 = useContent("closing.line2", FALLBACK_LINES[2]);
  const line3 = useContent("closing.line3", FALLBACK_LINES[3]);
  const lines = [line0, line1, line2, line3];

  return (
    <section className="relative overflow-hidden py-40">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.78 0.09 228 / 0.08), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mx-auto mb-12 h-px w-24" style={{ background: "var(--gradient-gold)" }} />
        {lines.map((l, i) => (
          <motion.p
            key={l}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, delay: i * 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className={`font-display italic leading-[1.4] ${
              i === lines.length - 1
                ? "mt-6 text-3xl text-gradient-gold md:text-5xl"
                : "text-2xl text-foreground/80 md:text-4xl"
            }`}
          >
            {l}
          </motion.p>
        ))}
        <div className="mx-auto mt-12 h-px w-24" style={{ background: "var(--gradient-gold)" }} />
      </div>
    </section>
  );
}
