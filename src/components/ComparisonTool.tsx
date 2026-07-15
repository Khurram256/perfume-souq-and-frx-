import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { usePerfumes, type Perfume } from "@/lib/api/queries";

function Bar({
  value,
  max = 10,
  label,
  perfumeId,
}: {
  value: number;
  max?: number;
  label: string;
  perfumeId: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[9px] uppercase tracking-[0.3em] text-foreground/50">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="h-[3px] w-full overflow-hidden bg-foreground/10">
        <motion.div
          key={`${perfumeId}-${label}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value / max }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ background: "var(--gradient-gold)", transformOrigin: "left" }}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

function Side({
  perfumes,
  value,
  onChange,
}: {
  perfumes: Perfume[];
  value: string;
  onChange: (id: string) => void;
}) {
  const p = perfumes.find((x) => x.id === value) ?? perfumes[0];
  if (!p) return null;
  return (
    <div className="glass-card rounded-sm p-8">
      <label className="mb-3 block text-[10px] uppercase tracking-[0.35em] text-gold/80">
        Choose Another Perfume to Compare
      </label>
      <div className="relative mb-8">
        <select
          value={p.id}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-sm border border-gold/50 bg-obsidian/60 px-4 py-3 pr-10 text-[11px] uppercase tracking-[0.3em] text-gold transition hover:border-gold focus:border-gold focus:outline-none"
        >
          {perfumes.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-obsidian text-foreground">
              {opt.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
      </div>

      <div className="flex items-start gap-6">
        {p.image_url && (
          <img src={p.image_url} alt={p.name} className="h-32 w-24 flex-shrink-0 object-contain" />
        )}
        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-[0.4em] text-gold/70">{p.family}</p>
          <h3 className="font-display text-2xl italic">{p.name}</h3>
          {p.tagline && <p className="mt-2 text-xs text-foreground/60">{p.tagline}</p>}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <Bar perfumeId={p.id} label="Longevity" value={p.rating_longevity} />
        <Bar perfumeId={p.id} label="Sillage" value={p.rating_sillage} />
        <Bar perfumeId={p.id} label="Projection" value={p.rating_projection} />
        <Bar perfumeId={p.id} label="Versatility" value={p.rating_versatility} />
        <div className="grid grid-cols-2 gap-4 pt-2 text-[10px] uppercase tracking-[0.3em]">
          <div>
            <p className="text-foreground/40">Season</p>
            <p className="mt-1 text-gold">{p.best_season || "—"}</p>
          </div>
          <div>
            <p className="text-foreground/40">Occasion</p>
            <p className="mt-1 text-gold">{p.occasion || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComparisonTool() {
  const { data: perfumes = [] } = usePerfumes();
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");

  useEffect(() => {
    if (!perfumes.length) return;
    if (!a || !perfumes.some((p) => p.id === a)) setA(perfumes[0].id);
    if (!b || !perfumes.some((p) => p.id === b)) setB((perfumes[1] ?? perfumes[0]).id);
  }, [perfumes, a, b]);

  if (perfumes.length < 1) return null;

  return (
    <section id="comparison" className="section-pad relative px-6 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 grid grid-cols-1 items-end gap-6 lg:grid-cols-[auto_1fr]">
          <span className="section-index text-[14vw] leading-none md:text-[6vw]">06</span>
          <div>
            <p className="label-eyebrow mb-5">Side by Side</p>
            <h2 className="heading-section" style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)" }}>
              Compare <span className="text-gradient-gold">Two Perfumes</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Side perfumes={perfumes} value={a} onChange={setA} />
          <Side perfumes={perfumes} value={b} onChange={setB} />
        </div>
      </div>
    </section>
  );
}
