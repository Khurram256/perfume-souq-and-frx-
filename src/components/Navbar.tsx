import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { Logo } from "./Logo";
import { CartButton } from "./CartDrawer";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

// Men/Women/Unisex/Brands are shop FILTERS, not primary navigation
// destinations — reachable via the Shop page's filter panel, not the top
// nav. Keeping the nav itself to a short, honest set of real destinations
// means it comfortably fits without ever needing a drawer on desktop or
// tablet; the drawer is reserved for genuinely small mobile widths only.
const NAV_LINKS: { label: string; to: string; search?: Record<string, string> }[] = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Brands", to: "/brands" },
  { label: "Offers", to: "/offers" },
];

const ANCHOR_LINKS = [
  { label: "Find Your Scent", href: "/#quiz" },
  { label: "Compare", href: "/#comparison" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Sticky nav gets a deep navy treatment on scroll in BOTH themes — the
  // previous version followed the theme's own background var, which meant
  // a nearly-white translucent bar in Signature Ivory (low contrast, felt
  // washed out). Since the background is forced dark on scroll only, link
  // text is forced to a light color here too — same rationale as the
  // always-dark About/Footer/Signature blocks elsewhere on the site.
  const linkColor = scrolled ? { color: "oklch(0.96 0.012 220 / 0.75)" } : undefined;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${scrolled ? "backdrop-blur-xl border-b border-gold/15 py-3" : "bg-transparent py-6"}`}
      style={scrolled ? { background: "oklch(0.11 0.03 258 / 0.82)" } : undefined}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-12">
        <div className="min-w-0 flex-1">
          <Logo forceLight={scrolled} />
        </div>

        {/* Center zone: switches to the drawer below lg (1024px). The nav is
            short enough now (Home/Shop/Brands/Offers + 2 anchors) that it
            comfortably fits at lg and up without wrapping. */}
        <div className="hidden shrink-0 items-center gap-6 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              search={l.search}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={scrolled ? undefined : { className: "text-gold" }}
              style={linkColor}
              className={`link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.3em] transition-colors hover:text-gold ${scrolled ? "" : "text-foreground/70"}`}
            >
              {l.label}
            </Link>
          ))}
          {ANCHOR_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={linkColor}
              className={`link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.3em] transition-colors hover:text-gold ${scrolled ? "" : "text-foreground/70"}`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-1.5 sm:flex-1 sm:gap-3">
          <Link
            to="/shop"
            hash="search"
            aria-label="Search perfumes"
            style={linkColor}
            className={`hidden h-11 w-11 items-center justify-center rounded-full border border-gold/25 transition hover:border-gold/60 hover:text-gold sm:flex ${scrolled ? "" : "text-foreground/70"}`}
          >
            <Search className="h-3.5 w-3.5" />
          </Link>
          <ThemeToggle forceLight={scrolled} />
          <AccountMenu />
          <CartButton />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                style={linkColor}
                className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gold/25 lg:hidden ${scrolled ? "" : "text-foreground/70"}`}
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full max-w-xs border-l border-border bg-background"
            >
              <form
                role="search"
                className="relative mt-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = menuQuery.trim();
                  setMobileOpen(false);
                  navigate({ to: "/shop", search: q ? { q } : {} });
                }}
              >
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
                />
                <input
                  type="search"
                  enterKeyHint="search"
                  value={menuQuery}
                  onChange={(e) => setMenuQuery(e.target.value)}
                  placeholder="Search perfumes or brands"
                  aria-label="Search perfumes or brands"
                  maxLength={80}
                  className="w-full rounded-sm border border-border bg-background py-3 pl-10 pr-3 text-base text-foreground placeholder:text-foreground/40 focus:border-gold focus:outline-none"
                />
              </form>
              <div className="mt-6 flex flex-col gap-2">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    search={l.search}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-lg font-light uppercase tracking-[0.2em] text-foreground/80 hover:text-gold"
                  >
                    {l.label}
                  </Link>
                ))}
                {ANCHOR_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-lg font-light uppercase tracking-[0.2em] text-foreground/80 hover:text-gold"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
