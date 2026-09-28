import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Phone, X, HelpCircle } from "lucide-react";
import { WHATSAPP_NUMBER, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, waLink } from "@/lib/contact";
import { useSettings } from "@/lib/api/queries";

export function ContactButton() {
  const [open, setOpen] = useState(false);
  // Same source of truth as the cart and product pages: the admin-editable
  // number, falling back to the official one.
  const { data: settings } = useSettings();
  const waNumber = settings?.whatsapp_number || WHATSAPP_NUMBER;
  return (
    <div className="fixed bottom-4 right-4 z-[80] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="mb-3 w-72 max-w-[calc(100vw-2rem)] rounded-sm border border-gold/30 bg-background/95 p-6 backdrop-blur-xl"
            style={{ boxShadow: "var(--shadow-deep), var(--shadow-gold)" }}
          >
            <p className="mb-1 text-[10px] uppercase tracking-[0.4em] text-gold">À votre service</p>
            <h4 className="mb-5 font-display text-2xl italic">How may we assist?</h4>
            <a
              href={waLink(waNumber, "Hello, I have a question about The Perfume Souq.")}
              target="_blank"
              rel="noopener noreferrer"
              data-magnetic
              className="btn-gold mb-3 flex w-full items-center justify-center gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.35em]"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </a>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              data-magnetic
              className="btn-gold flex w-full items-center justify-center gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.35em]"
            >
              <Phone className="h-4 w-4" />
              Call {CONTACT_PHONE_DISPLAY}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        data-magnetic
        aria-label={open ? "Close contact options" : "Contact us"}
        aria-expanded={open}
        className="btn-gold flex h-14 w-14 items-center justify-center gap-3 rounded-full text-[10px] uppercase tracking-[0.35em] sm:w-auto sm:px-6"
        style={{ boxShadow: "var(--shadow-gold)" }}
      >
        {open ? <X className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
        <span className="hidden sm:inline">{open ? "Close" : "Contact Us"}</span>
      </button>
    </div>
  );
}
