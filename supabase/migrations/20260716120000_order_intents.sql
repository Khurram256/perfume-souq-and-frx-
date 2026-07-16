-- =========================================================================
-- order_intents: records a WhatsApp order INTENT (not a completed payment)
-- at the moment the customer sends their cart to WhatsApp. Totals are
-- computed and written server-side (never trusted from the client), keyed to
-- a unique human-readable reference TPS-YYYYMMDD-XXXX.
--
-- Contains customer PII (phone) — so there is NO public SELECT policy. Rows
-- are inserted only by the trusted server function via the service-role
-- client (which bypasses RLS); admins read via is_admin_area_member().
-- =========================================================================
CREATE TABLE public.order_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref TEXT NOT NULL UNIQUE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  note TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal_pkr INT NOT NULL DEFAULT 0 CHECK (subtotal_pkr >= 0),
  discount_pkr INT NOT NULL DEFAULT 0 CHECK (discount_pkr >= 0),
  total_pkr INT NOT NULL DEFAULT 0 CHECK (total_pkr >= 0),
  offer_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'whatsapp_initiated'
    CHECK (status IN ('whatsapp_initiated','contacted','confirmed','cancelled')),
  session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.order_intents TO authenticated;
GRANT ALL ON public.order_intents TO service_role;
ALTER TABLE public.order_intents ENABLE ROW LEVEL SECURITY;

-- No public SELECT: customer phone numbers are never publicly readable.
-- No public INSERT: only the trusted server function (service role) writes.
CREATE POLICY "order_intents admin read" ON public.order_intents FOR SELECT TO authenticated
  USING (public.is_admin_area_member());
CREATE POLICY "order_intents admin update" ON public.order_intents FOR UPDATE TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

CREATE TRIGGER order_intents_touch BEFORE UPDATE ON public.order_intents
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

CREATE INDEX IF NOT EXISTS order_intents_created_idx ON public.order_intents(created_at DESC);
