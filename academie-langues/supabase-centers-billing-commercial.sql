-- ============================================================
-- Billing & commercial ops for B2B centres (superadmin)
-- Run in Supabase SQL editor after deploy.
-- ============================================================

ALTER TABLE centers ADD COLUMN IF NOT EXISTS billing_status text;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS commercial_intent text;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS commercial_note text;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS upgrade_requested_at timestamptz;

-- billing_status: current | unpaid | grace | null (unknown)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'centers_billing_status_check'
  ) THEN
    ALTER TABLE centers
      ADD CONSTRAINT centers_billing_status_check
      CHECK (
        billing_status IS NULL
        OR billing_status IN ('current', 'unpaid', 'grace')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'centers_commercial_intent_check'
  ) THEN
    ALTER TABLE centers
      ADD CONSTRAINT centers_commercial_intent_check
      CHECK (
        commercial_intent IS NULL
        OR commercial_intent IN ('upgrade', 'renewal', 'custom_quote', 'trial_convert')
      );
  END IF;
END $$;

UPDATE centers
SET billing_status = 'current'
WHERE billing_status IS NULL
  AND status = 'active'
  AND nexa_offer IS NOT NULL;
