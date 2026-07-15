-- =========================================================================
-- RBAC hardening: admin_roles management must be Owner-only. The previous
-- policy used is_current_admin() (true for owner/admin/editor), which would
-- let an Admin or Editor grant themselves the Owner role — a privilege
-- escalation bug. Also adds a broader "can enter the dashboard at all"
-- check that includes Analyst (read-only), separate from the write-capable
-- is_current_admin().
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_lock WHERE id = 1 AND admin_user_id IS NOT NULL AND admin_user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_area_member()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_owner() OR EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_area_member() TO authenticated;

DROP POLICY IF EXISTS "admin_roles owner write" ON public.admin_roles;
CREATE POLICY "admin_roles owner write" ON public.admin_roles FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner() AND role != 'owner');

-- Analysts get read access to analytics + published catalogue data (already
-- public) but not write access anywhere; is_current_admin() intentionally
-- still excludes them for every write policy defined in catalog_v2.sql.

-- Analytics is the one area Analyst SHOULD read (that's the whole point of
-- the role), but is_current_admin() intentionally excludes them. Replace
-- the admin-only read policy with one that also allows Analyst.
DROP POLICY IF EXISTS "analytics admin read" ON public.analytics_events;
CREATE POLICY "analytics admin read" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_admin_area_member());

-- release_admin_lock previously guarded on is_current_admin(), which now
-- also returns true for Admin/Editor roles — an Editor signing out would
-- have incorrectly cleared the Owner's claim. Guard on is_owner() instead.
CREATE OR REPLACE FUNCTION public.release_admin_lock()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner() THEN RETURN false; END IF;
  UPDATE public.admin_lock
     SET admin_email = NULL, admin_user_id = NULL, claimed_at = NULL, updated_at = now()
   WHERE id = 1;
  RETURN true;
END $$;
