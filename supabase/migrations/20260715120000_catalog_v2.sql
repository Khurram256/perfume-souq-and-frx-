-- =========================================================================
-- CATALOG V2: brands, variants, promotions (discount engine), bundles,
-- analytics events, back-in-stock capture, and role-based admin access.
--
-- Non-destructive: existing tables (perfumes, offers, admin_lock) are kept
-- and extended, not dropped. `offers` remains the banner/placement system
-- (AnnouncementBar/SlideIn/Popup/Inline) used by OffersLayer.tsx today.
-- `promotions` is the new pricing/discount engine used by the shop, product
-- pages, and WhatsApp ordering.
-- =========================================================================

-- =========================================================================
-- brands (maisons)
-- =========================================================================
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  hero_image_url TEXT,
  origin_country TEXT,
  story TEXT,
  meta_title TEXT,
  meta_description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands readable" ON public.brands FOR SELECT USING (true);
CREATE POLICY "brands admin write" ON public.brands FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER brands_touch BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

-- =========================================================================
-- perfumes: classification + SEO + publication status
-- =========================================================================
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('men','women','unisex'));
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS concentration TEXT; -- EDT, EDP, Parfum, Extrait, Cologne...
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived'));
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS new_arrival BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Backfill: keep existing `archived` boolean in sync with new `status` so
-- nothing that already reads `archived` breaks.
UPDATE public.perfumes SET status = 'archived' WHERE archived = true AND status = 'published';

CREATE INDEX IF NOT EXISTS perfumes_brand_id_idx ON public.perfumes(brand_id);
CREATE INDEX IF NOT EXISTS perfumes_gender_idx ON public.perfumes(gender);
CREATE INDEX IF NOT EXISTS perfumes_status_idx ON public.perfumes(status);
CREATE INDEX IF NOT EXISTS perfumes_category_id_idx ON public.perfumes(category_id);

-- Public reads must respect BOTH the legacy archived flag and the new
-- status column during the transition.
DROP POLICY IF EXISTS "perfumes readable" ON public.perfumes;
CREATE POLICY "perfumes readable" ON public.perfumes FOR SELECT
  USING ((archived = false AND status != 'archived' AND status != 'draft') OR public.is_current_admin());

-- =========================================================================
-- product_variants (sizes)
-- =========================================================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL, -- e.g. "50ml"
  price_pkr INT NOT NULL CHECK (price_pkr >= 0),
  sku TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INT CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (perfume_id, size_label)
);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants readable" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "variants admin write" ON public.product_variants FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER variants_touch BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();
CREATE INDEX IF NOT EXISTS product_variants_perfume_id_idx ON public.product_variants(perfume_id);

-- Seed one default variant per existing perfume from its current flat price,
-- so nothing on the storefront breaks while the UI migrates to variants.
INSERT INTO public.product_variants (perfume_id, size_label, price_pkr, is_default, sort_order)
SELECT id, '100ml', price_pkr, true, 0 FROM public.perfumes
WHERE NOT EXISTS (SELECT 1 FROM public.product_variants WHERE perfume_id = perfumes.id);

-- =========================================================================
-- promotions (discount engine) + targeting
-- =========================================================================
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  internal_description TEXT,
  customer_description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed','bundle')),
  discount_value NUMERIC NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  badge_text TEXT,
  terms TEXT,
  stackable BOOLEAN NOT NULL DEFAULT false,
  priority INT NOT NULL DEFAULT 0, -- higher priority wins when not stackable
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions public read active" ON public.promotions FOR SELECT
  USING (
    (active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
    OR public.is_current_admin()
  );
CREATE POLICY "promotions admin write" ON public.promotions FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER promotions_touch BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

CREATE TABLE public.promotion_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('all','product','variant','brand','category')),
  target_id UUID, -- NULL when target_type = 'all'
  CHECK ((target_type = 'all' AND target_id IS NULL) OR (target_type != 'all' AND target_id IS NOT NULL))
);
GRANT SELECT ON public.promotion_targets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotion_targets TO authenticated;
GRANT ALL ON public.promotion_targets TO service_role;
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotion_targets readable" ON public.promotion_targets FOR SELECT USING (true);
CREATE POLICY "promotion_targets admin write" ON public.promotion_targets FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE INDEX IF NOT EXISTS promotion_targets_promotion_id_idx ON public.promotion_targets(promotion_id);
CREATE INDEX IF NOT EXISTS promotion_targets_lookup_idx ON public.promotion_targets(target_type, target_id);

