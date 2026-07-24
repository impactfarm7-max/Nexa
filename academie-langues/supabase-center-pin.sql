-- PIN personnel centre + zones protégées
-- pin_hash existe déjà sur profiles (login / déverrouillage app)
-- Exécuter dans Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pin_settings jsonb NOT NULL DEFAULT '{
    "secure_programme": false,
    "secure_etudiants": false,
    "block_downloads": false
  }'::jsonb;

COMMENT ON COLUMN profiles.pin_settings IS 'Toggles PIN pour zones sensibles espace centre (secure_programme, secure_etudiants, block_downloads)';
