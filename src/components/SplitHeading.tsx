import type { CSSProperties } from "react";

export function SplitHeading({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  accentWords = [],
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
  accentWords?: string[];
}) {
  const words = text.split(" ");
  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          style={{ "--fib-delay": `${delay + i * 0.06}s` } as CSSProperties}
          className={`fade-in-blur inline-block ${accentWords.includes(w.replace(/[.,]/g, "")) ? "text-gradient-gold" : ""}`}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
