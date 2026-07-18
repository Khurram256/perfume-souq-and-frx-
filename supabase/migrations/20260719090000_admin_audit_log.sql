-- =========================================================================
-- admin_audit_log: records who performed a destructive/irreversible admin
-- action, when, and what was affected. Starts with just the analytics reset
-- (the first destructive admin action that needed one), but the shape is
-- generic (action + details jsonb) so future destructive actions can log
-- to the same table without a schema change.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Read-only to admins from the client; all writes go through trusted
-- server functions using the service-role client, never a direct insert
-- policy, so the log itself can't be forged or tampered with from the browser.
CREATE POLICY "admin_audit_log admin read" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_admin_area_member());

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
