export function Marquee({ items, className, onDark }: { items: string[]; className?: string; onDark?: boolean }) {
  const row = (
    <div className="marquee-row">
      {items.map((item, i) => (
        <span
          key={i}
          className="font-display text-3xl italic md:text-5xl"
          style={{ color: onDark ? "oklch(0.96 0.012 220 / 0.25)" : undefined }}
        >
          <span className={onDark ? undefined : "text-foreground/25"}>{item}</span>
          <span className="mx-6 text-gold/50">·</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}
