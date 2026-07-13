
-- =========================================================================
-- Helper: updated_at trigger
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tps_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =========================================================================
-- admin_lock (singleton row, id = 1)
-- =========================================================================
CREATE TABLE public.admin_lock (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  admin_email TEXT,
  admin_user_id UUID,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.admin_lock (id) VALUES (1);

GRANT SELECT ON public.admin_lock TO anon, authenticated;
GRANT ALL ON public.admin_lock TO service_role;
ALTER TABLE public.admin_lock ENABLE ROW LEVEL SECURITY;

-- Anyone can read the lock (needed by the sign-in page to know if it's claimed)
CREATE POLICY "lock readable" ON public.admin_lock FOR SELECT USING (true);

-- Security definer helper: is the caller the current admin?
CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_lock
    WHERE id = 1 AND admin_user_id IS NOT NULL AND admin_user_id = auth.uid()
  );
$$;

-- Claim the lock (only if empty, and only for your own uid)
CREATE OR REPLACE FUNCTION public.claim_admin_lock()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  uid UUID := auth.uid();
  em  TEXT;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT email INTO em FROM auth.users WHERE id = uid;
  UPDATE public.admin_lock
     SET admin_email = em, admin_user_id = uid, claimed_at = now(), updated_at = now()
   WHERE id = 1 AND admin_user_id IS NULL;
  RETURN FOUND OR EXISTS (SELECT 1 FROM public.admin_lock WHERE id = 1 AND admin_user_id = uid);
END $$;

-- Release the lock (only the current admin can call this)
CREATE OR REPLACE FUNCTION public.release_admin_lock()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_current_admin() THEN RETURN false; END IF;
  UPDATE public.admin_lock
     SET admin_email = NULL, admin_user_id = NULL, claimed_at = NULL, updated_at = now()
   WHERE id = 1;
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.claim_admin_lock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_admin_lock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_admin() TO anon, authenticated;

-- =========================================================================
-- categories
-- =========================================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Floral', 'floral', 1),
  ('Oriental & Amber', 'oriental-amber', 2);

-- =========================================================================
-- perfumes
-- =========================================================================
CREATE TABLE public.perfumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  family TEXT,
  price_pkr INT NOT NULL DEFAULT 0,
  image_url TEXT,
  top_notes TEXT[] NOT NULL DEFAULT '{}',
  heart_notes TEXT[] NOT NULL DEFAULT '{}',
  base_notes TEXT[] NOT NULL DEFAULT '{}',
  in_stock BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  spotlight_eligible BOOLEAN NOT NULL DEFAULT true,
  -- Comparison ratings 0-10
  rating_longevity INT NOT NULL DEFAULT 7,
  rating_sillage INT NOT NULL DEFAULT 7,
  rating_projection INT NOT NULL DEFAULT 7,
  rating_versatility INT NOT NULL DEFAULT 7,
  rating_compliment INT NOT NULL DEFAULT 7,
  rating_uniqueness INT NOT NULL DEFAULT 7,
  best_season TEXT,
  occasion TEXT,
  -- Hidden quiz tags
  tag_family TEXT,
  tag_intensity TEXT,
  tag_mood TEXT,
  tag_season TEXT,
  tag_occasion TEXT,
  tag_gender TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.perfumes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.perfumes TO authenticated;
GRANT ALL ON public.perfumes TO service_role;
ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfumes readable" ON public.perfumes FOR SELECT USING (true);
CREATE POLICY "perfumes admin write" ON public.perfumes FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER perfumes_touch BEFORE UPDATE ON public.perfumes
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

-- Seed the 3 current perfumes so the site keeps working immediately
INSERT INTO public.perfumes (name, slug, tagline, description, category_id, family, price_pkr, image_url,
  top_notes, heart_notes, base_notes, featured, spotlight_eligible,
  rating_longevity, rating_sillage, rating_projection, rating_versatility, rating_compliment, rating_uniqueness,
  best_season, occasion, tag_family, tag_intensity, tag_mood, tag_season, tag_occasion, tag_gender, sort_order)
VALUES
  ('Nuit d''Obsidienne', 'nuit-dobsidienne', 'Midnight, distilled.',
   'A veil of oud smoke, saffron, and dark amber — the hush of an unlit corridor.',
   (SELECT id FROM public.categories WHERE slug='oriental-amber'), 'Oriental',
   38500, '/src/assets/perfume-7.png',
   ARRAY['Saffron','Bergamot'], ARRAY['Oud','Black Rose'], ARRAY['Amber','Musk'],
   true, true, 9, 8, 8, 7, 8, 9, 'Autumn', 'Evening',
   'oriental','strong','mysterious','autumn','evening','unisex', 1),
  ('Sang Royal', 'sang-royal', 'The crown jewel of the house.',
   'Aged seven years in Limousin oak, sealed in hand-blown crystal, finished by a single artisan in Grasse.',
   (SELECT id FROM public.categories WHERE slug='oriental-amber'), 'Oriental Woody',
   62000, '/src/assets/spotlight-bottle.png',
   ARRAY['Bergamot'], ARRAY['Black Rose','Oud'], ARRAY['Sandalwood','Vanilla Smoke'],
   true, true, 10, 10, 9, 6, 10, 10, 'Winter', 'Formal',
   'oriental','strong','commanding','winter','formal','unisex', 0),
  ('Rose Femme', 'rose-femme', 'A whisper of Damascena.',
   'Damascena rose lifted by pink pepper, resting on soft white musk.',
   (SELECT id FROM public.categories WHERE slug='floral'), 'Floral',
   29500, '/src/assets/perfume-9.png',
   ARRAY['Pink Pepper','Lychee'], ARRAY['Damascena Rose','Peony'], ARRAY['White Musk','Cedar'],
   true, true, 7, 6, 6, 9, 9, 6, 'Spring', 'Daily',
   'floral','soft','romantic','spring','daily','feminine', 2);

-- =========================================================================
-- spotlight (singleton)
-- =========================================================================
CREATE TABLE public.spotlight (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  perfume_id UUID REFERENCES public.perfumes(id) ON DELETE SET NULL,
  description_override TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.spotlight (id, perfume_id)
  VALUES (1, (SELECT id FROM public.perfumes WHERE slug='sang-royal'));
GRANT SELECT ON public.spotlight TO anon, authenticated;
GRANT UPDATE ON public.spotlight TO authenticated;
GRANT ALL ON public.spotlight TO service_role;
ALTER TABLE public.spotlight ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spotlight readable" ON public.spotlight FOR SELECT USING (true);
CREATE POLICY "spotlight admin update" ON public.spotlight FOR UPDATE TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER spotlight_touch BEFORE UPDATE ON public.spotlight
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

-- =========================================================================
-- offers
-- =========================================================================
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  cta_label TEXT,
  cta_href TEXT,
  placement TEXT NOT NULL CHECK (placement IN ('announcement','slide_in','popup','inline')),
  accent_color TEXT NOT NULL DEFAULT '#c9a961',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers public read active" ON public.offers FOR SELECT USING (active = true OR public.is_current_admin());
CREATE POLICY "offers admin write" ON public.offers FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER offers_touch BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

-- =========================================================================
-- reviews (public submissions, admin approves)
-- =========================================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read approved" ON public.reviews FOR SELECT
  USING (approved = true OR public.is_current_admin());
CREATE POLICY "reviews public submit" ON public.reviews FOR INSERT
  WITH CHECK (approved = false AND char_length(name) BETWEEN 1 AND 80 AND char_length(body) BETWEEN 1 AND 1000);
CREATE POLICY "reviews admin update" ON public.reviews FOR UPDATE TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE POLICY "reviews admin delete" ON public.reviews FOR DELETE TO authenticated
  USING (public.is_current_admin());
CREATE TRIGGER reviews_touch BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

-- =========================================================================
-- media
-- =========================================================================
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  section TEXT NOT NULL CHECK (section IN ('visions','souq_in_motion','instagram','general')),
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media readable" ON public.media FOR SELECT USING (true);
CREATE POLICY "media admin write" ON public.media FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER media_touch BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

-- =========================================================================
-- site_content (key/value CMS)
-- =========================================================================
CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_content readable" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "site_content admin write" ON public.site_content FOR ALL TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER site_content_touch BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();

INSERT INTO public.site_content (key, value) VALUES
  ('hero.title', 'The Perfume Souq'),
  ('hero.subtitle', 'Rare, hand-composed fragrances for those who leave a mark.'),
  ('about.title', 'The House'),
  ('about.body', 'A quiet atelier of scent, born of obsession and restraint.'),
  ('closing.line1', 'Command attention in silence.'),
  ('closing.line2', 'Dare to be remembered.'),
  ('closing.line3', 'A scent is the silence you leave behind.'),
  ('footer.tagline', 'Est. 2026 — The Perfume Souq'),
  ('footer.copyright', '© 2026 The Perfume Souq. All rights reserved.'),
  ('spotlight.eyebrow', 'Maison Spotlight')
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- settings (singleton)
-- =========================================================================
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp_number TEXT NOT NULL DEFAULT '923228408507', -- international format required by wa.me links
  instagram_handle TEXT NOT NULL DEFAULT 'theperfumesouq.pk',
  community_link TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.settings (id) VALUES (1);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings admin update" ON public.settings FOR UPDATE TO authenticated
  USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.tps_touch_updated_at();
