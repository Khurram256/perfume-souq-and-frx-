import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from "@/lib/contact";
import { useMedia, trackEvent } from "@/lib/api/queries";

export function InstagramFeed() {
  const { data: items = [], isLoading } = useMedia("souq_in_motion");

  if (!isLoading && !items.length) return null;

  return (
    <section className="section-pad relative border-y border-border px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="flex items-end gap-6">
            <span className="section-index hidden text-[6vw] leading-none md:block">09</span>
            <div>
              <p className="label-eyebrow mb-5">Sur Instagram</p>
              <h2 className="heading-section" style={{ fontSize: "clamp(2rem, 4.5vw, 4rem)" }}>
                The <span className="text-gradient-gold">Souq</span> in motion
              </h2>
            </div>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            data-magnetic
            className="btn-gold inline-flex items-center gap-3 px-8 py-4 text-[10px] uppercase tracking-[0.4em]"
          >
            <Instagram className="h-4 w-4" /> {INSTAGRAM_HANDLE}
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {items.map((item, i) => (
            <motion.a
              key={item.id}
              href={item.link_url || INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("ad_click", { sourcePath: "/souq-in-motion", metadata: { mediaId: item.id } })}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: (i % 7) * 0.05 }}
              className="group relative block aspect-square overflow-hidden rounded-sm border border-gold/15 bg-obsidian"
              data-magnetic
            >
              {item.kind === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" muted loop autoPlay playsInline />
              ) : (
                <img
                  src={item.url}
                  alt={item.alt_text || item.caption || "The Perfume Souq"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
              )}
              {item.caption && (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <p className="font-display text-xs italic text-foreground/95">{item.caption}</p>
                </div>
              )}
              <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 opacity-0 backdrop-blur transition-opacity duration-500 group-hover:opacity-100">
                <Instagram className="h-3 w-3 text-gold" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
