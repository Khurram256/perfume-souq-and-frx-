import { motion } from "framer-motion";
import { Instagram, MessageCircle } from "lucide-react";
import { useSettings } from "@/lib/api/queries";

export function CircleOfScent() {
  const { data: settings } = useSettings();
  const communityLink = settings?.community_link?.trim();
  const igHandle = settings?.instagram_handle || "theperfumesouq.pk";
  const igUrl = `https://instagram.com/${igHandle.replace(/^@/, "")}`;

  return (
    <section id="discovery" className="section-pad relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.78 0.09 228 / 0.10), transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <span className="section-index mb-6 inline-block text-[14vw] leading-none md:text-[6vw]">
          07
        </span>
        <p className="label-eyebrow mb-6">L'Invitation</p>
        <h2 className="heading-section" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
          Join the <span className="text-gradient-gold">Circle of Scent</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-sm font-light leading-relaxed text-foreground/65">
          A private circle for those who treat fragrance as language. Early releases, quiet
          previews, and the founder's notes — delivered in confidence.
        </p>

        <div className="mx-auto mt-12 h-px w-24" style={{ background: "var(--gradient-gold)" }} />

        <div className="mx-auto mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {communityLink && (
            <a
              href={communityLink}
              target="_blank"
              rel="noreferrer"
              data-magnetic
              className="btn-gold flex items-center gap-3 px-10 py-4 text-[10px] uppercase tracking-[0.4em]"
            >
              <MessageCircle className="h-4 w-4" />
              Join WhatsApp Community
            </a>
          )}
          <a
            href={igUrl}
            target="_blank"
            rel="noreferrer"
            data-magnetic
            className="btn-gold flex items-center gap-3 px-10 py-4 text-[10px] uppercase tracking-[0.4em]"
          >
            <Instagram className="h-4 w-4" />
            Follow on Instagram
          </a>
        </div>
      </motion.div>
    </section>
  );
}
