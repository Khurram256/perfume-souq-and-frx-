-- =========================================================================
-- advertisements: replaces the hardcoded AdsCarousel slide array with a
-- real, admin-manageable table. Supports image or video media, scheduling,
-- and placement targeting.
-- =========================================================================
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_href TEXT,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  placement TEXT NOT NULL DEFAULT 'homepage' CHECK (placement IN ('homepage', 'shop', 'collection', 'banner', 'promo_card')),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Public reads only currently-active, in-schedule ads; admins see everything
-- (including disabled/scheduled ones) so the dashboard list is complete.
CREATE POLICY "advertisements public read active" ON public.advertisements FOR SELECT
  USING (
    (active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
    OR public.is_current_admin()
  );
CREATE POLICY "advertisements admin write" ON public.advertisements FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

CREATE TRIGGER advertisements_touch BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

CREATE INDEX IF NOT EXISTS advertisements_placement_idx ON public.advertisements(placement, sort_order);

-- Add dedicated ad event types instead of overloading offer_click/offer_view
-- (which would corrupt "most-used offers" analytics with ad clicks).
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;
ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'page_view','product_view','whatsapp_click','quiz_start','quiz_complete',
    'compare_add','offer_view','offer_click','bundle_view','ad_view','ad_click'
  ));
