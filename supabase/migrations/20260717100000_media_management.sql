-- =========================================================================
-- Extends the existing `media` table (already used for the "souq_in_motion"
-- section CHECK value, but never actually consumed by any component) with
-- the fields the admin CRUD needs: enable/disable, alt text, optional link.
-- Non-destructive — existing rows default to active=true.
-- =========================================================================
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS alt_text TEXT;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Public reads only active items; admins see everything (matches the
-- advertisements/promotions pattern).
DROP POLICY IF EXISTS "media readable" ON public.media;
CREATE POLICY "media readable" ON public.media FOR SELECT
  USING (active = true OR public.is_current_admin());
