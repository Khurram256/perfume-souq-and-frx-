import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useReviews, useSubmitReview } from "@/lib/api/queries";

function Stars({ value, onSet }: { value: number; onSet?: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onSet?.(n)}
          disabled={!onSet}
          aria-label={`${n} star`}
          className={n <= value ? "text-gold" : "text-foreground/25"}
        >
          <Star className="h-4 w-4" fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

export function Reviews() {
  const { data: reviews = [] } = useReviews();
  const submit = useSubmitReview();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    try {
      await submit.mutateAsync({ name, rating, body });
      toast.success("Thank you. Your review awaits the maison's approval.");
      setName("");
      setBody("");
      setRating(5);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Submission failed. Please try again.");
    }
  };

  return (
    <section id="reviews" className="section-pad relative px-6 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1 }}
          className="mb-20 grid grid-cols-1 items-end gap-6 lg:grid-cols-[auto_1fr]"
        >
          <span className="section-index text-[14vw] leading-none md:text-[6vw]">10</span>
          <div>
            <p className="label-eyebrow mb-5">Whispers</p>
            <h2 className="heading-section">
              From <span className="text-gradient-gold">Those Who Wear Us</span>
            </h2>
          </div>
        </motion.div>

        {reviews.length === 0 && (
          <p className="mb-10 text-center text-sm font-light text-foreground/45">
            Be the first to leave a whisper.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <motion.article
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.08 }}
              className="glass-card rounded-sm p-8"
            >
              <Stars value={r.rating} />
              <p className="mt-5 text-sm font-light italic leading-relaxed text-foreground/80">
                &ldquo;{r.body}&rdquo;
              </p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.4em] text-gold/80">— {r.name}</p>
            </motion.article>
          ))}
        </div>

        <div className="mt-14 text-center">
          <button
            onClick={() => setOpen(true)}
            data-magnetic
            className="btn-gold px-10 py-4 text-[10px] uppercase tracking-[0.4em]"
          >
            Leave a Whisper
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setOpen(false)}
          >
            <motion.form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="w-full max-w-md space-y-5 rounded-sm border border-gold/40 bg-obsidian p-8"
            >
              <div>
                <p className="mb-3 text-[10px] uppercase tracking-[0.5em] text-gold">
                  Share Your Whisper
                </p>
                <h3 className="font-display text-2xl italic">Leave a Review</h3>
              </div>
              <input
                required
                maxLength={80}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-sm border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-gold"
              />
              <div>
                <p className="mb-2 text-[9px] uppercase tracking-[0.4em] text-foreground/60">
                  Rating
                </p>
                <Stars value={rating} onSet={setRating} />
              </div>
              <textarea
                required
                maxLength={1000}
                placeholder="Your impression…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-sm border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-gold"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2 text-[10px] uppercase tracking-[0.4em] text-foreground/60 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="btn-gold px-6 py-2 text-[10px] uppercase tracking-[0.4em] disabled:opacity-40"
                >
                  {submit.isPending ? "Sending…" : "Submit"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
