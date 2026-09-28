// The public address of the live site, with no trailing slash. Resolved at
// build time from VITE_SITE_URL, else Netlify's own URL variable (the site's
// primary address — the custom domain once one is attached, after a redeploy).
// When neither is known, canonical/og:url tags are left out rather than
// pointing search engines at an address that may not be live.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").trim().replace(/\/+$/, "");

export function absoluteUrl(path: string): string | undefined {
  return SITE_URL ? `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}` : undefined;
}

/** `links` entries for a page's canonical URL (empty when the domain is unknown). */
export function canonicalLink(path: string) {
  const href = absoluteUrl(path);
  return href ? [{ rel: "canonical", href }] : [];
}

/** `meta` entries for og:url (empty when the domain is unknown). */
export function ogUrlMeta(path: string) {
  const content = absoluteUrl(path);
  return content ? [{ property: "og:url", content }] : [];
}
