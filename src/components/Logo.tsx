import logoMark from "@/assets/logo-mark.png";

export function Logo({ size = 56, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <a href="#top" className="flex items-center gap-4 group" aria-label="The Perfume Souq — Home">
      <img
        src={logoMark}
        alt=""
        width={size}
        height={size}
        className="transition-transform duration-700 group-hover:rotate-180"
        style={{ filter: "drop-shadow(0 0 14px oklch(0.78 0.09 228 / 0.55))" }}
      />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[18px] uppercase tracking-[0.32em] text-gradient-gold md:text-[20px]">
            The Perfume Souq
          </span>
          <span className="mt-1.5 font-display text-[11px] italic tracking-[0.28em] text-foreground/65">
            by Khurram Shabbir
          </span>
        </span>
      )}
    </a>
  );
}
