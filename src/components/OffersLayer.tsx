import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useOffers, type Offer } from "@/lib/api/queries";

function OfferCta({ offer, className }: { offer: Offer; className?: string }) {
  if (!offer.cta_label) return null;
  const href = offer.cta_href || "#collection";
  return (
    <a
      href={href}
      className={className}
      style={{ borderColor: offer.accent_color, color: offer.accent_color }}
    >
      {offer.cta_label}
    </a>
  );
}

function AnnouncementBar({ offer }: { offer: Offer }) {
  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -30, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="fixed left-0 right-0 top-0 z-[200] border-b backdrop-blur-md"
      style={{
        borderColor: offer.accent_color + "40",
        background: "var(--obsidian)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-6 py-2">
        <p
          className="text-center text-[10px] uppercase tracking-[0.45em]"
          style={{ color: offer.accent_color }}
        >
          {offer.title}
          {offer.body && <span className="ml-2 opacity-70">— {offer.body}</span>}
        </p>
      </div>
    </motion.div>
  );
}

function SlideInBanner({ offer, onDismiss }: { offer: Offer; onDismiss: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 28 }}
      className="fixed bottom-6 right-6 z-[190] w-80 rounded-sm border p-5 shadow-2xl backdrop-blur-md"
      style={{
        borderColor: offer.accent_color + "60",
        background: "var(--obsidian)",
      }}
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 transition hover:opacity-100"
        style={{ color: "oklch(0.96 0.012 220 / 0.5)" }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <p
        className="mb-2 text-[9px] uppercase tracking-[0.4em]"
        style={{ color: offer.accent_color }}
      >
        {offer.title}
      </p>
      {offer.body && (
        <p className="text-sm font-light leading-relaxed" style={{ color: "oklch(0.96 0.012 220 / 0.8)" }}>
          {offer.body}
        </p>
      )}
      <OfferCta
        offer={offer}
        className="mt-4 inline-block border px-4 py-2 text-[9px] uppercase tracking-[0.35em] transition hover:bg-white/5"
      />
    </motion.aside>
  );
}

function PopupModal({ offer, onDismiss }: { offer: Offer; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[195] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-sm border p-10 text-center"
        style={{
          borderColor: offer.accent_color + "60",
          background: "var(--obsidian)",
        }}
      >
        <button
          onClick={onDismiss}
          aria-label="Close"
          className="absolute right-4 top-4 transition hover:opacity-100"
          style={{ color: "oklch(0.96 0.012 220 / 0.5)" }}
        >
          <X className="h-4 w-4" />
        </button>
        <p
          className="mb-3 text-[9px] uppercase tracking-[0.5em]"
          style={{ color: offer.accent_color }}
        >
          The Souq
        </p>
        <h3 className="font-display text-3xl italic" style={{ color: "oklch(0.96 0.012 220)" }}>
          {offer.title}
        </h3>
        {offer.body && (
          <p className="mt-4 text-sm font-light leading-relaxed" style={{ color: "oklch(0.96 0.012 220 / 0.7)" }}>
            {offer.body}
          </p>
        )}
        <OfferCta
          offer={offer}
          className="mt-8 inline-block border px-8 py-3 text-[10px] uppercase tracking-[0.4em] transition hover:bg-white/5"
        />
      </motion.div>
    </motion.div>
  );
}

const DISMISS_KEY = "tps_offers_dismissed_v1";
function loadDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveDismissed(map: Record<string, number>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch {}
}

export function OffersLayer() {
  const { data: offers = [] } = useOffers();
  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const [popupShown, setPopupShown] = useState(false);
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);
  useEffect(() => {
    if (popupShown) return;
    const t = setTimeout(() => setPopupShown(true), 1500);
    return () => clearTimeout(t);
  }, [popupShown]);

  const dismiss = (id: string) => {
    const next = { ...dismissed, [id]: Date.now() };
    setDismissed(next);
    saveDismissed(next);
  };

  const announcement = offers.find((o) => o.placement === "announcement");
  const slide = offers.find((o) => o.placement === "slide_in" && !dismissed[o.id]);
  const popup = offers.find((o) => o.placement === "popup" && !dismissed[o.id]);

  return (
    <AnimatePresence>
      {announcement && <AnnouncementBar key={announcement.id} offer={announcement} />}
      {slide && <SlideInBanner key={slide.id} offer={slide} onDismiss={() => dismiss(slide.id)} />}
      {popup && popupShown && (
        <PopupModal key={popup.id} offer={popup} onDismiss={() => dismiss(popup.id)} />
      )}
    </AnimatePresence>
  );
}

export function InlineOffers() {
  const { data: offers = [] } = useOffers();
  const inline = offers.filter((o) => o.placement === "inline");
  if (!inline.length) return null;
  return (
    <section className="relative px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-4">
        {inline.map((o) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9 }}
            className="flex flex-col items-center justify-between gap-6 rounded-sm border p-8 text-center md:flex-row md:text-left"
            style={{ borderColor: o.accent_color + "60", background: "var(--obsidian)" }}
          >
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.45em]"
                style={{ color: o.accent_color }}
              >
                {o.title}
              </p>
              {o.body && (
                <p className="mt-2 font-display text-2xl italic" style={{ color: "oklch(0.96 0.012 220 / 0.9)" }}>
                  {o.body}
                </p>
              )}
            </div>
            <OfferCta
              offer={o}
              className="inline-block border px-6 py-3 text-[10px] uppercase tracking-[0.4em] transition hover:bg-white/5"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
