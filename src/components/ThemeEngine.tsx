import { useEffect } from "react";
import { useContent } from "@/lib/api/queries";

export const THEME_STORAGE_KEY = "tps_theme_v1";
export const DEFAULT_THEME = "signature-ivory";

export const THEMES = [
  { id: "signature-ivory", label: "Signature Ivory (Default)", swatch: ["oklch(0.975 0.010 80)", "oklch(0.66 0.12 74)"] },
  { id: "obsidian-platinum", label: "Obsidian & Platinum", swatch: ["oklch(0.11 0.018 252)", "oklch(0.78 0.09 228)"] },
  { id: "midnight-champagne", label: "Midnight Navy & Champagne", swatch: ["oklch(0.15 0.045 262)", "oklch(0.82 0.07 82)"] },
  { id: "luxury-white", label: "Luxury White", swatch: ["oklch(0.99 0.003 90)", "oklch(0.72 0.12 80)"] },
  { id: "pearl-light", label: "Pearl Light", swatch: ["oklch(0.97 0.008 30)", "oklch(0.75 0.09 25)"] },
  { id: "minimal-platinum", label: "Minimal Platinum", swatch: ["oklch(0.98 0.002 260)", "oklch(0.70 0.01 260)"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function applyTheme(id: string) {
  if (id === DEFAULT_THEME || !id) {
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
  if (t && t !== '${DEFAULT_THEME}') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

// Reconciles the live DB-selected theme (site_content key "theme.active")
// with what's applied — keeps every tab in sync with the admin's choice.
export function ThemeEngine() {
  const active = useContent("theme.active", DEFAULT_THEME);
  useEffect(() => {
    applyTheme(active);
  }, [active]);
  return null;
}