-- =========================================================================
-- bundles
-- =========================================================================
CREATE TABLE public.bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  bundle_price_pkr INT NOT NULL CHECK (bundle_price_pkr >= 0),
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);
GRANT SELECT ON public.bundles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bundles TO authenticated;
GRANT ALL ON public.bundles TO service_role;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundles public read active" ON public.bundles FOR SELECT
  USING (
    (active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
    OR public.is_current_admin()
  );
CREATE POLICY "bundles admin write" ON public.bundles FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER bundles_touch BEFORE UPDATE ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

CREATE TABLE public.bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0)
);
GRANT SELECT ON public.bundle_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bundle_items TO authenticated;
GRANT ALL ON public.bundle_items TO service_role;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundle_items readable" ON public.bundle_items FOR SELECT USING (true);
CREATE POLICY "bundle_items admin write" ON public.bundle_items FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE INDEX IF NOT EXISTS bundle_items_bundle_id_idx ON public.bundle_items(bundle_id);

-- =========================================================================
-- back_in_stock_requests (public insert only; admin manages)
-- =========================================================================
CREATE TABLE public.back_in_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (contact_email IS NOT NULL OR contact_phone IS NOT NULL)
);
GRANT INSERT ON public.back_in_stock_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.back_in_stock_requests TO authenticated;
GRANT ALL ON public.back_in_stock_requests TO service_role;
ALTER TABLE public.back_in_stock_requests ENABLE ROW LEVEL SECURITY;
-- No public SELECT policy: customer contact info is never publicly readable.
CREATE POLICY "back_in_stock public submit" ON public.back_in_stock_requests FOR INSERT
  WITH CHECK (
    char_length(coalesce(contact_email, '')) < 200 AND char_length(coalesce(contact_phone, '')) < 40
  );
CREATE POLICY "back_in_stock admin read" ON public.back_in_stock_requests FOR SELECT TO authenticated
  USING (public.is_current_admin());
CREATE POLICY "back_in_stock admin update" ON public.back_in_stock_requests FOR UPDATE TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE POLICY "back_in_stock admin delete" ON public.back_in_stock_requests FOR DELETE TO authenticated
  USING (public.is_current_admin());
CREATE TRIGGER back_in_stock_touch BEFORE UPDATE ON public.back_in_stock_requests
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

-- =========================================================================
-- analytics_events (write-only for public, read-only for admin)
-- =========================================================================
CREATE TABLE public.analytics_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view','product_view','whatsapp_click','quiz_start','quiz_complete',
    'compare_add','offer_view','offer_click','bundle_view'
  )),
  session_id UUID NOT NULL,
  perfume_id UUID REFERENCES public.perfumes(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES public.bundles(id) ON DELETE SET NULL,
  source_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics public insert" ON public.analytics_events FOR INSERT
  WITH CHECK (event_type IS NOT NULL);
CREATE POLICY "analytics admin read" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_current_admin());
CREATE INDEX IF NOT EXISTS analytics_events_type_created_idx ON public.analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS analytics_events_perfume_idx ON public.analytics_events(perfume_id);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON public.analytics_events(session_id);

-- =========================================================================
-- admin_roles: role-based access, layered on top of the existing single
-- admin_lock "Owner". admin_lock's claimant is always Owner; additional
-- admins/editors/analysts are granted here by the Owner.
-- =========================================================================
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','analyst')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
GRANT ALL ON public.admin_roles TO service_role;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_roles self read" ON public.admin_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_current_admin());
CREATE POLICY "admin_roles owner write" ON public.admin_roles FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

-- Redefine is_current_admin: the admin_lock Owner OR anyone granted a role
-- in admin_roles counts as "admin" for write-access purposes. Fine-grained
-- role checks (e.g. Analyst = read-only) are enforced in application code
-- via get_current_admin_role(), since most existing RLS policies only need
-- a yes/no "can write" answer.
CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_lock
    WHERE id = 1 AND admin_user_id IS NOT NULL AND admin_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.admin_lock WHERE id = 1 AND admin_user_id = auth.uid()) THEN 'owner'
    ELSE (SELECT role FROM public.admin_roles WHERE user_id = auth.uid())
  END;
$$;
GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;
