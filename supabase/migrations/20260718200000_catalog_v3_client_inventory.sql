-- =========================================================================
-- CATALOG V3: extended fragrance data model + client inventory import.
--
-- Non-destructive: every new column uses ADD COLUMN IF NOT EXISTS with a
-- safe default, so nothing existing breaks. Reuses existing columns
-- (gender, family, concentration, top/heart/base_notes, best_season,
-- occasion, rating_longevity/sillage/projection/versatility/compliment/
-- uniqueness) rather than duplicating them under new names.
--
-- New columns only for what genuinely didn't exist yet:
--   main_accords          — distinct from top/heart/base notes
--   rating_sweetness/freshness/warmth — new 0-10 scores
--   sale_price_pkr         — optional discounted price
--   stock_quantity         — numeric stock, complementing in_stock boolean
--   image_status           — 'missing' | 'uploaded', drives the admin
--                             "Missing Image" filter + storefront placeholder
--   image_storage_path     — Supabase Storage object path (vs. image_url,
--                             the public URL)
--   needs_confirmation     — admin-only flag for products whose exact
--                             bottle/edition is ambiguous (never shown
--                             publicly)
--   source_notes           — private admin-only raw source text for audit;
--                             never selected by any public-facing query
-- =========================================================================

ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS main_accords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS rating_sweetness INT NOT NULL DEFAULT 5 CHECK (rating_sweetness BETWEEN 0 AND 10);
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS rating_freshness INT NOT NULL DEFAULT 5 CHECK (rating_freshness BETWEEN 0 AND 10);
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS rating_warmth INT NOT NULL DEFAULT 5 CHECK (rating_warmth BETWEEN 0 AND 10);
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS sale_price_pkr INT CHECK (sale_price_pkr IS NULL OR sale_price_pkr >= 0);
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS stock_quantity INT CHECK (stock_quantity IS NULL OR stock_quantity >= 0);
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS image_status TEXT NOT NULL DEFAULT 'missing' CHECK (image_status IN ('missing','uploaded'));
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS image_storage_path TEXT;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS needs_confirmation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.perfumes ADD COLUMN IF NOT EXISTS source_notes TEXT;

-- Backfill image_status for every existing row from whether it already has
-- a real image_url (covers the current 4 live products).
UPDATE public.perfumes SET image_status = 'uploaded' WHERE image_url IS NOT NULL AND image_url != '' AND image_status = 'missing';

CREATE INDEX IF NOT EXISTS perfumes_image_status_idx ON public.perfumes(image_status);
CREATE INDEX IF NOT EXISTS perfumes_needs_confirmation_idx ON public.perfumes(needs_confirmation) WHERE needs_confirmation = true;

-- =========================================================================
-- New categories (broad fragrance-family buckets used for the Shop Now
-- category tabs) — kept alongside the 2 that already exist.
-- =========================================================================
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Oriental & Vanilla', 'oriental-vanilla', 2),
  ('Woody & Aromatic', 'woody-aromatic', 3),
  ('Gourmand', 'gourmand', 4),
  ('Fougere', 'fougere', 5)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- New brands (maisons) for the client's supplied inventory.
-- =========================================================================
INSERT INTO public.brands (name, slug, sort_order) VALUES
  ('Burberry', 'burberry', 10),
  ('Hugo Boss', 'hugo-boss', 11),
  ('Coach', 'coach', 12),
  ('Afnan', 'afnan', 13),
  ('Lattafa', 'lattafa', 14),
  ('Gucci', 'gucci', 15),
  ('Giorgio Armani', 'giorgio-armani', 16),
  ('Chanel', 'chanel', 17)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- 29-product client inventory import.
--
-- Prices are the client's commercial stock list (source of truth) — never
-- altered. Descriptions are short, original summaries written from the
-- supplied notes/accords, not copied from any source text. Ambiguous items
-- (My Burberry, Kingdon, Acqua di Giò EDP) are imported under the client's
-- exact stock name with needs_confirmation = true and no invented notes —
-- see the per-row comments below.
-- =========================================================================
DO $$
DECLARE
  v_burberry UUID; v_hugoboss UUID; v_coach UUID; v_afnan UUID; v_lattafa UUID;
  v_gucci UUID; v_armani UUID; v_chanel UUID;
  v_floral UUID; v_oriental UUID; v_oriental_vanilla UUID; v_woody UUID; v_gourmand UUID; v_fougere UUID;
  v_perfume_id UUID;
