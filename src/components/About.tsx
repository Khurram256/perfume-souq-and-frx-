import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SplitHeading } from "./SplitHeading";
import { Reveal, RevealGroup } from "./Reveal";
import { useContent } from "@/lib/api/queries";

const promises = [
  "100% authentic branded perfumes",
  "Premium-quality inspired renditions",
  "Competitive and reasonable pricing",
  "Excellent customer service",
  "A shopping experience built on trust",
];

const FALLBACK_BODY =
  "Our mission is simple: to make authentic, high-quality fragrances accessible to everyone. What began as a passion for fine perfumes grew into a house built on trust, quality, and quiet obsession with craft.";

export function About() {
  const body = useContent("about.body", FALLBACK_BODY);
  return (
    <section
      id="about"
      className="section-pad relative overflow-hidden px-6 lg:px-16"
      style={{
        background: "linear-gradient(160deg, var(--burgundy) 0%, var(--burgundy-deep) 100%)",
      }}
    >
      {/* Brighter, more luminous atmosphere than a flat dark block */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 15% 0%, oklch(0.87 0.06 68 / 0.20), transparent 55%), radial-gradient(ellipse at 90% 90%, oklch(0.70 0.10 70 / 0.16), transparent 55%)",
        }}
      />
      <div className="glow-orb pointer-events-none" style={{ width: 380, height: 380, top: "5%", right: "-6%", background: "oklch(0.87 0.06 68 / 0.25)" }} />
      <div className="light-ray light-ray--2 pointer-events-none absolute left-[-20%] top-[15%] opacity-40" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 grid grid-cols-1 items-end gap-8 lg:grid-cols-[auto_1fr]">
          <span
            className="section-index text-[18vw] leading-none md:text-[9vw]"
            style={{ WebkitTextStroke: "1px oklch(0.93 0.025 220 / 0.35)" }}
          >
            02
          </span>
          <div>
            <p className="label-eyebrow mb-5">The House</p>
            <SplitHeading text="About the Souq" accentWords={["Souq"]} className="heading-section" />
          </div>
        </div>

        {/* Oversized floating pull-quote — the dominant visual moment, not a boxed card */}
        <Reveal variant="blur" className="relative mb-20 max-w-4xl">
          <span
            className="pointer-events-none absolute -left-4 -top-10 select-none font-display text-[9rem] italic text-gold/15 md:text-[13rem]"
            aria-hidden
          >
            "
          </span>
          <p className="relative font-display text-3xl italic leading-[1.25] text-foreground md:text-5xl">
            A fragrance is more than a scent — it is a{" "}
            <span className="text-gradient-gold">reflection of personality</span>, confidence, and
            style.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="h-px w-12" style={{ background: "var(--gradient-gold)" }} />
            <div>
              <p className="font-display text-lg italic text-gold">Khurram Shabbir</p>
              <p className="text-[10px] uppercase tracking-[0.4em] text-foreground/50">
                Founder · The Perfume Souq
              </p>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-5">
          <Reveal variant="up" delay={0.1} className="space-y-6 text-sm font-light leading-relaxed text-foreground/75 lg:col-span-3">
            <p>{body}</p>
            <p>
              We carefully source original branded fragrances from some of the world's most
              recognised maisons, and offer premium-inspired renditions for those who seek the
              essence of luxury at a more considered price. Every flacon in our collection is
              selected for performance, value, and presence.
            </p>
            <p className="pt-2 text-foreground/80">
              Whether you are searching for an iconic designer scent or a high-quality inspired
              alternative, we are here to help you find a fragrance that feels uniquely yours.
            </p>
            <p className="font-display text-lg italic text-gold">
              — Thank you for being part of our journey.
            </p>
          </Reveal>

          <div className="lg:col-span-2">
            <p className="label-eyebrow mb-6">Our Commitment</p>
            <RevealGroup variant="scale" stagger={0.09} className="space-y-4">
              {promises.map((p) => (
                <motion.div
                  key={p}
                  className="flex items-center gap-4 rounded-sm border border-gold/20 px-5 py-4"
                  style={{ background: "oklch(0.87 0.06 68 / 0.06)" }}
                  whileHover={{ x: 6, borderColor: "oklch(0.87 0.06 68 / 0.5)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                >
                  <Check className="h-4 w-4 flex-shrink-0 text-gold" />
                  <span className="text-sm text-foreground/90">{p}</span>
                </motion.div>
              ))}
            </RevealGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
