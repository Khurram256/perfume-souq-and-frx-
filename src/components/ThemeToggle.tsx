import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, DEFAULT_THEME, DARK_THEME } from "./ThemeEngine";

// A simple binary light/dark toggle over the two approved themes — flips
// between Signature Ivory (light) and Midnight Navy & Champagne (dark) as a
// personal per-visitor override. It never rewrites the admin's site-wide
// default (site_content "theme.active"); it just applies a local choice for
// this browser, same as ThemeEngine's own localStorage persistence.
// `forceLight` is for placing this over a background that's forced dark
// regardless of the active theme (e.g. the sticky nav's scrolled navy
// bar) — without it, the icon would follow text-foreground and go dark-on-
// dark in the light theme.
export function ThemeToggle({ forceLight }: { forceLight?: boolean } = {}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.getAttribute("data-theme") === DARK_THEME);
    sync();
    // The header and the mobile menu each render a toggle; keep both icons
    // in step with whichever one was pressed.
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const dark = document.documentElement.getAttribute("data-theme") === DARK_THEME;
    applyTheme(dark ? DEFAULT_THEME : DARK_THEME);
    setIsDark(!dark);
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={forceLight ? { color: "oklch(0.96 0.012 220 / 0.75)" } : undefined}
      className={`flex h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-full border border-gold/25 transition hover:border-gold/60 hover:text-gold ${forceLight ? "" : "text-foreground/70"}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
