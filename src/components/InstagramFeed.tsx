import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from "@/lib/contact";
import ad1 from "@/assets/ad-1.jpg";
import ad2 from "@/assets/ad-2.jpg";
import ad3 from "@/assets/ad-3.jpg";
import ad4 from "@/assets/ad-4.jpg";
import ad5 from "@/assets/ad-5.jpg";
import p3 from "@/assets/perfume-3.png";
import p10 from "@/assets/perfume-10.png";

const posts = [
  { img: ad1, caption: "Nuit d'Obsidienne — a quiet command." },
  { img: ad2, caption: "Gold doesn't shout. It glows." },
  { img: ad3, caption: "Rose Femme. Velvet over silence." },
  { img: ad4, caption: "One petal. One signature." },
  { img: ad5, caption: "The art of arrival." },
  { img: p3, caption: "The Rose, reframed." },
  { img: p10, caption: "Vanille Cristalline. Warm as embers." },
];

export function InstagramFeed() {
  return (
    <section className="relative border-y border-border px-6 py-32 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="flex items-end gap-6">
            <span className="section-index hidden text-[6vw] leading-none md:block">09</span>
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.5em] text-gold">Sur Instagram</p>
              <h2 className="font-display text-4xl italic leading-none md:text-5xl">
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
          {posts.map((post, i) => (
            <motion.a
              key={i}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: (i % 7) * 0.05 }}
              className="group relative block aspect-square overflow-hidden rounded-sm border border-gold/15 bg-obsidian"
              data-magnetic
            >
              <img
                src={post.img}
                alt={post.caption}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <p className="font-display text-xs italic text-foreground/95">{post.caption}</p>
              </div>
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
