import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Minus, MessageCircle, Phone, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, WHATSAPP_NUMBER, waLink } from "@/lib/contact";
import { useSettings, trackEvent, getSessionId } from "@/lib/api/queries";
import { recordOrderIntent } from "@/lib/api/order.functions";
import { ORDER_UNAVAILABLE_MESSAGE } from "@/lib/order-errors";
import { formatPKR } from "@/lib/format";

type InvoiceLine = {
  name: string;
  sizeLabel: string;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  lineTotal: number;
  promotionName: string | null;
};

// Builds the WhatsApp message. Normally from server-recomputed, trusted
// totals with the unique order reference; if the order service is down it is
// built from the cart instead and says so, so the maison knows to confirm.
function buildInvoice(opts: {
  orderRef?: string;
  phone: string;
  name?: string;
  address?: string;
  locationLink?: string;
  note?: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  total: number;
}) {
  const date = new Date().toLocaleString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const out = [
    "*THE PERFUME SOUQ*",
    "_by Khurram Shabbir_",
    "",
    opts.orderRef ? `Order: *${opts.orderRef}*` : "Order: (reference to be confirmed)",
    `Date: ${date}`,
    `Phone: ${opts.phone}`,
    ...(opts.name ? [`Name: ${opts.name}`] : []),
    ...(opts.address ? [`Address: ${opts.address}`] : []),
    ...(opts.locationLink ? [`Location: ${opts.locationLink}`] : []),
    "",
    "*Items*",
    ...opts.lines.map((i, idx) => {
      const discounted = i.originalPrice > i.finalPrice;
      const priceLine = discounted
        ? `Qty ${i.quantity} × ${formatPKR(i.finalPrice)} (was ${formatPKR(i.originalPrice)}${i.promotionName ? `, ${i.promotionName}` : ""}) = ${formatPKR(i.lineTotal)}`
        : `Qty ${i.quantity} × ${formatPKR(i.finalPrice)} = ${formatPKR(i.lineTotal)}`;
      const size = i.sizeLabel ? ` (${i.sizeLabel})` : "";
      return `${idx + 1}. ${i.name}${size}\n    ${priceLine}`;
    }),
    "",
    ...(opts.discount > 0
      ? [`Subtotal: ${formatPKR(opts.subtotal)}`, `Discount: -${formatPKR(opts.discount)}`]
      : []),
    `*Total: ${formatPKR(opts.total)}*`,
    ...(opts.note ? ["", `Note: ${opts.note}`] : []),
    "",
    opts.orderRef
      ? "Kindly confirm this order. Thank you."
      : "Kindly confirm availability and final prices. Thank you.",
  ];
  return out.join("\n");
}

function cartToInvoiceLines(items: CartItem[]): InvoiceLine[] {
  return items.map((i) => ({
    name: i.name,
    sizeLabel: i.sizeLabel ?? "",
    quantity: i.qty,
    originalPrice: i.originalPrice ?? i.price,
    finalPrice: i.price,
    lineTotal: i.price * i.qty,
    promotionName: i.promotionName ?? null,
  }));
}

// Touch devices hand off to the WhatsApp app by navigating the current tab
// (the most reliable path on iOS and Android — pop-ups opened after a network
// call get blocked there). Desktop keeps the shop open and uses a new tab for
// WhatsApp Web, opened synchronously within the click so it isn't blocked.
function isTouchDevice() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
}

function openPendingWindow(): Window | null {
  if (isTouchDevice()) return null;
  const win = window.open("", "_blank");
  if (!win) return null;
  try {
    win.opener = null;
    win.document.title = "Opening WhatsApp…";
    win.document.body.style.cssText =
      "margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f8f4ee;color:#6b5a3e";
    win.document.body.textContent = "Preparing your order for WhatsApp…";
  } catch {
    // Cross-browser quirk writing to a blank tab — harmless, it still navigates.
  }
  return win;
}

function goTo(url: string, win: Window | null) {
  if (win && !win.closed) win.location.href = url;
  else window.location.href = url;
}

export function CartButton() {
  const { count, toggle } = useCart();
  return (
    <button
      onClick={toggle}
      data-magnetic
      data-cart-anchor
      aria-label="Open cart"
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 text-gold transition hover:bg-gold/10"
    >
      <ShoppingBag className="h-4 w-4" />
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 16 }}
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-medium text-obsidian"
        >
          {count}
        </motion.span>
      )}
    </button>
  );
}

