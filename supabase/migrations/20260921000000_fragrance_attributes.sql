-- =========================================================================
-- Fragrance attributes: the two structured fields the catalogue was missing.
--
-- perfumes already stores everything else the comparison, search, filters and
-- Signature Scent need as real columns/arrays (gender, family, concentration,
-- top_notes, heart_notes, base_notes, main_accords), and product_variants
-- already carries size + price per bottle. Only launch year and perfumer had
-- nowhere to live — until now they could only be buried in free text.
--
-- Additive and idempotent: safe to run more than once, touches no row data
-- except backfilling size_ml from labels that are already plain "NNml".
-- =========================================================================

ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS launch_year INT
    CHECK (launch_year IS NULL OR launch_year BETWEEN 1700 AND 2100);

-- Free text so several perfumers can be stored as listed ("A, B"). NULL means
-- "not separately listed" — never a placeholder string.
ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS perfumer TEXT;

-- Numeric bottle size alongside the display label ("50ml"), so sizes can be
-- sorted and filtered without parsing strings at query time. size_label stays
-- the source of truth for display.
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS size_ml INT
    CHECK (size_ml IS NULL OR size_ml > 0);

UPDATE public.product_variants
   SET size_ml = (regexp_replace(size_label, '[^0-9]', '', 'g'))::int
 WHERE size_ml IS NULL
   AND size_label ~* '^\s*[0-9]+\s*ml\s*$';

-- Accord/notes arrays are filtered with array-contains from the shop; a GIN
-- index keeps that cheap as the catalogue grows.
CREATE INDEX IF NOT EXISTS perfumes_main_accords_gin ON public.perfumes USING GIN (main_accords);
CREATE INDEX IF NOT EXISTS perfumes_family_idx ON public.perfumes (family);
CREATE INDEX IF NOT EXISTS product_variants_size_ml_idx ON public.product_variants (size_ml);
