import { Logo } from "./Logo";
import { Marquee } from "./Marquee";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border pt-16 pb-10 text-center" style={{ background: "var(--navy-deep)" }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: "var(--gradient-gold)" }} />

      <Marquee items={["The Perfume Souq", "Rare Fragrances", "Hand Composed"]} className="mb-16 opacity-70" />

      <div className="flex justify-center">
        <Logo size={72} withText={false} />
      </div>
      <h2 className="mt-6 font-display text-4xl italic tracking-[0.18em] text-gradient-gold md:text-6xl">
        THE PERFUME SOUQ
      </h2>
      <p className="mt-3 font-display text-sm italic text-foreground/60">by Khurram Shabbir</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-foreground/40">Est. 2026</p>

      <p className="mt-14 text-[10px] uppercase tracking-[0.4em] text-foreground/30">
        © The Perfume Souq · All rights reserved
      </p>
    </footer>
  );
}
