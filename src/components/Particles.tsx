import { useEffect, useState } from "react";

export function Particles({ count = 40 }: { count?: number }) {
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      left: number;
      size: number;
      delay: number;
      duration: number;
      x: number;
      op: number;
    }>
  >([]);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const n = isMobile ? 15 : count;
    setParticles(
      Array.from({ length: n }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 20,
        duration: Math.random() * 15 + 18,
        x: (Math.random() - 0.5) * 120,
        op: Math.random() * 0.25 + 0.15,
      })),
    );
  }, [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: "-20px",
            width: p.size,
            height: p.size,
            background: "var(--gold)",
            boxShadow: "0 0 6px var(--gold)",
            animation: `particle-up ${p.duration}s linear ${p.delay}s infinite`,
            ["--p-x" as string]: `${p.x}px`,
            ["--p-op" as string]: p.op,
          }}
        />
      ))}
    </div>
  );
}
