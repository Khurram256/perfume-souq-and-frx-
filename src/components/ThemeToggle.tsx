import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, DEFAULT_THEME, DARK_THEME } from "./ThemeEngine";

// A simple binary light/dark toggle over the two approved themes — flips
// between Signature Ivory (light) and Midnight Navy & Champagne (dark) as a
// personal per-visitor override. It never rewrites the admin's site-wide
// default (site_content "theme.active"); it just applies a local choice for
// this browser, same as ThemeEngine's own localStorage persistence.
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute("data-theme") === DARK_THEME);
  }, []);

  const toggle = () => {
    const next = isDark ? DEFAULT_THEME : DARK_THEME;
    applyTheme(next);
    setIsDark(!isDark);
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 text-foreground/70 transition hover:border-gold/60 hover:text-gold"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
