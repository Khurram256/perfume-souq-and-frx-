-- =========================================================================
-- Fix: catalog_v3 (20260718200000) set tag_family and tag_occasion to
-- comma-joined multi-value strings (e.g. 'fruity,gourmand,sweet',
-- 'evening,date night') for the 29 imported products. The established
-- convention (see the original 4 seed products) is a SINGLE canonical word
-- per tag column — the FragranceQuiz "mood" and "occasion" questions
-- render each distinct tag_family/tag_occasion value as one selectable
-- button, so multi-value strings produced garbled combined labels like
-- "Fruity,Gourmand,Sweet" instead of clean single-word choices.
--
-- This picks one representative canonical value per product (aligned with
-- its category where sensible) so the quiz shows a small, clean set of
-- moods (oriental, floral, woody, gourmand, fougere, aquatic) and
-- occasions (everyday, evening, date night, formal, office).
-- =========================================================================

UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'burberry-her-elixir-de-parfum';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'hugo-boss-alive-parfum';
UPDATE public.perfumes SET tag_family = 'woody' WHERE slug = 'hugo-boss-bottled-night';
UPDATE public.perfumes SET tag_family = 'woody' WHERE slug = 'boss-bottled-absolu';
UPDATE public.perfumes SET tag_family = 'floral' WHERE slug = 'coach-wild-rose';
UPDATE public.perfumes SET tag_family = 'floral' WHERE slug = 'coach-floral-blush';
UPDATE public.perfumes SET tag_family = 'floral' WHERE slug = 'coach-love';
UPDATE public.perfumes SET tag_family = 'gourmand' WHERE slug = 'afnan-delicious-bouquet';
UPDATE public.perfumes SET tag_family = 'gourmand' WHERE slug = 'afnan-cherry-bouquet';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'lattafa-khamrah';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'lattafa-khamrah-qahwa';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'lattafa-fire-on-ice';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'lattafa-angham';
UPDATE public.perfumes SET tag_family = 'woody' WHERE slug = 'lattafa-his-confession';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'lattafa-yara';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'lattafa-yara-elixir';
UPDATE public.perfumes SET tag_family = 'floral' WHERE slug = 'gucci-bloom';
UPDATE public.perfumes SET tag_family = 'floral' WHERE slug = 'gucci-flora';
UPDATE public.perfumes SET tag_family = 'aquatic' WHERE slug = 'acqua-di-gio-eau-de-parfum';
UPDATE public.perfumes SET tag_family = 'fougere' WHERE slug = 'stronger-with-you-intensely';
UPDATE public.perfumes SET tag_family = 'fougere' WHERE slug = 'stronger-with-you-absolutely';
UPDATE public.perfumes SET tag_family = 'fougere' WHERE slug = 'stronger-with-you-parfum';
UPDATE public.perfumes SET tag_family = 'floral' WHERE slug = 'armani-my-way';
UPDATE public.perfumes SET tag_family = 'oriental' WHERE slug = 'armani-my-way-intense';
UPDATE public.perfumes SET tag_family = 'floral' WHERE slug = 'chanel-no-5-eau-premiere';
UPDATE public.perfumes SET tag_family = 'woody' WHERE slug = 'bleu-de-chanel-eau-de-parfum';
UPDATE public.perfumes SET tag_family = 'woody' WHERE slug = 'bleu-de-chanel-parfum';
-- my-burberry and kingdon intentionally left with no tag_family (needs_confirmation items).

UPDATE public.perfumes SET tag_occasion = 'date night' WHERE slug = 'burberry-her-elixir-de-parfum';
UPDATE public.perfumes SET tag_occasion = 'formal' WHERE slug = 'hugo-boss-alive-parfum';
UPDATE public.perfumes SET tag_occasion = 'evening' WHERE slug = 'hugo-boss-bottled-night';
UPDATE public.perfumes SET tag_occasion = 'formal' WHERE slug = 'boss-bottled-absolu';
UPDATE public.perfumes SET tag_occasion = 'everyday' WHERE slug = 'coach-wild-rose';
UPDATE public.perfumes SET tag_occasion = 'office' WHERE slug = 'coach-floral-blush';
UPDATE public.perfumes SET tag_occasion = 'date night' WHERE slug = 'coach-love';
UPDATE public.perfumes SET tag_occasion = 'everyday' WHERE slug = 'afnan-delicious-bouquet';
UPDATE public.perfumes SET tag_occasion = 'evening' WHERE slug = 'afnan-cherry-bouquet';
UPDATE public.perfumes SET tag_occasion = 'evening' WHERE slug = 'lattafa-khamrah';
UPDATE public.perfumes SET tag_occasion = 'evening' WHERE slug = 'lattafa-khamrah-qahwa';
UPDATE public.perfumes SET tag_occasion = 'evening' WHERE slug = 'lattafa-fire-on-ice';
UPDATE public.perfumes SET tag_occasion = 'everyday' WHERE slug = 'lattafa-angham';
UPDATE public.perfumes SET tag_occasion = 'evening' WHERE slug = 'lattafa-his-confession';
UPDATE public.perfumes SET tag_occasion = 'everyday' WHERE slug = 'lattafa-yara';
UPDATE public.perfumes SET tag_occasion = 'date night' WHERE slug = 'lattafa-yara-elixir';
UPDATE public.perfumes SET tag_occasion = 'office' WHERE slug = 'gucci-bloom';
UPDATE public.perfumes SET tag_occasion = 'office' WHERE slug = 'gucci-flora';
UPDATE public.perfumes SET tag_occasion = 'date night' WHERE slug = 'stronger-with-you-intensely';
UPDATE public.perfumes SET tag_occasion = 'formal' WHERE slug = 'stronger-with-you-absolutely';
UPDATE public.perfumes SET tag_occasion = 'formal' WHERE slug = 'stronger-with-you-parfum';
UPDATE public.perfumes SET tag_occasion = 'office' WHERE slug = 'armani-my-way';
UPDATE public.perfumes SET tag_occasion = 'formal' WHERE slug = 'armani-my-way-intense';
UPDATE public.perfumes SET tag_occasion = 'office' WHERE slug = 'chanel-no-5-eau-premiere';
UPDATE public.perfumes SET tag_occasion = 'office' WHERE slug = 'bleu-de-chanel-eau-de-parfum';
UPDATE public.perfumes SET tag_occasion = 'formal' WHERE slug = 'bleu-de-chanel-parfum';
-- my-burberry, kingdon, acqua-di-gio-eau-de-parfum intentionally left with no
-- tag_occasion (ambiguous/needs_confirmation items never had one set).
