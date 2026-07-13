import { createFileRoute } from "@tanstack/react-router";

// Only the homepage is a real crawlable route today — individual perfume
// detail pages (e.g. /perfume/sang-royal) are a planned feature per the
// Engineering Bible §17 (SEO) but do not exist yet, so we do not fabricate
// URLs for pages that aren't real. Extend this once product detail routes ship.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls = [{ loc: `${origin}/`, changefreq: "daily", priority: "1.0" }];
        const body = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map(
            (u) =>
              `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
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
