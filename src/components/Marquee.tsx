export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (
    <div className="marquee-row">
      {items.map((item, i) => (
        <span key={i} className="font-display text-3xl italic text-foreground/25 md:text-5xl">
          {item}
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
