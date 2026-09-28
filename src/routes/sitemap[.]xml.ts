import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Prefer the configured public address so every URL matches the
        // canonical tags; fall back to whichever host served the request.
        const origin = SITE_URL || new URL(request.url).origin;

        const [{ data: perfumes }, { data: brands }] = await Promise.all([
          supabase.from("perfumes").select("slug,updated_at").eq("status", "published").eq("archived", false),
          supabase.from("brands").select("slug,updated_at"),
        ]);

        const urls = [
          { loc: `${origin}/`, changefreq: "daily", priority: "1.0" },
          { loc: `${origin}/shop`, changefreq: "daily", priority: "0.9" },
          { loc: `${origin}/offers`, changefreq: "daily", priority: "0.8" },
          { loc: `${origin}/brands`, changefreq: "weekly", priority: "0.6" },
          ...(perfumes ?? []).map((p) => ({
            loc: `${origin}/product/${p.slug}`,
            changefreq: "weekly",
            priority: "0.8",
            lastmod: p.updated_at,
          })),
          ...(brands ?? []).map((b) => ({
            loc: `${origin}/brand/${b.slug}`,
            changefreq: "weekly",
            priority: "0.6",
            lastmod: b.updated_at,
          })),
        ];

        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map(
            (u) =>
              `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority>${
                "lastmod" in u && u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""
              }</url>`,
          ),
          "</urlset>",
          "",
        ].join("\n");
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
