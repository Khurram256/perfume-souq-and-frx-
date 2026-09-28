// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public site address for canonical URLs, Open Graph and structured data.
// An explicit VITE_SITE_URL wins; otherwise Netlify's build-time URL (the
// site's primary address, i.e. the custom domain once it is attached).
const siteUrl = process.env.VITE_SITE_URL || process.env.URL || "";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Pin the deploy target explicitly instead of relying on Nitro's
  // env-based auto-detection — the project is deployed to Netlify.
  nitro: { preset: "netlify" },
  vite: {
    define: {
      "import.meta.env.VITE_SITE_URL": JSON.stringify(siteUrl),
    },
  },
});
