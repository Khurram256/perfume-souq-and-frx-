import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  usePerfumes,
  useAllVariants,
  usePromotions,
  trackEvent,
  type Perfume,
} from "@/lib/api/queries";
import { resolveVariantPrice } from "@/lib/pricing";
import { useCart } from "@/contexts/CartContext";
import { formatPKR } from "@/lib/format";
import { titleCase } from "@/lib/catalog";
import { Slider } from "./ui/slider";
import { Magnetic } from "./Magnetic";
import { BackInStockButton } from "./BackInStockButton";

type StepKey = "gender" | "accords" | "family";
// Answers are always arrays, even for single-select questions (length <= 1)
// — one uniform shape rather than a string for single-select and a string[]
// for multi-select, which would need two branches everywhere they're read.
type Answers = Partial<Record<StepKey, string[]>> & { budget?: [number, number] };

const GENDER_LABELS: Record<string, string> = { men: "Masculine", women: "Feminine", unisex: "Unisex" };

// How many choices each multi-select question offers. The choices themselves
// are the most common accords / families found in the live catalogue, so a
// fragrance added in the admin panel is matchable immediately and no
// perfume is ever named in this file.
const ACCORD_CHOICES = 14;
const FAMILY_CHOICES = 10;

function topByFrequency(values: Iterable<string>, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([v]) => v);
}

// Scores one perfume against the answers using only stored fragrance data:
// gender, main accords, the three note tiers, family and real variant prices.
// `matched` is what the customer sees as the reason it was chosen.
function scoreMatch(p: Perfume, a: Answers, variantPrices: number[]) {
  const matched: string[] = [];
  let s = 0;

  const gender = a.gender?.[0];
  if (gender) {
    if (gender === "unisex") {
      if (p.gender === "unisex") {
        s += 2;
        matched.push("Women & Men");
      }
    } else if (p.gender === gender) {
      s += 4;
      matched.push(gender === "men" ? "For men" : "For women");
    } else if (p.gender === "unisex") {
      s += 3;
      matched.push("Women & Men");
    } else {
      // Made for the other audience — never recommend it.
      return { score: -100, matched };
    }
  }

  const notes = [...p.top_notes, ...p.heart_notes, ...p.base_notes].map((n) => n.toLowerCase());
  for (const accord of a.accords ?? []) {
    if (p.main_accords.includes(accord)) {
      s += 3;
      matched.push(`${titleCase(accord)} accord`);
    } else if (notes.some((n) => n.includes(accord))) {
      s += 1;
      matched.push(`${titleCase(accord)} note`);
    }
  }

  const family = p.family;
  if (family && a.family?.length) {
    if (a.family.includes(family)) {
      s += 3;
      matched.push(family);
    } else if (a.family.some((f) => f.split(" ")[0] === family.split(" ")[0])) {
      s += 1;
    }
  }

  if (a.budget && variantPrices.length) {
    const [lo, hi] = a.budget;
    if (variantPrices.some((price) => price >= lo && price <= hi)) {
      s += 3;
      matched.push("Within budget");
    } else {
      s -= 4;
    }
  }
  return { score: s, matched };
}

