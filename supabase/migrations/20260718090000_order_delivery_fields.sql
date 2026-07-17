-- =========================================================================
-- Adds optional delivery address / shared-location-link fields to
-- order_intents, and broadens the status workflow to match the full
-- lifecycle the admin Orders section needs (draft/whatsapp_opened/
-- submitted/confirmed/processing/completed/cancelled), not just the
-- narrower set from the original migration. Non-destructive.
-- =========================================================================
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.order_intents ADD COLUMN IF NOT EXISTS location_link TEXT;

-- Backfill: previous status values map cleanly onto the new set.
ALTER TABLE public.order_intents ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.order_intents DROP CONSTRAINT IF EXISTS order_intents_status_check;
UPDATE public.order_intents SET status = 'whatsapp_opened' WHERE status = 'whatsapp_initiated';
UPDATE public.order_intents SET status = 'submitted' WHERE status = 'contacted';
ALTER TABLE public.order_intents ADD CONSTRAINT order_intents_status_check
  CHECK (status IN ('draft', 'whatsapp_opened', 'submitted', 'confirmed', 'processing', 'completed', 'cancelled'));
ALTER TABLE public.order_intents ALTER COLUMN status SET DEFAULT 'whatsapp_opened';
