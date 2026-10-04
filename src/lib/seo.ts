import type { JSX } from "react";
import { SITE_URL, absoluteUrl } from "./site";
import { CONTACT_PHONE_TEL, INSTAGRAM_URL } from "./contact";

// One place for how the site describes itself to search engines and social
// previews. Everything here is built from real site data — never invented
// reviews, ratings, addresses or opening hours.
export const BRAND = "Perfume Souq";
export const BRAND_FULL = "The Perfume Souq by Khurram Shabbir";

/** "Men's Perfumes | Perfume Souq" */
export function pageTitle(title: string) {
  return `${title} | ${BRAND}`;
}

/** Search engines show ~155 characters; cut on a word boundary. */
export function clampDescription(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", max - 1)).replace(/[,;:.\s]+$/, "") + "…";
}

type SeoInput = {
  title: string;
  description: string;
  /** Canonical path, e.g. "/shop". Omit for pages that must not be indexed. */
  path?: string;
  image?: string | null;
  type?: "website" | "product";
  /** Internal search results, admin, error pages. */
  noindex?: boolean;
};

/**
 * Title, description, canonical, Open Graph and Twitter tags for a page.
 * Canonical/og:url are only emitted when the public site address is known
 * (see lib/site.ts), so a wrong domain is never advertised.
 */
export function seo({ title, description, path, image, type = "website", noindex }: SeoInput) {
  const desc = clampDescription(description);
  const url = path !== undefined && !noindex ? absoluteUrl(path) : undefined;
  return {
    meta: [
      { title },
      { name: "description", content: desc },
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: type },
      ...(url ? [{ property: "og:url", content: url }] : []),
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ],
    links: url ? [{ rel: "canonical", href: url }] : [],
  };
}

// The router renders a `script:ld+json` meta entry as a JSON-LD <script>; its
// type only describes plain <meta> attributes, hence the cast.
type MetaTag = JSX.IntrinsicElements["meta"];
const ld = (data: Record<string, unknown>) =>
  ({ "script:ld+json": { "@context": "https://schema.org", ...data } }) as unknown as MetaTag;

/** Any JSON-LD block (adds the schema.org context). */
export const jsonLd = ld;

const orgId = () => (SITE_URL ? `${SITE_URL}/#organization` : undefined);

/** The business itself. No address or hours: none are published, so none are claimed. */
export function organizationLd(logoPath: string) {
  return ld({
    "@type": "Organization",
    ...(orgId() ? { "@id": orgId() } : {}),
    name: BRAND,
    alternateName: ["The Perfume Souq", BRAND_FULL],
    ...(SITE_URL ? { url: SITE_URL, logo: absoluteUrl(logoPath) } : {}),
    sameAs: [INSTAGRAM_URL],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: CONTACT_PHONE_TEL,
    },
  });
}

export function websiteLd() {
  return ld({
    "@type": "WebSite",
    ...(SITE_URL ? { "@id": `${SITE_URL}/#website`, url: SITE_URL } : {}),
    name: BRAND,
    alternateName: BRAND_FULL,
    ...(orgId() ? { publisher: { "@id": orgId() } } : {}),
  });
}

export function webPageLd(opts: { type?: "WebPage" | "CollectionPage"; name: string; description: string; path: string }) {
  const url = absoluteUrl(opts.path);
  return ld({
    "@type": opts.type ?? "WebPage",
    name: opts.name,
    description: clampDescription(opts.description),
    ...(url ? { url } : {}),
    ...(SITE_URL ? { isPartOf: { "@id": `${SITE_URL}/#website` } } : {}),
  });
}

/** Breadcrumb trail; the last crumb is the current page. */
export function breadcrumbLd(crumbs: { name: string; path: string }[]) {
  return ld({
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => {
      const item = absoluteUrl(c.path);
      return { "@type": "ListItem", position: i + 1, name: c.name, ...(item ? { item } : {}) };
    }),
  });
}

/**
 * An ordered list of pages (products on a listing, brands on the brands page).
 * Needs absolute URLs, so it is skipped until the site address is known.
 */
export function itemListLd(name: string, items: { name: string; path: string }[]) {
  if (!SITE_URL || !items.length) return undefined;
  return ld({
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  });
}

export const sellerRef = () =>
  orgId() ? { "@id": orgId() } : { "@type": "Organization", name: BRAND };
