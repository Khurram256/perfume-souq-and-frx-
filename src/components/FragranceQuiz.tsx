import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { usePerfumes, type Perfume } from "@/lib/api/queries";
import { useCart } from "@/contexts/CartContext";
import { formatPKR } from "@/lib/format";
import { Magnetic } from "./Magnetic";

type TagKey = "tag_gender" | "tag_family" | "tag_occasion";
type Answers = Partial<Record<TagKey, string>>;

const STEP_META: { key: TagKey; question: string }[] = [
  { key: "tag_gender", question: "Who is this scent for?" },
  { key: "tag_family", question: "Which mood draws you in?" },
  { key: "tag_occasion", question: "What occasion calls for it?" },
];

function titleCase(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function score(p: Perfume, a: Answers) {
  let s = 0;
  if (a.tag_gender && (p.tag_gender === a.tag_gender || p.tag_gender === "unisex")) s += 3;
  if (a.tag_family && p.tag_family === a.tag_family) s += 4;
  if (a.tag_occasion && p.tag_occasion === a.tag_occasion) s += 2;
  return s;
}

export function FragranceQuiz() {
  const { data: perfumes = [] } = usePerfumes();
  const inStock = useMemo(() => perfumes.filter((p) => p.in_stock), [perfumes]);

  const steps = useMemo(
    () =>
      STEP_META.map((meta) => ({
        ...meta,
        options: Array.from(
          new Set(inStock.map((p) => p[meta.key]).filter(Boolean) as string[]),
        ).map((v) => ({
          label: titleCase(v),
          value: v,
        })),
      })).filter((s) => s.options.length > 0),
    [inStock],
  );

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Answers>({});
  const { add } = useCart();

  const done = step >= steps.length;
  const results = useMemo(() => {
    if (!done || !inStock.length) return [];
    return [...inStock]
      .map((p) => ({ p, s: score(p, ans) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.p);
  }, [done, ans, inStock]);

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setStep(0);
      setAns({});
    }, 400);
  };

  if (!steps.length) return null;

  return (
    <section id="quiz" className="relative px-6 py-32 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[auto_1fr]"
        >
          <span className="section-index text-[16vw] leading-none md:text-[7vw]">05</span>
          <div>
            <p className="mb-4 text-[10px] uppercase tracking-[0.5em] text-gold">
              Not sure what to choose?
            </p>
            <h2 className="font-display text-4xl italic leading-none md:text-6xl">
              Find your <span className="text-gradient-gold">Signature Scent</span>
            </h2>
            <p className="mt-8 max-w-xl text-sm font-light leading-relaxed text-foreground/60">
              A few quiet questions. Considered recommendations, drawn from the current Souq
              collection.
            </p>
            <Magnetic className="mt-10 inline-block">
              <button
                onClick={() => setOpen(true)}
                className="btn-gold inline-flex items-center gap-3 px-10 py-4 text-[10px] uppercase tracking-[0.4em]"
              >
                Begin the Ritual <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Magnetic>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={reset}
              className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 30 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="fixed left-1/2 top-1/2 z-[150] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-sm border border-gold/40 bg-card p-10"
              style={{ boxShadow: "var(--shadow-deep), var(--shadow-gold)" }}
            >
              {!done ? (
                <>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.5em] text-gold">
                    Step {step + 1} of {steps.length}
                  </p>
                  <h3 className="mb-10 font-display text-3xl italic md:text-4xl">
                    {steps[step].question}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {steps[step].options.map((o) => (
                      <button
                        key={o.label}
                        data-magnetic
                        onClick={() => {
                          setAns((prev) => ({ ...prev, [steps[step].key]: o.value }));
                          setStep((s) => s + 1);
                        }}
                        className="rounded-sm border border-gold/30 px-4 py-5 text-[11px] uppercase tracking-[0.3em] text-foreground/80 transition-all hover:border-gold hover:bg-gold/10 hover:text-gold"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.5em] text-gold">
                    Curated for you
                  </p>
                  <h3 className="mb-8 font-display text-3xl italic md:text-4xl">
                    Your Signature Selection
                  </h3>
                  <div className="space-y-4">
                    {results.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-4 border-b border-border pb-4 last:border-b-0"
                      >
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-20 w-16 object-contain"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-[9px] uppercase tracking-[0.4em] text-gold/80">
                            {p.family}
                          </p>
                          <h4 className="font-display text-xl italic">{p.name}</h4>
                          {p.tagline && (
                            <p className="mt-1 text-xs text-foreground/55">{p.tagline}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-gradient-gold font-display text-lg">
                            {formatPKR(p.price_pkr)}
                          </p>
                          <button
                            onClick={() =>
                              add({
                                id: p.id,
                                name: p.name,
                                price: p.price_pkr,
                                img: p.image_url || "",
                              })
                            }
                            disabled={!p.in_stock}
                            data-magnetic
                            className="mt-2 text-[9px] uppercase tracking-[0.35em] text-gold hover-underline disabled:opacity-40"
                          >
                            {p.in_stock ? "Add to Cart" : "Sold Out"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {!results.length && (
                      <p className="py-6 text-center text-sm text-foreground/50">
                        The collection is still being prepared for this ritual. Please check back
                        shortly.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={reset}
                    className="mt-8 w-full border-t border-border pt-4 text-[10px] uppercase tracking-[0.4em] text-foreground/60 hover:text-gold"
                  >
                    Take Again
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
