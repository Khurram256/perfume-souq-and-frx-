import { useEffect } from "react";
import { useContent } from "@/lib/api/queries";

export const THEME_STORAGE_KEY = "tps_theme_v1";
export const DEFAULT_THEME = "signature-ivory";
export const DARK_THEME = "midnight-champagne";

// Two approved production themes only. Signature Ivory is the default light
// register (no data-theme attribute); Midnight Navy & Champagne is the dark
// register. Any other/legacy value falls back to the default.
export const THEMES = [
  { id: "signature-ivory", label: "Signature Ivory — Light", swatch: ["oklch(0.975 0.010 80)", "oklch(0.66 0.12 74)"] },
  { id: "midnight-champagne", label: "Midnight Navy & Champagne — Dark", swatch: ["oklch(0.15 0.045 262)", "oklch(0.82 0.07 82)"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const VALID = new Set<string>(THEMES.map((t) => t.id));

// Normalizes any stored/legacy value to one of the two approved themes.
export function normalizeTheme(id: string | null | undefined): string {
  return id && VALID.has(id) ? id : DEFAULT_THEME;
}

export function applyTheme(id: string) {
  const theme = normalizeTheme(id);
  if (theme === DEFAULT_THEME) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

// Inline script string — inject before hydration so the correct theme paints
// immediately instead of flashing the default. Guards against legacy values
// (the 4 removed presets) by only applying the one approved dark theme.
export const themeBootScript = `
try {
  var t = localStorage.getItem('${THEME_STORAGE_KEY}');
  if (t === '${DARK_THEME}') document.documentElement.setAttribute('data-theme', '${DARK_THEME}');
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
