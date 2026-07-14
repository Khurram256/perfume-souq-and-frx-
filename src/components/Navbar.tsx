import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { CartButton } from "./CartDrawer";
import { AccountMenu } from "./AccountMenu";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
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
        <Logo />
        <div className="flex items-center gap-4">
          <span className="hidden text-[10px] uppercase tracking-[0.4em] text-foreground/50 md:inline">
            Est. 2026
          </span>
          <AccountMenu />
          <CartButton />
        </div>
      </nav>
    </header>
  );
}
