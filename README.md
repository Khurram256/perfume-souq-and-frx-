# The Perfume Souq by Khurram Shabbir

Luxury perfume storefront with a self-serve admin CMS, built on TanStack Start + Supabase.

## Stack

- **Frontend**: React 19, TanStack Start (file-based routing, SSR), TanStack Query, Framer Motion, Tailwind CSS v4
- **Backend**: Supabase (Postgres + Auth), Row Level Security on every table
- **Build/deploy target**: Vite 7 + Nitro, targeting Cloudflare Workers

## Folder structure

```
src/
  assets/               product photos, ad creatives, hero art
  components/           storefront sections (Hero, Collection, Cart, etc.) + components/ui (shadcn primitives)
  contexts/              CartContext — localStorage-persisted cart
  integrations/supabase/ generated Supabase clients (browser, server/admin, auth middleware) — do not hand-edit
  lib/                  api/queries.ts (all Supabase data hooks), format, contact constants, admin session hook
  routes/               index.tsx (home), admin.tsx (login), admin.dashboard.tsx (CMS), robots.txt, sitemap.xml
supabase/migrations/    SQL migrations — canonical schema history
```

## Local development

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # production build
npm run lint
```

## Environment variables

Copy `.env.example` to `.env` and fill in your Supabase project's values (Project Settings → API):

| Variable | Where used | Public? |
|---|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | browser + server client | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | browser client (RLS-protected) | Yes — this is the anon key, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | `client.server.ts` only, bypasses RLS | **No — never expose to the browser** |

## Database

Schema lives in `supabase/migrations/*.sql`, applied in filename order. Tables: `admin_lock`, `categories`, `perfumes`, `spotlight`, `offers`, `reviews`, `media`, `site_content`, `settings`. Every table has RLS enabled; public reads are open, writes are gated by `is_current_admin()` (checks the caller's `auth.uid()` against the single claimed admin in `admin_lock`).

To apply migrations against your Supabase project, use the Supabase CLI (`supabase link` then `supabase db push`) or the SQL editor in the Supabase dashboard.

**Pending migration**: `20260714090000_perfumes_archive.sql` adds soft-delete (`archived`, `archived_at`) to `perfumes` so deleting a product moves it to a recoverable trash state instead of permanently erasing it. This file has been written but **not yet applied** to the live project — apply it before wiring any "Archive"/"Restore" UI to it, otherwise queries referencing the `archived` column will fail.

## Authentication & authorization

Single-admin model: the first person to sign up via `/admin` claims the sole admin seat (`claim_admin_lock()` RPC). Every admin-write RLS policy checks `is_current_admin()`. There is currently **no multi-role RBAC** (Owner/Manager/Editor etc.) — that's a real gap against a full "role-based access control" requirement and would need a `roles`/`permissions` table plus per-action checks to implement properly.

## SEO

- `robots.txt` and `sitemap.xml` are server routes (`src/routes/robots[.]txt.ts`, `src/routes/sitemap[.]xml.ts`)
- `/admin` and `/admin/dashboard` are marked `noindex, nofollow`
- Organization/WebSite JSON-LD on every page
- **Known gap**: there are no individual perfume detail pages/URLs yet (e.g. `/perfume/sang-royal`) — the collection lives entirely on the homepage as anchor sections, so the sitemap only lists `/`. Product-level SEO (per-product title/description/canonical/share image) requires building those detail routes first.

## Security

- Global response headers set in `src/start.ts` (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options)
- Service-role key is server-only (`client.server.ts`), never imported by client/route code
- RLS enforced at the database layer for every table — the frontend cannot bypass it even if client code is compromised
- **Known gaps**: no rate limiting on login/review-submission/contact forms, no audit log table, no automated backup verification (Supabase's own point-in-time recovery applies at the infra level, but there's no in-app "one-click restore")

## Known limitations (see final report for full list)

- No individual product pages — collection is homepage-only
- No RBAC beyond single-admin
- No audit logging of admin actions
- No rate limiting / CAPTCHA on public forms
- Quiz and Comparison Tool now read live Supabase data (fixed), but their tag-matching logic is a straightforward heuristic, not a scored recommendation engine