const PHONE_STORAGE_KEY = "tps_customer_phone_v1";

// 16px text on inputs stops iOS Safari from zooming the page on focus.
const inputCls =
  "w-full rounded-sm border border-border bg-background px-3 py-3 text-base text-foreground placeholder:text-foreground/40 focus:border-gold focus:outline-none sm:text-sm";
const labelCls = "mb-1 block text-[10px] uppercase tracking-[0.3em] text-foreground/55";

export function CartDrawer() {
  const { items, isOpen, close, setQty, remove, total, clear } = useCart();
  const { data: settings } = useSettings();
  const waNumber = settings?.whatsapp_number || WHATSAPP_NUMBER;
  const closeRef = useRef<HTMLButtonElement>(null);
  // close() is recreated whenever the cart changes; keep the latest in a ref
  // so the modal effect below only runs on open/close, not on every qty tap.
  const closeFnRef = useRef(close);
  closeFnRef.current = close;

  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem(PHONE_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locationLink, setLocationLink] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const phoneValid = phone.replace(/[^0-9]/g, "").length >= 10;

  // Modal behaviour: lock the page behind the drawer (otherwise it scrolls
  // under your thumb on phones), close on Escape, and move focus inside.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFnRef.current();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const resetAfterSend = () => {
    clear();
    setNote("");
    setAddress("");
    setLocationLink("");
    close();
  };

  const handleCheckout = async () => {
    if (!items.length || submitting) return;
    if (!name.trim()) {
      toast.error("Please enter your name so we know who the order is for.");
      return;
    }
    if (!phoneValid) {
      toast.error("Please enter your WhatsApp number so we can confirm your order.");
      return;
    }

    setSubmitting(true);
    const win = openPendingWindow();
    const customer = {
      name: name.trim() || undefined,
      address: address.trim() || undefined,
      locationLink: locationLink.trim() || undefined,
      note: note.trim() || undefined,
    };
    try {
      localStorage.setItem(PHONE_STORAGE_KEY, phone);
    } catch {
      // Private browsing — the number just won't be remembered next time.
    }

    try {
      const result = await recordOrderIntent({
        data: {
          phone,
          ...customer,
          sessionId: getSessionId(),
          items: items.map((i) => ({ perfumeId: i.perfumeId, variantId: i.variantId, quantity: i.qty })),
        },
      });

      for (const it of items) {
        trackEvent("whatsapp_click", {
          perfumeId: it.perfumeId,
          variantId: it.variantId,
          sourcePath: "/cart",
        });
      }

      const msg = buildInvoice({
        orderRef: result.orderRef,
        phone: result.phone,
        ...customer,
        lines: result.lines,
        subtotal: result.subtotal,
        discount: result.discount,
        total: result.total,
      });
      toast.success(`Order ${result.orderRef} ready — opening WhatsApp.`);
      goTo(waLink(waNumber, msg), win);
      resetAfterSend();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const serviceDown = message === ORDER_UNAVAILABLE_MESSAGE || e instanceof TypeError || !message;
      if (serviceDown) {
        // Never lose a sale to a server hiccup: send the cart as it stands and
        // let the maison confirm the final prices on WhatsApp.
        const lines = cartToInvoiceLines(items);
        const subtotal = lines.reduce((s, l) => s + l.originalPrice * l.quantity, 0);
        const msg = buildInvoice({
          phone,
          ...customer,
          lines,
          subtotal,
          discount: Math.max(0, subtotal - total),
          total,
        });
        toast.message("Opening WhatsApp — we'll confirm your order there.");
        goTo(waLink(waNumber, msg), win);
        resetAfterSend();
      } else {
        if (win) win.close();
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed right-0 top-0 z-[130] flex h-[100dvh] w-full max-w-md flex-col border-l border-border bg-background"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.5em] text-gold">Your Cart</p>
                <h2 className="mt-1 font-display text-2xl italic">Le Souq</h2>
              </div>
              <button
                ref={closeRef}
                onClick={close}
                aria-label="Close cart"
                className="-mr-2 flex h-11 w-11 items-center justify-center text-foreground/60 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* One scroll area for items AND the order form — a separately
                scrolling item list got squeezed to a sliver on small phones
                once the form took the rest of the height. */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {items.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center py-10 text-center">
                  <ShoppingBag className="h-12 w-12 text-foreground/20" />
                  <p className="mt-6 font-display text-xl italic text-foreground/60">
                    Your cart awaits its first flacon.
                  </p>
                  <Link
                    to="/shop"
                    onClick={close}
                    className="btn-gold mt-8 inline-block px-8 py-3.5 text-[10px] uppercase tracking-[0.4em]"
                  >
                    Browse the Collection
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="space-y-5">
                    {items.map((it) => (
                      <motion.li
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        className="flex gap-4 border-b border-border pb-5"
                      >
                        <div className="flex h-24 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm bg-card">
                          {it.img ? (
                            <img src={it.img} alt={it.name} className="h-full w-full object-contain" />
                          ) : (
                            <ShoppingBag className="h-6 w-6 text-foreground/20" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="break-words font-display text-lg italic leading-tight">
                                {it.name}
                              </h3>
                              {it.sizeLabel && (
                                <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-foreground/55">
                                  Size · {it.sizeLabel}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => remove(it.id)}
                              aria-label={`Remove ${it.name}${it.sizeLabel ? ` ${it.sizeLabel}` : ""}`}
                              className="-mr-2 -mt-2 flex h-10 w-10 flex-shrink-0 items-center justify-center text-foreground/45 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center border border-border">
                              <button
                                onClick={() => setQty(it.id, it.qty - 1)}
                                className="flex h-9 w-9 items-center justify-center text-foreground/70 hover:text-gold"
                                aria-label={`Decrease quantity of ${it.name}`}
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-[2rem] text-center text-sm tabular-nums" aria-live="polite">
                                {it.qty}
                              </span>
                              <button
                                onClick={() => setQty(it.id, it.qty + 1)}
                                className="flex h-9 w-9 items-center justify-center text-foreground/70 hover:text-gold"
                                aria-label={`Increase quantity of ${it.name}`}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="flex items-baseline gap-2">
                              {it.originalPrice && it.originalPrice > it.price && (
                                <span className="text-xs text-foreground/40 line-through">
                                  {formatPKR(it.originalPrice * it.qty)}
                                </span>
                              )}
                              <span className="text-gradient-gold font-display text-lg">
                                {formatPKR(it.price * it.qty)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  <div className="mt-6 space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-gold">Your Details</p>
                    <label className="block">
                      <span className={labelCls}>
                        WhatsApp Number <span className="text-gold">*</span>
                      </span>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={20}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="03XX XXXXXXX"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>
                        Your Name <span className="text-gold">*</span>
                      </span>
                      <input
                        type="text"
                        autoComplete="name"
                        maxLength={120}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Delivery Address</span>
                      <input
                        type="text"
                        autoComplete="street-address"
                        maxLength={500}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Optional"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Location Link</span>
                      <input
                        type="url"
                        inputMode="url"
                        maxLength={500}
                        value={locationLink}
                        onChange={(e) => setLocationLink(e.target.value)}
                        placeholder="Google Maps link (optional)"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Note</span>
                      <input
                        type="text"
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional"
                        className={inputCls}
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="mt-8 border-t border-border pt-5">
                <p className="mb-3 text-center text-[10px] uppercase tracking-[0.3em] text-foreground/50">
                  Questions? Talk to us
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={waLink(waNumber, "Hello, I'd like to ask about an order.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-sm border border-gold/30 text-[10px] uppercase tracking-[0.3em] text-gold hover:border-gold hover:bg-gold/10"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                  <a
                    href={`tel:${CONTACT_PHONE_TEL}`}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-sm border border-gold/30 text-[10px] uppercase tracking-[0.3em] text-gold hover:border-gold hover:bg-gold/10"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                </div>
                <p className="mt-2 text-center text-[10px] tracking-[0.25em] text-foreground/55">
                  {CONTACT_PHONE_DISPLAY}
                </p>
              </div>
            </div>

            {items.length > 0 && (
              <footer className="border-t border-border bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.4em] text-foreground/60">Total</span>
                  <span className="text-gradient-gold font-display text-3xl italic">{formatPKR(total)}</span>
                </div>
                <button
                  disabled={submitting}
                  onClick={handleCheckout}
                  className="btn-gold flex w-full items-center justify-center gap-2 py-4 text-[10px] uppercase tracking-[0.4em] disabled:cursor-wait disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {submitting ? "Preparing…" : "Send Order via WhatsApp"}
                </button>
                <p className="mt-2 text-center text-[10px] tracking-[0.15em] text-foreground/50">
                  We confirm every order on WhatsApp. No online payment.
                </p>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
