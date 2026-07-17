import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

type Mote = {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
  x: number;
  op: number;
};

// Background layers for the hero "scent chamber": the site's own theme
// gradient (Signature Ivory by default), a soft gold vignette, drifting
// light rays, glow orbs, floating gold dust and the viewfinder HUD corners.
export function HeroAtmosphere() {
  const reduceMotion = useReducedMotion();
  const [motes, setMotes] = useState<Mote[]>([]);

  useEffect(() => {
    if (reduceMotion) return;
    const n = window.innerWidth < 768 ? 10 : 20;
    setMotes(
      Array.from({ length: n }).map((_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        size: Math.random() * 2.5 + 1,
        delay: Math.random() * 10,
        duration: Math.random() * 8 + 10,
        x: (Math.random() - 0.5) * 60,
        op: Math.random() * 0.35 + 0.25,
      })),
    );
  }, [reduceMotion]);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 hero-chamber" />
      <div className="pointer-events-none absolute inset-0 hero-vignette" />
      <div className="perspective-grid pointer-events-none opacity-30" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
        <div className="light-ray absolute left-[-20%] top-[16%]" />
        <div className="light-ray light-ray--2 absolute left-[-20%] top-[42%]" />
        <div className="light-ray light-ray--3 absolute left-[-20%] top-[68%]" />
        <div
          className="glow-orb"
          style={{
            width: 460,
            height: 460,
            top: "-10%",
            left: "6%",
            background: "oklch(0.90 0.05 78 / 0.5)",
          }}
        />
        <div
          className="glow-orb"
          style={{
            width: 520,
            height: 520,
            bottom: "-16%",
            right: "4%",
            background: "oklch(0.88 0.05 72 / 0.35)",
            animationDelay: "-6s",
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {motes.map((m) => (
          <span
            key={m.id}
            className="dust-mote absolute"
            style={
              {
                left: `${m.left}%`,
                bottom: "-10px",
                width: m.size,
                height: m.size,
                animationDuration: `${m.duration}s`,
                animationDelay: `${m.delay}s`,
                "--dust-x": `${m.x}px`,
                "--dust-op": m.op,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="hud-corner hud-corner--tl"
        style={{ "--hud-delay": "0.5s" } as CSSProperties}
      />
      <div
        className="hud-corner hud-corner--tr"
        style={{ "--hud-delay": "0.65s" } as CSSProperties}
      />
      <div
        className="hud-corner hud-corner--bl"
        style={{ "--hud-delay": "0.8s" } as CSSProperties}
      />
      <div
        className="hud-corner hud-corner--br"
        style={{ "--hud-delay": "0.95s" } as CSSProperties}
      />
    </>
  );
}
