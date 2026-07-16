import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, MessageCircle, Phone, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, waLink } from "@/lib/contact";
import { useSettings, trackEvent, getSessionId } from "@/lib/api/queries";
import { recordOrderIntent, type RecordedOrderLine } from "@/lib/api/order.functions";
import { formatPKR } from "@/lib/format";

// Builds the WhatsApp message from server-recomputed, trusted totals — never
// from client-held prices. Includes the unique order reference + customer
// phone so the maison can look the intent up in the admin dashboard.
function buildInvoice(opts: {
  orderRef: string;
  phone: string;
  name?: string;
  note?: string;
  lines: RecordedOrderLine[];
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
    `Order: *${opts.orderRef}*`,
    `Date: ${date}`,
    `Phone: ${opts.phone}`,
    ...(opts.name ? [`Name: ${opts.name}`] : []),
    "",
    "*Items*",
    ...opts.lines.map((i, idx) => {
      const discounted = i.originalPrice > i.finalPrice;
      const priceLine = discounted
        ? `Qty ${i.quantity} × ${formatPKR(i.finalPrice)} (was ${formatPKR(i.originalPrice)}${i.promotionName ? `, ${i.promotionName}` : ""}) = ${formatPKR(i.lineTotal)}`
        : `Qty ${i.quantity} × ${formatPKR(i.finalPrice)} = ${formatPKR(i.lineTotal)}`;
      return `${idx + 1}. ${i.name} (${i.sizeLabel})\n    ${priceLine}`;
    }),
    "",
    ...(opts.discount > 0 ? [`Subtotal: ${formatPKR(opts.subtotal)}`, `Discount: -${formatPKR(opts.discount)}`] : []),
    `*Total: ${formatPKR(opts.total)}*`,
    ...(opts.note ? ["", `Note: ${opts.note}`] : []),
    "",
    "Kindly confirm this order. Thank you.",
  ];
  return out.join("\n");
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

export function CartDrawer() {
  const { items, isOpen, close, setQty, remove, total, clear } = useCart();
  const { data: settings } = useSettings();
  const waNumber = settings?.whatsapp_number || "923228408507";

  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem(PHONE_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const phoneValid = phone.replace(/[^0-9]/g, "").length >= 10;
  const allHaveVariants = items.every((i) => !!i.variantId);

  const handleCheckout = async () => {
    if (!items.length || submitting) return;
    if (!phoneValid) {
      toast.error("Please enter your WhatsApp number so we can confirm your order.");
      return;
    }
    if (!allHaveVariants) {
      toast.error("Please re-add your items from a product page so we can capture the exact size.");
      return;
    }

    setSubmitting(true);
    // Open the tab synchronously so mobile popup blockers allow it; we set its
    // URL once the server has recorded the intent and returned trusted totals.
    const win = window.open("", "_blank");
    try {
      try {
        localStorage.setItem(PHONE_STORAGE_KEY, phone);
      } catch {}

      const result = await recordOrderIntent({
        data: {
          phone,
          name: name.trim() || undefined,
          note: note.trim() || undefined,
          sessionId: getSessionId(),
          items: items.map((i) => ({ variantId: i.variantId as string, quantity: i.qty })),
        },
      });

      for (const it of items) {
        trackEvent("whatsapp_click", { perfumeId: it.perfumeId, variantId: it.variantId, sourcePath: "/cart" });
      }

      const msg = buildInvoice({
        orderRef: result.orderRef,
        phone: result.phone,
        name: name.trim() || undefined,
        note: note.trim() || undefined,
        lines: result.lines,
        subtotal: result.subtotal,
        discount: result.discount,
        total: result.total,
      });
      const url = waLink(waNumber, msg);
      if (win) win.location.href = url;
      else window.location.href = url;

      toast.success(`Order ${result.orderRef} sent to WhatsApp.`);
      clear();
      setNote("");
      close();
    } catch (e) {
      if (win) win.close();
      toast.error(e instanceof Error ? e.message : "Could not create your order. Please try again.");
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed right-0 top-0 z-[130] flex h-full w-full max-w-md flex-col border-l border-border bg-background"
          >
            <header className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.5em] text-gold">Your Cart</p>
                <h3 className="mt-1 font-display text-2xl italic">Le Souq</h3>
              </div>
              <button onClick={close} className="text-foreground/60 hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-12 w-12 text-foreground/20" />
                  <p className="mt-6 font-display text-xl italic text-foreground/60">
                    Your cart awaits its first flacon.
                  </p>
                </div>
              ) : (
                <ul className="space-y-6">
                  {items.map((it) => (
                    <motion.li
                      key={it.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className="flex gap-4 border-b border-border pb-6 last:border-b-0"
                    >
                      <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-card">
                        {it.img && (
                          <img
                            src={it.img}
                            alt={it.name}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-display text-lg italic leading-tight">{it.name}</h4>
                            {it.sizeLabel && <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-foreground/40">{it.sizeLabel}</p>}
                          </div>
                          <button
                            onClick={() => remove(it.id)}
                            aria-label="Remove"
                            className="text-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center border border-border">
                            <button
                              onClick={() => setQty(it.id, it.qty - 1)}
                              className="px-2 py-1 text-foreground/70 hover:text-gold"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-3 text-sm tabular-nums">{it.qty}</span>
                            <button
                              onClick={() => setQty(it.id, it.qty + 1)}
                              className="px-2 py-1 text-foreground/70 hover:text-gold"
                              aria-label="Increase"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="flex items-baseline gap-2">
                            {it.originalPrice && it.originalPrice > it.price && (
                              <span className="text-xs text-foreground/40 line-through">{formatPKR(it.originalPrice * it.qty)}</span>
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
              )}
            </div>

            <footer className="border-t border-border px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.4em] text-foreground/60">
                  Total
                </span>
                <span className="text-gradient-gold font-display text-3xl italic">
                  {formatPKR(total)}
                </span>
              </div>

              {items.length > 0 && (
                <div className="mb-4 space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.3em] text-foreground/50">
                      WhatsApp Number <span className="text-gold">*</span>
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03XX XXXXXXX"
                      aria-label="Your WhatsApp number"
                      className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-gold focus:outline-none"
                    />
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional)"
                    aria-label="Your name"
                    className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-gold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    aria-label="Order note"
                    className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-gold focus:outline-none"
                  />
                </div>
              )}

              <button
                disabled={!items.length || submitting}
                onClick={handleCheckout}
                data-magnetic
                className="btn-gold w-full py-4 text-[10px] uppercase tracking-[0.4em] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Preparing…" : "Send Order via WhatsApp"}
              </button>
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-foreground/40">
                Records your order &amp; opens WhatsApp to confirm. No online payment.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4">
                <a
                  href={waLink(waNumber, "Hello, I'd like to ask about an order.")}
                  target="_blank"
                  rel="noreferrer"
                  data-magnetic
                  className="flex items-center justify-center gap-2 rounded-sm border border-gold/30 py-3 text-[9px] uppercase tracking-[0.3em] text-gold hover:border-gold hover:bg-gold/10"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  data-magnetic
                  className="flex items-center justify-center gap-2 rounded-sm border border-gold/30 py-3 text-[9px] uppercase tracking-[0.3em] text-gold hover:border-gold hover:bg-gold/10"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              </div>
              <p className="mt-2 text-center text-[10px] tracking-[0.25em] text-foreground/50">
                {CONTACT_PHONE_DISPLAY}
              </p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
