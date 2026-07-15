import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Logo } from "./Logo";
import { CartButton } from "./CartDrawer";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

const NAV_LINKS: { label: string; to: string; search?: Record<string, string> }[] = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Men", to: "/shop", search: { gender: "men" } },
  { label: "Women", to: "/shop", search: { gender: "women" } },
  { label: "Unisex", to: "/shop", search: { gender: "unisex" } },
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
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 60);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${
        scrolled
          ? "bg-background/70 backdrop-blur-xl border-b border-border py-3"
          : "bg-transparent py-6"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-12">
        <div className="flex-1">
          <Logo />
        </div>

        {/* Center zone: switches to the drawer at xl (1280px) rather than lg (1024px) —
            at 1024px there isn't reliably enough room for 9 links + logo + icons
            without the longest label ("Find Your Scent") wrapping onto its own line. */}
        <div className="hidden shrink-0 items-center gap-6 xl:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              search={l.search}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-gold" }}
              className="link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-foreground/70 transition-colors hover:text-gold"
            >
              {l.label}
            </Link>
          ))}
          {ANCHOR_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.3em] text-foreground/70 transition-colors hover:text-gold"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <ThemeToggle />
          <AccountMenu />
          <CartButton />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 text-foreground/70 xl:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs border-l border-border bg-background">
              <div className="mt-10 flex flex-col gap-6">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    search={l.search}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-light uppercase tracking-[0.2em] text-foreground/80 hover:text-gold"
                  >
                    {l.label}
                  </Link>
                ))}
                {ANCHOR_LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-light uppercase tracking-[0.2em] text-foreground/80 hover:text-gold"
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
