import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

type Entry = { path: string; lastmod?: string | null; image?: string | null };

// Only canonical, indexable pages: home, shop, the gender category pages,
// brands that actually carry perfumes, and published perfumes (one URL per
// perfume — sizes are options on that page, never separate URLs). Admin,
// cart/checkout state and filtered or searched listings are never listed.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Prefer the configured public address so every URL matches the
        // canonical tags; fall back to whichever host served the request.
        const origin = SITE_URL || new URL(request.url).origin;

        const [{ data: perfumes }, { data: brands }] = await Promise.all([
          supabase
            .from("perfumes")
            .select("slug,updated_at,image_url,brand_id,gender")
            .eq("status", "published")
            .eq("archived", false),
          supabase.from("brands").select("id,slug,updated_at").eq("is_active", true),
        ]);
        const published = perfumes ?? [];
        const brandsInUse = new Set(published.map((p) => p.brand_id));
        const genders = new Set(published.map((p) => p.gender));
        const newest = (rows: { updated_at: string | null }[]) =>
          rows.map((r) => r.updated_at).filter(Boolean).sort().pop() ?? null;
        const catalogueUpdated = newest(published);

        const entries: Entry[] = [
          { path: "/", lastmod: catalogueUpdated },
          { path: "/shop", lastmod: catalogueUpdated },
          ...(["men", "women", "unisex"] as const)
            .filter((g) => genders.has(g))
            .map((g) => ({
              path: `/shop?gender=${g}`,
              lastmod: newest(published.filter((p) => p.gender === g)),
            })),
          { path: "/brands", lastmod: catalogueUpdated },
          { path: "/offers" },
          ...(brands ?? [])
            .filter((b) => brandsInUse.has(b.id))
            .map((b) => ({
              path: `/brand/${b.slug}`,
              lastmod: newest(published.filter((p) => p.brand_id === b.id)) ?? b.updated_at,
            })),
          ...published.map((p) => ({
            path: `/product/${p.slug}`,
            lastmod: p.updated_at,
            image: p.image_url,
          })),
        ];

        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
          ...entries.map((e) => {
            const lastmod = e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : "";
            const image = e.image
              ? `<image:image><image:loc>${xml(e.image)}</image:loc></image:image>`
              : "";
            return `  <url><loc>${xml(origin + e.path)}</loc>${lastmod}${image}</url>`;
          }),
          "</urlset>",
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
