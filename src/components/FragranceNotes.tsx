import { motion, useTransform, type MotionValue } from "framer-motion";
import type { CSSProperties } from "react";

type NoteDef = {
  label: string;
  top: string;
  left: string;
  depth: number;
  duration: number;
  delay: number;
  mobile?: boolean;
};

// Positioned within the bottle stage only (never over the branding or CTA
// clusters above/below it) — spec §6. Depth controls how strongly each chip
// answers the cursor, giving the orbit a layered, non-uniform feel.
const NOTES: NoteDef[] = [
  { label: "Bergamot", top: "8%", left: "4%", depth: 10, duration: 6.5, delay: 0, mobile: true },
  { label: "Oud", top: "20%", left: "86%", depth: 16, duration: 7.5, delay: 0.6, mobile: true },
  { label: "Amber", top: "58%", left: "0%", depth: 8, duration: 8, delay: 1.1 },
  { label: "Vetiver", top: "70%", left: "90%", depth: 14, duration: 7, delay: 0.3, mobile: true },
  { label: "Musk", top: "42%", left: "94%", depth: 12, duration: 9, delay: 1.6 },
];

function Note({
  note,
  smx,
  smy,
  reduceMotion,
}: {
  note: NoteDef;
  smx: MotionValue<number>;
  smy: MotionValue<number>;
  reduceMotion: boolean | null;
}) {
  const px = useTransform(smx, [-0.5, 0.5], [-note.depth, note.depth]);
  const py = useTransform(smy, [-0.5, 0.5], [-note.depth * 0.7, note.depth * 0.7]);

  return (
    <motion.span
      style={
        {
          top: note.top,
          left: note.left,
          x: reduceMotion ? 0 : px,
          y: reduceMotion ? 0 : py,
          "--note-dur": `${note.duration}s`,
          "--note-delay": `${note.delay}s`,
        } as CSSProperties
      }
      className={`note-chip ${note.mobile ? "inline-flex" : "hidden sm:inline-flex"}`}
    >
      {note.label}
    </motion.span>
  );
}

export function FragranceNotes({
  smx,
  smy,
  reduceMotion,
}: {
  smx: MotionValue<number>;
  smy: MotionValue<number>;
  reduceMotion: boolean | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {NOTES.map((n) => (
        <Note key={n.label} note={n} smx={smx} smy={smy} reduceMotion={reduceMotion} />
      ))}
    </div>
  );
}
