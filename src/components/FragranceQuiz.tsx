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
import { Slider } from "./ui/slider";
import { Magnetic } from "./Magnetic";
import { BackInStockButton } from "./BackInStockButton";

type TagKey = "tag_gender" | "tag_family" | "tag_occasion";
type Answers = Partial<Record<TagKey, string>> & { budget?: [number, number] };

const STEP_META: { key: TagKey; question: string }[] = [
  { key: "tag_gender", question: "Who is this scent for?" },
  { key: "tag_family", question: "Which mood draws you in?" },
  { key: "tag_occasion", question: "What occasion calls for it?" },
];

function titleCase(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreMatch(p: Perfume, a: Answers, priceForBudget?: number) {
  const matched: string[] = [];
  let s = 0;
  if (a.tag_gender && (p.tag_gender === a.tag_gender || p.tag_gender === "unisex")) {
    s += 3;
    matched.push(titleCase(a.tag_gender));
  }
  if (a.tag_family && p.tag_family === a.tag_family) {
    s += 4;
    matched.push(titleCase(a.tag_family));
  }
  if (a.tag_occasion && p.tag_occasion === a.tag_occasion) {
    s += 2;
    matched.push(titleCase(a.tag_occasion));
  }
  if (a.budget && priceForBudget !== undefined) {
    const [lo, hi] = a.budget;
    if (priceForBudget >= lo && priceForBudget <= hi) {
      s += 3;
      matched.push("Within Budget");
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

  const priceByPerfumeId = useMemo(() => {
    const map = new Map<
      string,
      {
        originalPrice: number;
        finalPrice: number;
        discountAmount: number;
        appliedPromotions: { name: string; badge_text: string | null }[];
      }
    >();
    for (const p of perfumes) {
      const pv = variants.filter((v) => v.perfume_id === p.id);
      const dv = pv.find((v) => v.is_default) ?? pv[0];
      const basePrice = dv?.price_pkr ?? p.price_pkr;
      const resolved = dv
        ? resolveVariantPrice(basePrice, promotions, {
            perfumeId: p.id,
            variantId: dv.id,
            brandId: p.brand_id,
            categoryId: p.category_id,
          })
        : {
            originalPrice: basePrice,
            finalPrice: basePrice,
            discountAmount: 0,
            appliedPromotions: [],
          };
      map.set(p.id, resolved);
    }
    return map;
  }, [perfumes, variants, promotions]);

  const results = useMemo(() => {
    if (!done || !inStock.length) return [];
    return [...inStock]
      .map((p) => {
        const price = priceByPerfumeId.get(p.id);
        const { score, matched } = scoreMatch(p, ans, price?.finalPrice);
        return { p, score, matched, price };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [done, ans, inStock, priceByPerfumeId]);

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
                    {results.map(({ p, matched, price }) => (
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
                              Matched: {matched.join(" · ")}
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
                            {formatPKR(price?.finalPrice ?? p.price_pkr)}
                          </p>
                          {(() => {
                            const pv =
                              variants.find((v) => v.perfume_id === p.id && v.is_default) ??
                              variants.find((v) => v.perfume_id === p.id);
                            return (
                              <div className="mt-2 flex flex-col items-end gap-1.5">
                                {p.in_stock ? (
                                  <button
                                    onClick={() => {
                                      add({
                                        id: pv?.id ?? p.id,
                                        perfumeId: p.id,
                                        variantId: pv?.id,
                                        sizeLabel: pv?.size_label,
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
                                        variantId: pv?.id,
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
                                    variantId={pv?.id}
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
                            );
                          })()}
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