BEGIN
  SELECT id INTO v_burberry FROM public.brands WHERE slug = 'burberry';
  SELECT id INTO v_hugoboss FROM public.brands WHERE slug = 'hugo-boss';
  SELECT id INTO v_coach FROM public.brands WHERE slug = 'coach';
  SELECT id INTO v_afnan FROM public.brands WHERE slug = 'afnan';
  SELECT id INTO v_lattafa FROM public.brands WHERE slug = 'lattafa';
  SELECT id INTO v_gucci FROM public.brands WHERE slug = 'gucci';
  SELECT id INTO v_armani FROM public.brands WHERE slug = 'giorgio-armani';
  SELECT id INTO v_chanel FROM public.brands WHERE slug = 'chanel';

  SELECT id INTO v_floral FROM public.categories WHERE slug = 'floral';
  SELECT id INTO v_oriental FROM public.categories WHERE slug = 'oriental-amber';
  SELECT id INTO v_oriental_vanilla FROM public.categories WHERE slug = 'oriental-vanilla';
  SELECT id INTO v_woody FROM public.categories WHERE slug = 'woody-aromatic';
  SELECT id INTO v_gourmand FROM public.categories WHERE slug = 'gourmand';
  SELECT id INTO v_fougere FROM public.categories WHERE slug = 'fougere';

  -- 1. Burberry Her Elixir de Parfum
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Burberry Her Elixir de Parfum', 'burberry-her-elixir-de-parfum', v_burberry, v_oriental,
    'Fruity Gourmand', 'Elixir de Parfum', 'women', 27000,
    ARRAY['fruity','sweet','vanilla','powdery','amber','white floral','woody'],
    ARRAY['Strawberry','Blackberry'], ARRAY['Jasmine'], ARRAY['Vanilla','Amber','Sandalwood'],
    'A bold fruity-oriental scent built on dark berries, jasmine and warm vanilla-amber. Sweet, sensual and confident — a striking choice for evenings and cooler months.',
    'Bold berries, jasmine and warm amber',
    8, 8, 8, 6, 8, 6, 8, 3, 7, 'autumn,winter', 'evening,date night',
    'fruity,gourmand,sweet', 'strong', 'sensual,confident', 'autumn,winter', 'evening,date night', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 2. My Burberry — AMBIGUOUS: stock name is "My Burberry" but supplied
  -- fragrance details describe "My Burberry Black" (a different flanker).
  -- Per instruction: preserve the client's exact name, flag for admin
  -- confirmation, do not publish notes that may belong to the wrong bottle.
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, gender, price_pkr, needs_confirmation,
    description, tagline, source_notes,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, tag_gender
  ) VALUES (
    'My Burberry', 'my-burberry', v_burberry, v_floral, 'women', 23000, true,
    'A Burberry fragrance for women. Full fragrance profile is being confirmed with the supplier.',
    'Profile pending confirmation',
    'Stock list says "My Burberry" (23k); supplied fragrance notes on file describe "My Burberry Black" (2016, EDT, Kurkdjian) which is a different edition. Do not publish those notes until the exact bottle is confirmed against physical stock.',
    6, 6, 6, 6, 6, 5, 5, 5, 5, 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 3. Hugo Boss Alive Parfum
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Hugo Boss Alive Parfum', 'hugo-boss-alive-parfum', v_hugoboss, v_oriental,
    'Oriental Floral', 'Parfum', 'women', 18000,
    ARRAY['floral','woody','leather','musky'],
    ARRAY['Jasmine'], ARRAY['Vetiver'], ARRAY['Leather'],
    'An oriental floral scent centred on jasmine, smooth vetiver and warm leather. Refined and grounded, well suited to evening wear.',
    'Jasmine, vetiver and warm leather',
    7, 7, 7, 6, 6, 5, 5, 4, 6, 'autumn,winter', 'evening,formal',
    'floral,woody', 'moderate', 'refined,elegant', 'autumn,winter', 'evening,formal', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 4. Hugo Boss Bottled Night
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Hugo Boss Bottled Night', 'hugo-boss-bottled-night', v_hugoboss, v_woody,
    'Woody Aromatic', 'Eau de Toilette', 'men', 14000,
    ARRAY['woody','violet','powdery','lavender','leather','musky','smoky','floral','aromatic'],
    ARRAY['Lavender','Birch'], ARRAY['Violet'], ARRAY['Woodsy Notes','Musk'],
    'A confident woody-aromatic fragrance opening with lavender and birch, layered with violet and finished with warm woods and musk. Built for cool evenings.',
    'Lavender, violet and warm woods',
    7, 7, 7, 7, 6, 5, 3, 5, 6, 'autumn,winter', 'evening,casual',
    'woody,aromatic', 'moderate', 'confident,masculine', 'autumn,winter', 'evening,casual', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 5. Boss Bottled Absolu
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Boss Bottled Absolu', 'boss-bottled-absolu', v_hugoboss, v_woody,
    'Woody Aromatic', 'Eau de Parfum', 'men', 29000,
    ARRAY['amber','woody','balsamic','warm spicy','smoky','patchouli','leather','aromatic','sweet'],
    ARRAY['Incense','Leather'], ARRAY['Myrrh','Patchouli'], ARRAY['Cedarwood','Davana'],
    'A bold woody-leathery scent built on incense, patchouli and myrrh, finished with warm cedarwood. Rich and long-lasting for cold-weather evenings.',
    'Incense, patchouli and warm cedar',
    9, 8, 8, 5, 7, 7, 4, 3, 8, 'autumn,winter', 'evening,formal',
    'woody,amber,spicy', 'strong', 'bold,sophisticated', 'autumn,winter', 'evening,formal', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 6. Coach Wild Rose
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Coach Wild Rose', 'coach-wild-rose', v_coach, v_floral,
    'Floral Fruity', 'Eau de Parfum', 'women', 17000,
    ARRAY['fruity','rose','amber','soft spicy','sweet','fresh','citrus','white floral','floral'],
    ARRAY['Red Currant','Bergamot'], ARRAY['Rose','Jasmine Sambac'], ARRAY['Ambroxan','Tonka Bean','Moss'],
    'A fresh floral-fruity scent of red currant and bergamot opening into rose and jasmine, settling into a soft amber-tonka base. Easy to wear daily.',
    'Red currant, rose and soft amber',
    6, 6, 6, 8, 6, 4, 6, 6, 4, 'spring,summer', 'everyday,casual',
    'floral,fruity', 'moderate', 'fresh,romantic', 'spring,summer', 'everyday,casual', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 7. Coach Floral Blush
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Coach Floral Blush', 'coach-floral-blush', v_coach, v_floral,
    'Floral Woody Musk', 'Eau de Parfum', 'women', 17000,
    ARRAY['floral','fresh','fruity','rose','citrus','musky','powdery','woody','sweet'],
    ARRAY['Goji Berries','Grapefruit'], ARRAY['Peony','Peach'], ARRAY['Musk','White Wood'],
    'A soft floral-fruity fragrance of goji berry and grapefruit, blooming into peony and peach over a clean musk-and-white-wood base.',
    'Goji berry, peony and soft musk',
    6, 6, 6, 8, 6, 4, 6, 6, 4, 'spring,summer', 'everyday,office',
    'floral,fruity', 'light', 'soft,fresh', 'spring,summer', 'everyday,office', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 8. Coach Love
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Coach Love', 'coach-love', v_coach, v_floral,
    'Floral Fruity', 'Eau de Parfum', 'women', 17000,
    ARRAY['fruity','sweet','woody','rose','earthy'],
    ARRAY['Wild Strawberry'], ARRAY['Red Rose'], ARRAY['Cedarwood'],
    'A cheerful fruity-floral scent of wild strawberry and velvety red rose over a warm cedarwood base. Romantic and easy to wear.',
    'Wild strawberry and velvety rose',
    6, 6, 6, 7, 7, 4, 6, 5, 5, 'spring,summer', 'everyday,date night',
    'floral,fruity', 'moderate', 'romantic,playful', 'spring,summer', 'everyday,date night', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 9. Afnan Delicious Bouquet
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Afnan Delicious Bouquet', 'afnan-delicious-bouquet', v_afnan, v_gourmand,
    'Citrus Gourmand', 'Eau de Parfum', 'women', 9000,
    ARRAY['sweet','citrus','vanilla','caramel','white floral','powdery','aromatic','honey','musky'],
    ARRAY['Lemon','Vanilla','Bergamot','White Flowers'], ARRAY['Sugar','Honey','Rum','Orange Blossom'], ARRAY['Caramel','Vanilla','Musk','Tonka'],
    'A warm gourmand fragrance of creamy caramel and vanilla, softened with honey and musk. Cozy and comforting, best for cool weather.',
    'Caramel, vanilla and honeyed musk',
    7, 7, 7, 6, 7, 5, 8, 3, 6, 'autumn,winter', 'everyday,casual',
    'gourmand,sweet', 'moderate', 'cozy,comforting', 'autumn,winter', 'everyday,casual', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 10. Afnan Cherry Bouquet
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Afnan Cherry Bouquet', 'afnan-cherry-bouquet', v_afnan, v_gourmand,
    'Floral Fruity Gourmand', 'Eau de Parfum', 'women', 9000,
    ARRAY['cherry','sweet','fruity','almond','nutty','woody','vanilla'],
    ARRAY['Black Cherry','Cherry Liqueur','Sour Cherry','Almond'], ARRAY['Plum','Raspberry','Damask Rose','Jasmine Sambac'], ARRAY['Vanilla','Cloves','Vetiver','Cedar','Patchouli'],
    'A rich cherry-almond gourmand fragrance layered with plum, rose and jasmine over a spiced woody-vanilla base. Sweet and indulgent.',
    'Black cherry, almond and spiced vanilla',
    7, 7, 7, 6, 7, 6, 8, 3, 6, 'autumn,winter', 'evening,casual',
    'gourmand,fruity', 'moderate', 'indulgent,playful', 'autumn,winter', 'evening,casual', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 11. Lattafa Khamrah
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Lattafa Khamrah', 'lattafa-khamrah', v_lattafa, v_oriental,
    'Oriental Spicy', 'Eau de Parfum', 'unisex', 7000,
    ARRAY['sweet','warm spicy','vanilla','amber','cinnamon','woody','fresh spicy','fruity'],
    ARRAY['Cinnamon','Nutmeg','Bergamot'], ARRAY['Dates','Praline','Tuberose'], ARRAY['Vanilla','Tonka Bean','Amberwood','Myrrh','Benzoin'],
    'A rich oriental-spicy fragrance of warm cinnamon and dates, layered with praline and a deep vanilla-amberwood base. Bold and versatile for any gender.',
    'Cinnamon, dates and vanilla-amberwood',
    8, 8, 8, 7, 7, 6, 7, 3, 8, 'autumn,winter', 'evening,everyday',
    'oriental,spicy', 'strong', 'warm,luxurious', 'autumn,winter', 'evening,everyday', 'unisex'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 12. Lattafa Khamrah Qahwa
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Lattafa Khamrah Qahwa', 'lattafa-khamrah-qahwa', v_lattafa, v_oriental_vanilla,
    'Oriental Vanilla', 'Eau de Parfum', 'unisex', 7000,
    ARRAY['warm spicy','sweet','vanilla','cinnamon','coffee','amber','powdery'],
    ARRAY['Cinnamon','Cardamom','Ginger'], ARRAY['Praline','Candied Fruits','White Flowers'], ARRAY['Vanilla','Coffee','Tonka Bean','Benzoin','Musk'],
    'A coffee-spiced take on Khamrah — warm cinnamon and cardamom over creamy praline and a rich vanilla-coffee base. Comforting and distinctive.',
    'Cinnamon, coffee and creamy vanilla',
    8, 8, 7, 7, 7, 7, 7, 3, 8, 'autumn,winter', 'evening,everyday',
    'oriental,vanilla,coffee', 'strong', 'warm,comforting', 'autumn,winter', 'evening,everyday', 'unisex'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 13. Kingdon — AMBIGUOUS: client's stock list places "Kingdon" under
  -- Lattafa; supplied fragrance details describe "Kingdom by Alexander
  -- McQueen" (2003), a different house entirely. Per instruction: use the
  -- client's exact stock name, do not auto-rename, flag for confirmation,
  -- leave notes unpublished.
  INSERT INTO public.perfumes (
    name, slug, brand_id, price_pkr, needs_confirmation,
    description, tagline, source_notes,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth
  ) VALUES (
    'Kingdon', 'kingdon', v_lattafa, 7500, true,
    'A fragrance from the Lattafa stock list. Full fragrance profile and exact edition are being confirmed with the supplier.',
    'Profile pending confirmation',
    'Stock list places "Kingdon" (7.5k) under Lattafa; supplied fragrance notes on file describe "Kingdom by Alexander McQueen" (2003), a different house. Do not rename or publish those notes until the exact bottle is confirmed against physical stock.',
    6, 6, 6, 6, 6, 5, 5, 5, 5
  ) ON CONFLICT (slug) DO NOTHING;

  -- 14. Lattafa Fire on Ice
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Lattafa Fire on Ice', 'lattafa-fire-on-ice', v_lattafa, v_oriental_vanilla,
    'Oriental Vanilla', 'Eau de Parfum', 'unisex', 7500,
    ARRAY['woody','warm spicy','sweet','fruity','amber','cinnamon','rose','caramel'],
    ARRAY['Cognac','Raspberry','Cinnamon'], ARRAY['Caramel','Rose Petals','Moss'], ARRAY['Oak','Myrrh','Cedarwood','Ambroxan'],
    'A warm spiced fragrance of cognac and raspberry, softened with caramel and rose, resting on an oak-amber base. Rich and versatile.',
    'Cognac, raspberry and warm caramel',
    7, 7, 7, 7, 6, 6, 7, 4, 7, 'autumn,winter', 'evening,everyday',
    'oriental,spicy,sweet', 'moderate', 'warm,inviting', 'autumn,winter', 'evening,everyday', 'unisex'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 15. Lattafa Angham
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Lattafa Angham', 'lattafa-angham', v_lattafa, v_oriental_vanilla,
    'Oriental Vanilla', 'Eau de Parfum', 'unisex', 7500,
    ARRAY['vanilla','sweet','lavender','fresh spicy','powdery','amber','musky','citrus','cacao','aromatic'],
    ARRAY['Ginger','Mandarin','Pink Pepper'], ARRAY['Lavender','Praline','Cacao','Jasmine'], ARRAY['Vanilla','Amber','Musk'],
    'A sweet oriental fragrance blending ginger and mandarin with cacao, praline and soft lavender over a warm vanilla-musk base.',
    'Ginger, cacao and soft vanilla',
    7, 7, 7, 7, 6, 6, 7, 4, 6, 'autumn,winter', 'everyday,casual',
    'oriental,gourmand', 'moderate', 'warm,sweet', 'autumn,winter', 'everyday,casual', 'unisex'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 16. Lattafa His Confession
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Lattafa His Confession', 'lattafa-his-confession', v_lattafa, v_woody,
    'Oriental Woody', 'Eau de Parfum', 'men', 8000,
    ARRAY['amber','vanilla','warm spicy','powdery','iris','woody','aromatic','balsamic','cinnamon','lavender'],
    ARRAY['Cinnamon','Lavender','Mandarin'], ARRAY['Iris','Benzoin','Cypress'], ARRAY['Vanilla','Tonka','Amber','Incense','Cedarwood','Patchouli'],
    'A confident, spiced woody fragrance opening with mandarin and lavender, deepened by iris and a warm vanilla-amber base. Versatile day or night.',
    'Mandarin, lavender and warm amber',
    8, 7, 7, 7, 6, 6, 5, 4, 7, 'autumn,winter', 'evening,everyday',
    'woody,oriental,spicy', 'strong', 'confident,versatile', 'autumn,winter', 'evening,everyday', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 17. Lattafa Yara
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Lattafa Yara', 'lattafa-yara', v_lattafa, v_oriental_vanilla,
    'Oriental Vanilla', 'Eau de Parfum', 'women', 6000,
    ARRAY['sweet','vanilla','powdery','tropical','musky','fruity','floral','citrus'],
    ARRAY['Orchid','Heliotrope','Tangerine'], ARRAY['Gourmand Accord','Tropical Fruits'], ARRAY['Vanilla','Musk','Sandalwood'],
    'A sweet, tropical-floral fragrance of orchid and tangerine over a soft vanilla-musk base. Playful and easy to wear daily.',
    'Orchid, tangerine and soft vanilla',
    6, 6, 6, 8, 7, 5, 7, 5, 5, 'spring,summer', 'everyday,casual',
    'oriental,fruity,sweet', 'moderate', 'playful,warm', 'spring,summer', 'everyday,casual', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 18. Lattafa Yara Elixir
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Lattafa Yara Elixir', 'lattafa-yara-elixir', v_lattafa, v_oriental_vanilla,
    'Oriental Vanilla', 'Eau de Parfum', 'women', 6500,
    ARRAY['vanilla','caramel','white floral','sweet','powdery','fruity','musky','amber','soft spicy'],
    ARRAY['Strawberry S''mores','Black Currant'], ARRAY['Jasmine','Orange Blossom'], ARRAY['Vanilla','Caramel','Musk','Amber'],
    'A bold, sweet gourmand fragrance of strawberry and blackcurrant blooming into jasmine, finished with a rich caramel-amber base.',
    'Strawberry, jasmine and rich caramel',
    7, 7, 7, 7, 7, 6, 8, 4, 7, 'autumn,winter', 'evening,date night',
    'oriental,gourmand,sweet', 'strong', 'bold,glamorous', 'autumn,winter', 'evening,date night', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 19. Gucci Bloom
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Gucci Bloom', 'gucci-bloom', v_gucci, v_floral,
    'Floral', 'Eau de Parfum', 'women', 26000,
    ARRAY['white floral','tuberose','floral','animalic','green'],
    ARRAY['Jasmine'], ARRAY['Tuberose'], ARRAY['Rangoon Creeper'],
    'A lush white-floral bouquet of jasmine and tuberose with a soft green edge. Elegant and feminine, ideal for daytime wear.',
    'Jasmine, tuberose and green florals',
    7, 7, 6, 7, 7, 6, 5, 5, 5, 'spring,summer', 'everyday,office',
    'floral,white floral', 'moderate', 'elegant,feminine', 'spring,summer', 'everyday,office', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 20. Gucci Flora
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Gucci Flora', 'gucci-flora', v_gucci, v_floral,
    'Floral', 'Eau de Parfum', 'women', 33000,
    ARRAY['floral','rose','fruity','fresh','citrus','woody','musky','patchouli','sweet','powdery'],
    ARRAY['Mandarin Orange','Pear','Pepper'], ARRAY['Peony','Rose','Osmanthus'], ARRAY['Musk','Patchouli','Cedar','Leather'],
    'A fresh floral fragrance of pear and mandarin blossoming into rose and peony, grounded by soft musk and patchouli.',
    'Pear, rose and soft patchouli',
    7, 7, 6, 7, 7, 5, 5, 5, 5, 'spring,summer', 'everyday,office',
    'floral,fruity', 'moderate', 'fresh,elegant', 'spring,summer', 'everyday,office', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 21. Acqua di Giò Eau de Parfum — AMBIGUOUS: inventory lists the EDP,
  -- but supplied fragrance details describe Acqua di Giò Essenza (2012), a
  -- different, more intense edition. Per instruction: keep the EDP identity,
  -- do not label it Essenza, do not publish Essenza's specific note pyramid.
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr, needs_confirmation,
    main_accords, description, tagline, source_notes,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, tag_family, tag_gender
  ) VALUES (
    'Acqua di Giò Eau de Parfum', 'acqua-di-gio-eau-de-parfum', v_armani, v_woody,
    'Woody Aquatic', 'Eau de Parfum', 'men', 30000, true,
    ARRAY['fresh','aquatic','woody','citrus'],
    'A fresh aquatic-woody fragrance from the Acqua di Giò line. Edition-specific top/heart/base notes are pending confirmation against physical stock.',
    'Fresh, aquatic and woody',
    'Stock list specifies "Acqua di Giò Eau de Parfum"; supplied fragrance notes on file describe Acqua di Giò Essenza (2012), a distinct, more intense edition. Do not publish those specific notes as this bottle''s profile until confirmed.',
    6, 6, 6, 8, 6, 4, 3, 8, 4, 'aquatic,woody', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 22. Stronger With You Intensely
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Stronger With You Intensely', 'stronger-with-you-intensely', v_armani, v_fougere,
    'Oriental Fougere', 'Eau de Parfum', 'men', 33000,
    ARRAY['vanilla','sweet','amber','cinnamon','warm spicy','powdery','aromatic','soft spicy','caramel'],
    ARRAY['Pink Pepper','Juniper','Violet'], ARRAY['Toffee','Cinnamon','Lavender','Sage'], ARRAY['Vanilla','Amber','Tonka Bean','Suede'],
    'A warm oriental-fougère scent of spiced pepper and violet melting into toffee, lavender and a soft suede-vanilla base.',
    'Spiced pepper, toffee and suede',
    8, 7, 7, 7, 7, 5, 7, 3, 7, 'autumn,winter', 'evening,date night',
    'fougere,oriental,sweet', 'strong', 'warm,romantic', 'autumn,winter', 'evening,date night', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 23. Stronger With You Absolutely
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Stronger With You Absolutely', 'stronger-with-you-absolutely', v_armani, v_fougere,
    'Oriental Fougere', 'Parfum', 'men', 33000,
    ARRAY['vanilla','woody','balsamic','rum','aromatic','warm spicy','nutty','powdery','lavender','sweet'],
    ARRAY['Rum','Elemi','Bergamot'], ARRAY['Lavender','Davana'], ARRAY['Madagascar Vanilla','Chestnut','Cedar','Patchouli'],
    'A rich, boozy fougère of rum and bergamot opening into lavender and davana, finished with warm vanilla, chestnut and cedar.',
    'Rum, lavender and warm chestnut',
    8, 8, 7, 6, 7, 6, 6, 3, 7, 'autumn,winter', 'evening,formal',
    'fougere,oriental,woody', 'strong', 'rich,sophisticated', 'autumn,winter', 'evening,formal', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 24. Stronger With You Parfum
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Stronger With You Parfum', 'stronger-with-you-parfum', v_armani, v_fougere,
    'Oriental Fougere', 'Parfum', 'men', 38000,
    ARRAY['vanilla','lavender','soft spicy','warm spicy','nutty','balsamic','aromatic','sweet','leather','herbal'],
    ARRAY['Pink Pepper','Mandarin'], ARRAY['Lavender','Cinnamon','Sage'], ARRAY['Chestnut','Vanilla','Leather'],
    'A powerful, elegant fougère opening with pink pepper and mandarin, warmed by lavender and cinnamon over a leathery vanilla-chestnut base.',
    'Pink pepper, lavender and leather',
    9, 8, 8, 6, 7, 6, 6, 3, 7, 'autumn,winter', 'evening,formal',
    'fougere,oriental,leather', 'strong', 'powerful,elegant', 'autumn,winter', 'evening,formal', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 25. Armani My Way — standard EDP profile (not Sunny Vanilla, not
  -- Intense). Uses established, reliable general knowledge of this specific
  -- widely-documented release.
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Armani My Way', 'armani-my-way', v_armani, v_floral,
    'Floral Fruity', 'Eau de Parfum', 'women', 33000,
    ARRAY['white floral','musky','vanilla','powdery','tuberose'],
    ARRAY['Orange Blossom','Bergamot'], ARRAY['Tuberose','Indian Jasmine'], ARRAY['White Musk','Vanilla'],
    'A luminous white-floral fragrance of orange blossom and tuberose over a soft musk-vanilla base. Clean, warm and versatile.',
    'Orange blossom, tuberose and soft musk',
    6, 6, 6, 8, 7, 4, 5, 6, 4, 'spring,summer', 'everyday,office',
    'floral,white floral', 'moderate', 'clean,versatile', 'spring,summer', 'everyday,office', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 26. Armani My Way Intense
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Armani My Way Intense', 'armani-my-way-intense', v_armani, v_oriental,
    'Oriental Floral', 'Eau de Parfum Intense', 'women', 38000,
    ARRAY['white floral','tuberose','citrus','vanilla','animalic','woody','powdery','sweet'],
    ARRAY['Orange Blossom','Bitter Orange'], ARRAY['Indian Tuberose','Tuberose'], ARRAY['Madagascar Vanilla','Sandalwood'],
    'An intense oriental-floral fragrance of bitter orange and tuberose over a rich Madagascar vanilla-sandalwood base. Deep and long-lasting.',
    'Bitter orange, tuberose and rich vanilla',
    8, 8, 7, 6, 7, 6, 6, 4, 6, 'autumn,winter', 'evening,formal',
    'floral,oriental', 'strong', 'deep,sophisticated', 'autumn,winter', 'evening,formal', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 27. Chanel No. 5 Eau Première
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Chanel No. 5 Eau Première', 'chanel-no-5-eau-premiere', v_chanel, v_floral,
    'Floral Aldehyde', 'Eau de Parfum', 'women', 48000,
    ARRAY['aldehydic','woody','fresh','yellow floral','white floral','vanilla','sweet','powdery','floral','soapy'],
    ARRAY['Aldehydes','Ylang-Ylang','Neroli'], ARRAY['Jasmine','Rose'], ARRAY['Vanilla','Sandalwood','Vetiver'],
    'A modern, airy take on the iconic No. 5 — sparkling aldehydes and neroli over a soft jasmine-rose heart and a smooth vanilla-sandalwood base.',
    'Aldehydes, jasmine and soft vanilla',
    7, 7, 6, 7, 8, 7, 5, 6, 4, 'spring,autumn', 'formal,office',
    'floral,aldehydic', 'moderate', 'timeless,elegant', 'spring,autumn', 'formal,office', 'feminine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 28. Bleu de Chanel Eau de Parfum
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Bleu de Chanel Eau de Parfum', 'bleu-de-chanel-eau-de-parfum', v_chanel, v_woody,
    'Woody Aromatic', 'Eau de Parfum', 'men', 52000,
    ARRAY['citrus','amber','woody','fresh spicy','aromatic','warm spicy','fresh','smoky','balsamic','powdery'],
    ARRAY['Grapefruit','Lemon','Mint','Bergamot','Pink Pepper'], ARRAY['Ginger','Jasmine','Nutmeg','Melon'], ARRAY['Incense','Amber','Cedar','Sandalwood','Patchouli'],
    'A sophisticated woody-aromatic fragrance of citrus and pink pepper deepening into incense, amber and cedar. Confident and versatile.',
    'Citrus, pink pepper and warm amber',
    8, 8, 7, 9, 8, 5, 4, 6, 5, 'all season', 'everyday,office,evening',
    'woody,aromatic,citrus', 'strong', 'confident,versatile', 'all season', 'everyday,office,evening', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- 29. Bleu de Chanel Parfum
  INSERT INTO public.perfumes (
    name, slug, brand_id, category_id, family, concentration, gender, price_pkr,
    main_accords, top_notes, heart_notes, base_notes, description, tagline,
    rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
    rating_sweetness, rating_freshness, rating_warmth, best_season, occasion,
    tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender
  ) VALUES (
    'Bleu de Chanel Parfum', 'bleu-de-chanel-parfum', v_chanel, v_woody,
    'Woody Aromatic', 'Parfum', 'men', 58000,
    ARRAY['woody','citrus','aromatic','amber','fresh spicy','powdery','warm spicy','green','lavender'],
    ARRAY['Lemon Zest','Bergamot','Mint','Artemisia'], ARRAY['Lavender','Pineapple','Geranium'], ARRAY['Sandalwood','Cedar','Amberwood','Tonka Bean'],
    'The most intense Bleu de Chanel — bright citrus and lavender resting on a rich sandalwood-cedar-tonka base. Bold and long-lasting.',
    'Citrus, lavender and rich sandalwood',
    9, 8, 8, 8, 8, 6, 4, 6, 6, 'all season', 'evening,formal',
    'woody,aromatic,citrus', 'strong', 'bold,refined', 'all season', 'evening,formal', 'masculine'
  ) ON CONFLICT (slug) DO NOTHING;

  -- One default 100ml variant per newly-imported perfume, at the client's
  -- stock price, so these become genuinely orderable with a real size —
  -- skips any perfume that already has a variant (idempotent on rerun).
  FOR v_perfume_id IN
    SELECT id FROM public.perfumes
    WHERE slug IN (
      'burberry-her-elixir-de-parfum','my-burberry','hugo-boss-alive-parfum','hugo-boss-bottled-night',
      'boss-bottled-absolu','coach-wild-rose','coach-floral-blush','coach-love','afnan-delicious-bouquet',
      'afnan-cherry-bouquet','lattafa-khamrah','lattafa-khamrah-qahwa','kingdon','lattafa-fire-on-ice',
      'lattafa-angham','lattafa-his-confession','lattafa-yara','lattafa-yara-elixir','gucci-bloom','gucci-flora',
      'acqua-di-gio-eau-de-parfum','stronger-with-you-intensely','stronger-with-you-absolutely',
      'stronger-with-you-parfum','armani-my-way','armani-my-way-intense','chanel-no-5-eau-premiere',
      'bleu-de-chanel-eau-de-parfum','bleu-de-chanel-parfum'
    )
  LOOP
    INSERT INTO public.product_variants (perfume_id, size_label, price_pkr, is_default, sort_order)
    SELECT v_perfume_id, '100ml', p.price_pkr, true, 0
    FROM public.perfumes p WHERE p.id = v_perfume_id
    AND NOT EXISTS (SELECT 1 FROM public.product_variants WHERE perfume_id = v_perfume_id);
  END LOOP;
END $$;
