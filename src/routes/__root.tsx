import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { absoluteUrl } from "@/lib/site";
import { BRAND, BRAND_FULL, organizationLd, websiteLd } from "@/lib/seo";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { trackEvent } from "../lib/api/queries";

import appCss from "../styles.css?url";
import logoMark from "../assets/logo-mark.png";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "../components/ui/sonner";
import { ThemeEngine, themeBootScript } from "../components/ThemeEngine";

const GOOGLE_SITE_VERIFICATION = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION ?? "").trim();

function NotFoundComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-gold">Error 404</p>
        <h1 className="mt-4 font-display text-4xl italic text-foreground sm:text-5xl">Page not found</h1>
        <p className="mt-4 text-sm font-light text-foreground/60">
          This page doesn't exist or has moved. The collection is just a step away.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/shop"
            className="btn-gold inline-block px-8 py-3.5 text-[10px] uppercase tracking-[0.4em]"
          >
            Browse the Collection
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center px-4 text-[10px] uppercase tracking-[0.4em] text-foreground/60 hover:text-gold"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Site-wide defaults; every public route overrides title/description
      // with its own (see lib/seo.ts).
      { title: `${BRAND} — Authentic Designer & Niche Perfumes` },
      {
        name: "description",
        content:
          "Perfume Souq by Khurram Shabbir — authentic designer and niche fragrances, hand-selected. Compare perfumes, find your signature scent and order on WhatsApp.",
      },
      { name: "author", content: BRAND_FULL },
      { name: "application-name", content: BRAND },
      { name: "apple-mobile-web-app-title", content: BRAND },
      { name: "developer", content: "FRX Technologies" },
      // Google Search Console ownership check: set VITE_GOOGLE_SITE_VERIFICATION
      // on the host to the code Google gives you, then redeploy.
      ...(GOOGLE_SITE_VERIFICATION
        ? [{ name: "google-site-verification", content: GOOGLE_SITE_VERIFICATION }]
        : []),
      { property: "og:site_name", content: BRAND },
      { property: "og:title", content: BRAND },
      { property: "og:description", content: "Authentic designer and niche fragrances, hand-selected." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_PK" },
      // Absolute URL required by crawlers; product/brand pages override this
      // with their own artwork where they have it.
      ...(absoluteUrl(logoMark)
        ? [
            { property: "og:image", content: absoluteUrl(logoMark)! },
            { name: "twitter:image", content: absoluteUrl(logoMark)! },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: BRAND },
      { name: "twitter:description", content: "Authentic designer and niche fragrances, hand-selected." },
      organizationLd(logoMark),
      websiteLd(),
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: logoMark },
      { rel: "apple-touch-icon", href: logoMark },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Archivo:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Applies the last-known theme before paint, avoiding a flash of the default theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    trackEvent("page_view", { sourcePath: pathname });
  }, [pathname]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <ThemeEngine />
      <PageViewTracker />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
