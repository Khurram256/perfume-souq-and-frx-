-- =========================================================================
-- Safe deletion: perfumes are archived (soft-deleted), never hard-deleted
-- from the public storefront. Admin can restore or permanently delete
-- from the Trash view. See Engineering Bible 6.1 / 11.6.
-- =========================================================================
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Public/anon reads must never see archived perfumes; admin write policy
-- already covers all writes (including archiving) via is_current_admin().
DROP POLICY IF EXISTS "perfumes readable" ON public.perfumes;
CREATE POLICY "perfumes readable" ON public.perfumes FOR SELECT
  USING (archived = false OR public.is_current_admin());
