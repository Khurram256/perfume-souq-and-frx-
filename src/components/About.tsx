import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SplitHeading } from "./SplitHeading";

const promises = [
  "100% authentic branded perfumes",
  "Premium-quality inspired renditions",
  "Competitive and reasonable pricing",
  "Excellent customer service",
  "A shopping experience built on trust",
];

export function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden px-6 py-32 lg:px-16"
      style={{
        background: "linear-gradient(160deg, var(--burgundy) 0%, var(--burgundy-deep) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 10% 0%, oklch(0.93 0.025 220 / 0.10), transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 grid grid-cols-1 items-end gap-8 lg:grid-cols-[auto_1fr]">
          <span
            className="section-index text-[18vw] leading-none md:text-[9vw]"
            style={{ WebkitTextStroke: "1px oklch(0.93 0.025 220 / 0.35)" }}
          >
            02
          </span>
          <div>
            <p className="mb-4 text-[10px] uppercase tracking-[0.5em] text-gold">The House</p>
            <SplitHeading
              text="About the Souq"
              accentWords={["Souq"]}
              className="font-display text-4xl italic leading-none md:text-6xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-5">
          <motion.aside
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="lg:col-span-2"
          >
            <div
              className="relative rounded-sm border border-gold/30 p-10"
              style={{ background: "oklch(0.13 0.02 250 / 0.55)", boxShadow: "var(--shadow-gold)" }}
            >
              <div
                className="absolute -top-px left-8 right-8 h-px"
                style={{ background: "var(--gradient-gold)" }}
              />
              <p className="font-display text-2xl italic leading-relaxed text-foreground/85">
                "A fragrance is more than a scent — it is a reflection of personality, confidence,
                and style."
              </p>
              <div className="mt-8 border-t border-gold/20 pt-6">
                <p className="font-display text-xl italic text-gradient-gold">Khurram Shabbir</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.4em] text-foreground/50">
                  Founder · The Perfume Souq
                </p>
              </div>
            </div>
          </motion.aside>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.15 }}
            className="space-y-6 text-sm font-light leading-relaxed text-foreground/75 lg:col-span-3"
          >
            <p>
              Our mission is simple: to make authentic, high-quality fragrances accessible to
              everyone. What began as a passion for fine perfumes grew into a house built on trust,
              quality, and quiet obsession with craft.
            </p>
            <p>
              We carefully source original branded fragrances from some of the world's most
              recognised maisons, and offer premium-inspired renditions for those who seek the
              essence of luxury at a more considered price. Every flacon in our collection is
              selected for performance, value, and presence.
            </p>

            <div
              className="mt-8 rounded-sm border border-gold/25 p-6"
              style={{ background: "oklch(0.13 0.02 250 / 0.4)" }}
            >
              <p className="mb-4 text-[10px] uppercase tracking-[0.45em] text-gold">
                Our commitment
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {promises.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-foreground/85">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" />
                    <span className="text-sm">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="pt-2 text-foreground/80">
              Whether you are searching for an iconic designer scent or a high-quality inspired
              alternative, we are here to help you find a fragrance that feels uniquely yours.
            </p>
            <p className="font-display text-lg italic text-gold">
              — Thank you for being part of our journey.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
