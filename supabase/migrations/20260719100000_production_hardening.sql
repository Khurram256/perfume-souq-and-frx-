-- =========================================================================
-- Production hardening pass — fixes three concrete gaps found during audit:
--
-- 1. perfumes.price_pkr had no CHECK(>= 0) constraint, unlike every sibling
--    price column (product_variants.price_pkr, bundles.bundle_price_pkr,
--    perfumes.sale_price_pkr all already have one). A negative price was
--    accepted by both the admin UI and the database with no validation
--    anywhere.
-- 2. The perfume-media storage bucket was created out-of-band (Supabase
--    Studio) and its configuration/policies existed nowhere in version
--    control — unreproducible and unauditable from this repo. This creates
--    it idempotently (if it doesn't already exist) with the intended
--    policy: public read (product photos are meant to be publicly visible
--    on the storefront), admin-only write. Uploads/deletes already route
--    through the service-role client server-side (admin.functions.ts),
--    which bypasses storage.objects RLS entirely — these policies are a
--    defense-in-depth backstop in case that path is ever bypassed, and the
--    only way anyone editing the bucket directly in Studio doesn't
--    accidentally leave it wide open.
-- 3. analytics_events.metadata had no size bound — any anonymous visitor
--    could INSERT unbounded-size JSONB payloads (no auth required, by
--    design, since it records anonymous visitor behavior). Caps it at 8KB,
--    generous for real event metadata but enough to blunt a trivial
--    flooding/storage-abuse vector.
-- =========================================================================

-- 1. Price floor on the base perfumes price column.
ALTER TABLE public.perfumes ADD CONSTRAINT perfumes_price_pkr_nonnegative CHECK (price_pkr >= 0) NOT VALID;
ALTER TABLE public.perfumes VALIDATE CONSTRAINT perfumes_price_pkr_nonnegative;

-- 2. Storage bucket + policies for product images, created idempotently.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('perfume-media', 'perfume-media', true, 8388608, ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif'];

-- Public read — product photos must be visible on the storefront without
-- authentication.
DROP POLICY IF EXISTS "perfume-media public read" ON storage.objects;
CREATE POLICY "perfume-media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'perfume-media');

-- Admin-only write, keyed off the same admin_lock/admin_roles model as
-- every other admin-write policy in this project (is_admin_area_member()
-- covers Owner/Admin/Editor — Analyst is read-only, matching assertAdmin()
-- in admin.functions.ts).
DROP POLICY IF EXISTS "perfume-media admin insert" ON storage.objects;
CREATE POLICY "perfume-media admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'perfume-media' AND public.is_admin_area_member());

DROP POLICY IF EXISTS "perfume-media admin update" ON storage.objects;
CREATE POLICY "perfume-media admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'perfume-media' AND public.is_admin_area_member())
  WITH CHECK (bucket_id = 'perfume-media' AND public.is_admin_area_member());

DROP POLICY IF EXISTS "perfume-media admin delete" ON storage.objects;
CREATE POLICY "perfume-media admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'perfume-media' AND public.is_admin_area_member());

-- 3. Bound the size of anonymous analytics event payloads.
ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_metadata_size CHECK (pg_column_size(metadata) <= 8192) NOT VALID;
ALTER TABLE public.analytics_events VALIDATE CONSTRAINT analytics_events_metadata_size;
