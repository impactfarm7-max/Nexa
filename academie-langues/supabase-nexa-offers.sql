-- Offres B2B NEXA (Access / Lite / Advance / Ultra)
-- À exécuter dans le SQL Editor Supabase.

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS nexa_offer text;

ALTER TABLE public.centers
  DROP CONSTRAINT IF EXISTS centers_nexa_offer_check;

ALTER TABLE public.centers
  ADD CONSTRAINT centers_nexa_offer_check
  CHECK (nexa_offer IS NULL OR nexa_offer IN ('access', 'lite', 'advance', 'ultra'));

COMMENT ON COLUMN public.centers.nexa_offer IS
  'Offre B2B NEXA: access | lite | advance | ultra. NULL = non choisie (Ultra pendant essai 72h).';
