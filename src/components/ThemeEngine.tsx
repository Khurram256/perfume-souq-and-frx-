import { useEffect } from "react";
import { useContent } from "@/lib/api/queries";

export const THEME_STORAGE_KEY = "tps_theme_v1";

export const THEMES = [
  { id: "obsidian-platinum", label: "Obsidian & Platinum", swatch: ["oklch(0.11 0.018 252)", "oklch(0.78 0.09 228)"] },
  { id: "ivory-gold", label: "Ivory White & Soft Gold", swatch: ["oklch(0.97 0.012 75)", "oklch(0.68 0.13 72)"] },
  { id: "midnight-champagne", label: "Midnight Navy & Champagne", swatch: ["oklch(0.15 0.045 262)", "oklch(0.82 0.07 82)"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function applyTheme(id: string) {
  if (id === "obsidian-platinum" || !id) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {}
}

// Inline script string — inject before hydration so the correct theme paints
// immediately instead of flashing the default, then the DB value (source of
// truth) reconciles once it loads.
export const themeBootScript = `
try {
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if (t && t !== 'obsidian-platinum') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

// Reconciles the live DB-selected theme (site_content key "theme.active")
// with what's applied — keeps every tab in sync with the admin's choice.
export function ThemeEngine() {
  const active = useContent("theme.active", "obsidian-platinum");
  useEffect(() => {
    applyTheme(active);
  }, [active]);
  return null;
}
