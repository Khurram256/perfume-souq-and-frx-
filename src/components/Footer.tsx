import { Logo } from "./Logo";
import { Marquee } from "./Marquee";
import { DEVELOPER_NAME, DEVELOPER_URL } from "../lib/contact";

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden border-t border-border pt-16 pb-28 text-center sm:pb-24 lg:pb-10"
      style={{ background: "var(--navy-deep)" }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "var(--gradient-gold)" }}
      />

      <Marquee
        items={["The Perfume Souq", "Authentic Fragrances", "Sourced with Care"]}
        className="mb-16 opacity-70"
        onDark
      />

      <div className="flex justify-center">
        <Logo size={72} withText={false} />
      </div>
      <h2 className="mt-6 font-display text-4xl italic tracking-[0.18em] text-gradient-gold md:text-6xl">
        THE PERFUME SOUQ
      </h2>
      <p className="mt-3 font-display text-sm italic" style={{ color: "oklch(0.96 0.012 220 / 0.6)" }}>by Khurram Shabbir</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.4em]" style={{ color: "oklch(0.96 0.012 220 / 0.4)" }}>Est. 2026</p>

      <p className="mt-14 text-[10px] uppercase tracking-[0.4em]" style={{ color: "oklch(0.96 0.012 220 / 0.3)" }}>
        © The Perfume Souq · All rights reserved
      </p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: "oklch(0.96 0.012 220 / 0.55)" }}>
        Powered by{" "}
        <a
          href={DEVELOPER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--gold)] underline-offset-4 transition-colors duration-300 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {DEVELOPER_NAME}
        </a>
      </p>
    </footer>
  );
}
