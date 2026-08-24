-- Rentabilité par campus et contrôle de rattachement des encaissements.

CREATE TABLE IF NOT EXISTS public.campus_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  campus_id uuid NOT NULL REFERENCES public.campuses(id) ON DELETE CASCADE,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  label text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campus_expenses_center_date
  ON public.campus_expenses(center_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_campus_expenses_campus_date
  ON public.campus_expenses(campus_id, expense_date DESC);

ALTER TABLE public.campus_expenses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.require_payment_enrollment_campus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enrollment_campus_id uuid;
  enrollment_center_id uuid;
BEGIN
  SELECT campus_id, center_id
    INTO enrollment_campus_id, enrollment_center_id
  FROM public.enrollments
  WHERE id = NEW.enrollment_id;

  IF enrollment_campus_id IS NULL THEN
    RAISE EXCEPTION 'Affectez d''abord cette inscription à un campus avant d''enregistrer un paiement.';
  END IF;

  IF enrollment_center_id IS DISTINCT FROM NEW.center_id THEN
    RAISE EXCEPTION 'Le campus et le paiement doivent appartenir au même centre.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_payment_enrollment_campus ON public.student_payments;
CREATE TRIGGER trg_require_payment_enrollment_campus
BEFORE INSERT ON public.student_payments
FOR EACH ROW EXECUTE FUNCTION public.require_payment_enrollment_campus();