export function FragranceQuiz() {
  const { data: perfumes = [] } = usePerfumes();
  const { data: variants = [] } = useAllVariants();
  const { data: promotions = [] } = usePromotions();
  const inStock = useMemo(() => perfumes.filter((p) => p.in_stock), [perfumes]);

  const priceBounds = useMemo(() => {
    const prices = variants.map((v) => v.price_pkr).filter((p) => p > 0);
    if (!prices.length) return { min: 0, max: 100000 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [variants]);

  const steps = useMemo(() => {
    const defs: {
      key: StepKey;
      question: string;
      selectionMode: "single" | "multiple";
      options: { label: string; value: string }[];
    }[] = [
      {
        key: "gender",
        question: "Who is this scent for?",
        selectionMode: "single",
        options: [...new Set(inStock.map((p) => p.gender).filter(Boolean) as string[])]
          .sort()
          .map((g) => ({ label: GENDER_LABELS[g] ?? titleCase(g), value: g })),
      },
      {
        key: "accords",
        question: "Which scent characters draw you in?",
        selectionMode: "multiple",
        options: topByFrequency(
          inStock.flatMap((p) => p.main_accords),
          ACCORD_CHOICES,
        ).map((v) => ({ label: titleCase(v), value: v })),
      },
      {
        key: "family",
        question: "Which fragrance styles appeal to you?",
        selectionMode: "multiple",
        options: topByFrequency(inStock.map((p) => p.family).filter(Boolean) as string[], FAMILY_CHOICES).map(
          (v) => ({ label: v, value: v }),
        ),
      },
    ];
    return defs.filter((s) => s.options.length > 0);
  }, [inStock]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Answers>({});
  const [budgetDraft, setBudgetDraft] = useState<[number, number] | null>(null);
  const { add } = useCart();

  const totalSteps = steps.length + 1; // + budget step
  const done = step >= totalSteps;

  useEffect(() => {
    if (open) trackEvent("quiz_start");
  }, [open]);

  useEffect(() => {
    if (done) trackEvent("quiz_complete", { metadata: ans as Record<string, unknown> });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Per-perfume: every real variant price, and the cheapest bottle priced
  // through the live promotions engine (what a customer would pay "from").
  const pricing = useMemo(() => {
    const map = new Map<
      string,
      {
        prices: number[];
        multi: boolean;
        single?: (typeof variants)[number];
        lead: {
          originalPrice: number;
          finalPrice: number;
          discountAmount: number;
          appliedPromotions: { name: string; badge_text: string | null }[];
        };
      }
    >();
    for (const p of perfumes) {
      const pv = variants.filter((v) => v.perfume_id === p.id);
      const cheapest = pv.length ? pv.reduce((m, v) => (v.price_pkr < m.price_pkr ? v : m)) : undefined;
      const basePrice = cheapest?.price_pkr ?? p.price_pkr;
      const lead = cheapest
        ? resolveVariantPrice(basePrice, promotions, {
            perfumeId: p.id,
            variantId: cheapest.id,
            brandId: p.brand_id,
            categoryId: p.category_id,
          })
        : { originalPrice: basePrice, finalPrice: basePrice, discountAmount: 0, appliedPromotions: [] };
      map.set(p.id, {
        prices: pv.length ? pv.map((v) => v.price_pkr) : [p.price_pkr],
        multi: pv.length > 1,
        single: pv.length === 1 ? pv[0] : undefined,
        lead,
      });
    }
    return map;
  }, [perfumes, variants, promotions]);

  const results = useMemo(() => {
    if (!done || !inStock.length) return [];
    return inStock
      .map((p) => {
        const info = pricing.get(p.id);
        const { score, matched } = scoreMatch(p, ans, info?.prices ?? [p.price_pkr]);
        return { p, score, matched, info };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || a.p.name.localeCompare(b.p.name))
      .slice(0, 3);
  }, [done, ans, inStock, pricing]);

  const reset = () => {
    setOpen(false);
    setTimeout(() => {
      setStep(0);
      setAns({});
      setBudgetDraft(null);
    }, 400);
  };

  if (!steps.length) return null;

  const onBudgetNext = () => {
    const range = budgetDraft ?? [priceBounds.min, priceBounds.max];
    setAns((prev) => ({ ...prev, budget: range }));
    setStep((s) => s + 1);
  };

  return (
    <section id="quiz" className="section-pad relative px-6 lg:px-16">
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
            <p className="label-eyebrow mb-5">Not sure what to choose?</p>
            <h2 className="heading-section">
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
                step < steps.length ? (
                  <>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.5em] text-gold">
                      Step {step + 1} of {totalSteps}
                      {steps[step].selectionMode === "multiple" && " · Choose as many as you like"}
                    </p>
                    <h3 className="mb-10 font-display text-3xl italic md:text-4xl">
                      {steps[step].question}
                    </h3>
                    {/* min-content-safe grid: rows size to their tallest cell, so a
                        longer label never overlaps the row below it, and text wraps
                        (break-words + leading-snug) instead of extending past the
                        button's own border. */}
                    <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3">
                      {steps[step].options.map((o) => {
                        const key = steps[step].key;
                        const selected = ans[key]?.includes(o.value) ?? false;
                        return (
                          <button
                            key={o.value}
                            data-magnetic
                            aria-pressed={selected}
                            onClick={() => {
                              if (steps[step].selectionMode === "single") {
                                setAns((prev) => ({ ...prev, [key]: [o.value] }));
                                setStep((s) => s + 1);
                              } else {
                                setAns((prev) => {
                                  const current = prev[key] ?? [];
                                  const next = current.includes(o.value)
                                    ? current.filter((v) => v !== o.value)
                                    : [...current, o.value];
                                  return { ...prev, [key]: next };
                                });
                              }
                            }}
                            className={`flex min-h-[4.5rem] items-center justify-center break-words rounded-sm border px-4 py-4 text-center text-[11px] uppercase leading-snug tracking-[0.2em] transition-all ${
                              selected
                                ? "border-gold bg-gold/15 text-gold"
                                : "border-gold/30 text-foreground/80 hover:border-gold hover:bg-gold/10 hover:text-gold"
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-8 flex items-center justify-between">
                      <button
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                        className="text-[10px] uppercase tracking-[0.4em] text-foreground/50 hover:text-gold disabled:opacity-0"
                      >
                        ← Back
                      </button>
                      {steps[step].selectionMode === "multiple" && (
                        <button
                          onClick={() => setStep((s) => s + 1)}
                          disabled={!(ans[steps[step].key]?.length)}
                          className="btn-gold px-8 py-3 text-[10px] uppercase tracking-[0.4em] disabled:opacity-30"
                        >
                          Next Question
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.5em] text-gold">
                      Step {totalSteps} of {totalSteps}
                    </p>
                    <h3 className="mb-10 font-display text-3xl italic md:text-4xl">
                      What is your budget?
                    </h3>
                    <Slider
                      min={priceBounds.min}
                      max={priceBounds.max}
                      step={500}
                      value={budgetDraft ?? [priceBounds.min, priceBounds.max]}
                      onValueChange={(v) => setBudgetDraft(v as [number, number])}
                      className="mb-6"
                    />
                    <div className="mb-8 flex items-center justify-between text-xs text-foreground/60">
                      <span>
                        {formatPKR((budgetDraft ?? [priceBounds.min, priceBounds.max])[0])}
                      </span>
                      <span>
                        {formatPKR((budgetDraft ?? [priceBounds.min, priceBounds.max])[1])}
                      </span>
                    </div>
                    <button
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      className="mb-4 text-[10px] uppercase tracking-[0.4em] text-foreground/50 hover:text-gold"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={onBudgetNext}
                      className="btn-gold w-full py-4 text-[10px] uppercase tracking-[0.4em]"
                    >
                      See My Recommendations
                    </button>
                  </>
                )
              ) : (
                <>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.5em] text-gold">
                    Curated for you
                  </p>
                  <h3 className="mb-8 font-display text-3xl italic md:text-4xl">
                    Your Signature Selection
                  </h3>
                  <div className="space-y-4">
                    {results.map(({ p, matched, info }) => {
                      const price = info?.lead;
                      const single = info?.single;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-4 border-b border-border pb-4 last:border-b-0"
                        >
                          {p.image_url && (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              className="h-20 w-16 object-contain"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-[9px] uppercase tracking-[0.4em] text-gold/80">
                              {p.family}
                            </p>
                            <h4 className="font-display text-xl italic">{p.name}</h4>
                            {matched.length > 0 && (
                              <p className="mt-1 text-[10px] text-foreground/45">
                                Why it matched: {matched.join(" · ")}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {price && price.discountAmount > 0 && (
                              <p className="text-[10px] text-foreground/40 line-through">
                                {formatPKR(price.originalPrice)}
                              </p>
                            )}
                            <p className="text-gradient-gold font-display text-lg">
                              {info?.multi ? "From " : ""}
                              {formatPKR(price?.finalPrice ?? p.price_pkr)}
                            </p>
                            <div className="mt-2 flex flex-col items-end gap-1.5">
                              {info?.multi ? (
                                <Link
                                  to="/product/$slug"
                                  params={{ slug: p.slug }}
                                  hash="size"
                                  data-magnetic
                                  className="text-[9px] font-semibold uppercase tracking-[0.35em] text-gold hover-underline"
                                >
                                  Choose Size
                                </Link>
                              ) : p.in_stock ? (
                                <button
                                  onClick={() => {
                                    add({
                                      id: single?.id ?? p.id,
                                      perfumeId: p.id,
                                      variantId: single?.id,
                                      sizeLabel: single?.size_label,
                                      name: p.name,
                                      price: price?.finalPrice ?? p.price_pkr,
                                      originalPrice:
                                        price && price.discountAmount > 0
                                          ? price.originalPrice
                                          : undefined,
                                      img: p.image_url || "",
                                    });
                                    trackEvent("whatsapp_click", {
                                      perfumeId: p.id,
                                      variantId: single?.id,
                                      sourcePath: "/quiz",
                                    });
                                  }}
                                  data-magnetic
                                  className="text-[9px] font-semibold uppercase tracking-[0.35em] text-gold hover-underline"
                                >
                                  Add to Cart
                                </button>
                              ) : (
                                <BackInStockButton
                                  perfumeId={p.id}
                                  variantId={single?.id}
                                  className="text-[9px] uppercase tracking-[0.35em] text-gold hover-underline"
                                />
                              )}
                              <Link
                                to="/product/$slug"
                                params={{ slug: p.slug }}
                                data-magnetic
                                className="text-[9px] uppercase tracking-[0.3em] text-foreground/50 hover-underline hover:text-gold"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
