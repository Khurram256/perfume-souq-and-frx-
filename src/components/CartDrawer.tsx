import { AnimatePresence, motion } from "framer-motion";
import { Minus, MessageCircle, Phone, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, waLink } from "@/lib/contact";
import { useSettings } from "@/lib/api/queries";
import { formatPKR } from "@/lib/format";

function buildInvoice(items: { name: string; qty: number; price: number }[], total: number) {
  const date = new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
  const orderId = "TPS-" + Date.now().toString(36).toUpperCase();
  const lines = [
    "*THE PERFUME SOUQ*",
    "_By Khurram Shabbir_",
    "",
    `Order: *${orderId}*`,
    `Date: ${date}`,
    "",
    "*Items*",
    ...items.map(
      (i, idx) =>
        `${idx + 1}. ${i.name}\n    Qty ${i.qty} × ${formatPKR(i.price)} = ${formatPKR(i.qty * i.price)}`
    ),
    "",
    `*Total: ${formatPKR(total)}*`,
    "",
    "Kindly confirm this order. Thank you.",
  ];
  return lines.join("\n");
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

export function CartDrawer() {
  const { items, isOpen, close, setQty, remove, total } = useCart();
  const { data: settings } = useSettings();
  const waNumber = settings?.whatsapp_number || "923228408507";

  const handleCheckout = () => {
    if (!items.length) return;
    const msg = buildInvoice(items, total);
    window.open(waLink(waNumber, msg), "_blank");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="fixed right-0 top-0 z-[130] flex h-full w-full max-w-md flex-col border-l border-border bg-background"
          >
            <header className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.5em] text-gold">Your Cart</p>
                <h3 className="mt-1 font-display text-2xl italic">Le Souq</h3>
              </div>
              <button onClick={close} className="text-foreground/60 hover:text-foreground"><X className="h-5 w-5" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-12 w-12 text-foreground/20" />
                  <p className="mt-6 font-display text-xl italic text-foreground/60">Your cart awaits its first flacon.</p>
                </div>
              ) : (
                <ul className="space-y-6">
                  {items.map((it) => (
                    <motion.li key={it.id} layout
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className="flex gap-4 border-b border-border pb-6 last:border-b-0"
                    >
                      <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-card">
                        {it.img && <img src={it.img} alt={it.name} className="h-full w-full object-contain" />}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-display text-lg italic leading-tight">{it.name}</h4>
                          <button onClick={() => remove(it.id)} aria-label="Remove" className="text-foreground/40 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center border border-border">
                            <button onClick={() => setQty(it.id, it.qty - 1)} className="px-2 py-1 text-foreground/70 hover:text-gold" aria-label="Decrease"><Minus className="h-3 w-3" /></button>
                            <span className="px-3 text-sm tabular-nums">{it.qty}</span>
                            <button onClick={() => setQty(it.id, it.qty + 1)} className="px-2 py-1 text-foreground/70 hover:text-gold" aria-label="Increase"><Plus className="h-3 w-3" /></button>
                          </div>
                          <span className="text-gradient-gold font-display text-lg">{formatPKR(it.price * it.qty)}</span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-border px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.4em] text-foreground/60">Total</span>
                <span className="text-gradient-gold font-display text-3xl italic">{formatPKR(total)}</span>
              </div>
              <button
                disabled={!items.length}
                onClick={handleCheckout}
                data-magnetic
                className="btn-gold w-full py-4 text-[10px] uppercase tracking-[0.4em] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send Invoice via WhatsApp
              </button>
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em] text-foreground/40">
                Sends a formatted invoice to the maison on WhatsApp.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4">
                <a href={waLink(waNumber, "Hello, I'd like to ask about an order.")} target="_blank" rel="noreferrer" data-magnetic
                  className="flex items-center justify-center gap-2 rounded-sm border border-gold/30 py-3 text-[9px] uppercase tracking-[0.3em] text-gold hover:border-gold hover:bg-gold/10">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <a href={`tel:${CONTACT_PHONE_TEL}`} data-magnetic
                  className="flex items-center justify-center gap-2 rounded-sm border border-gold/30 py-3 text-[9px] uppercase tracking-[0.3em] text-gold hover:border-gold hover:bg-gold/10">
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              </div>
              <p className="mt-2 text-center text-[10px] tracking-[0.25em] text-foreground/50">{CONTACT_PHONE_DISPLAY}</p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
