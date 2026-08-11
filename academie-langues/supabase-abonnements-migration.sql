-- ============================================================
-- Migration: 4-tier subscription system (Découverte/Croissance/Pro/Entreprise)
-- ============================================================

-- 1. Add billing & subscription columns
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_amount integer;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_period_months smallint DEFAULT 1;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS subscription_starts_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS renewal_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS renewal_alert_days smallint DEFAULT 7;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS quota_overrides jsonb;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS pause_reason text;

-- 2. Migrate existing nexa_offer values to new tier names
UPDATE centers SET nexa_offer = 'decouverte' WHERE nexa_offer IN ('access', 'lite');
UPDATE centers SET nexa_offer = 'croissance' WHERE nexa_offer = 'advance';
UPDATE centers SET nexa_offer = 'pro' WHERE nexa_offer = 'ultra';

-- 3. Replace nexa_offer CHECK constraint
ALTER TABLE centers DROP CONSTRAINT IF EXISTS centers_nexa_offer_check;
ALTER TABLE centers ADD CONSTRAINT centers_nexa_offer_check
  CHECK (nexa_offer IN ('decouverte', 'croissance', 'pro', 'entreprise', 'custom'));

-- 4. Extend status CHECK constraint (add 'expired')
ALTER TABLE centers DROP CONSTRAINT IF EXISTS centers_status_check;
ALTER TABLE centers ADD CONSTRAINT centers_status_check
  CHECK (status IN ('active', 'pending', 'suspended', 'rejected', 'expired'));

-- 5. Backfill trial_ends_at for existing pending centers (7-day trial)
UPDATE centers
SET trial_ends_at = created_at + interval '7 days'
WHERE status = 'pending' AND trial_ends_at IS NULL;
