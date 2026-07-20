-- =========================================================================
-- Brand management: adds the missing pieces for a real admin Brands
-- section on top of the brands table that already existed (id, name, slug,
-- logo_url, hero_image_url, story, meta fields — created in catalog_v2).
--
-- Perfumes already reference brands via perfumes.brand_id (FK, added in
-- catalog_v2) — there was never a legacy free-text brand column on
-- perfumes to migrate away from, so this is additive to the brands table
-- only, not a data migration of perfume rows.
-- =========================================================================

-- 1. Active/inactive toggle, so a brand can be hidden from the storefront
-- (filters, brand pages) without deleting it or its perfume history.
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Case-insensitive uniqueness — the existing UNIQUE(name) constraint is
-- case-sensitive, so "Gucci" and "GUCCI" could previously both be inserted
-- as separate rows. This closes that gap. If this fails, it means
-- duplicate-by-case brand rows already exist and must be merged manually
-- before this migration can apply — it deliberately does not guess which
-- one to keep.
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_ci_unique ON public.brands (lower(name));

-- 3. Public read narrows to active brands only; admins (Owner/Admin/Editor,
-- via is_current_admin() — already covers all three per catalog_v2) still
-- see every brand so the management panel can list inactive ones too.
DROP POLICY IF EXISTS "brands readable" ON public.brands;
CREATE POLICY "brands readable" ON public.brands FOR SELECT
  USING (is_active = true OR public.is_current_admin());
