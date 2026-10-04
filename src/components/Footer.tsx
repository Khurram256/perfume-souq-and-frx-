import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Marquee } from "./Marquee";
import { DEVELOPER_NAME, DEVELOPER_URL, INSTAGRAM_URL } from "../lib/contact";

const linkCls =
  "inline-flex min-h-9 items-center text-[10px] uppercase tracking-[0.3em] transition-colors hover:text-[var(--gold)]";

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden border-t border-border pt-16 pb-28 text-center sm:pb-24 lg:pb-10"
      style={{ background: "var(--navy-deep)" }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "var(--gradient-gold)" }}
      />

      <Marquee
        items={["The Perfume Souq", "Authentic Fragrances", "Sourced with Care"]}
        className="mb-16 opacity-70"
        onDark
      />

      <div className="flex justify-center">
        <Logo size={72} withText={false} />
      </div>
      <h2 className="mt-6 font-display text-4xl italic tracking-[0.18em] text-gradient-gold md:text-6xl">
        THE PERFUME SOUQ
      </h2>
      <p className="mt-3 font-display text-sm italic" style={{ color: "oklch(0.96 0.012 220 / 0.6)" }}>by Khurram Shabbir</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.4em]" style={{ color: "oklch(0.96 0.012 220 / 0.4)" }}>Est. 2026</p>

      {/* Site-wide links: gives every page a crawlable path to the shop, the
          gender category pages and the brand index. */}
      <nav
        aria-label="Footer"
        className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-1 px-6"
        style={{ color: "oklch(0.96 0.012 220 / 0.6)" }}
      >
        <Link to="/shop" className={linkCls}>
          Shop All
        </Link>
        <Link to="/shop" search={{ gender: "men" }} className={linkCls}>
          Men
        </Link>
        <Link to="/shop" search={{ gender: "women" }} className={linkCls}>
          Women
        </Link>
        <Link to="/shop" search={{ gender: "unisex" }} className={linkCls}>
          Unisex
        </Link>
        <Link to="/brands" className={linkCls}>
          Brands
        </Link>
        <Link to="/offers" className={linkCls}>
          Offers
        </Link>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
          Instagram
        </a>
      </nav>

      <p className="mt-10 text-[10px] uppercase tracking-[0.4em]" style={{ color: "oklch(0.96 0.012 220 / 0.3)" }}>
        © The Perfume Souq · All rights reserved
      </p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.3em] sm:text-xs" style={{ color: "oklch(0.96 0.012 220 / 0.55)" }}>
        Powered by{" "}
        <a
          href={DEVELOPER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--gold)] underline-offset-4 transition-colors duration-300 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {DEVELOPER_NAME}
        </a>
      </p>
    </footer>
  );
}
