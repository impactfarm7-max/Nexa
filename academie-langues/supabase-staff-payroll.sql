-- =============================================================================
-- Paie staff — bulletin de période (additif)
-- Ne modifie PAS profiles.base_salary / profiles.prime ni la fiche RH.
-- Ces colonnes restent le "contrat" ; ici on fige un snapshot par mois.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.staff_payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_ym text NOT NULL CHECK (period_ym ~ '^\d{4}-\d{2}$'),
  base_salary_snapshot numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validated', 'paid')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, period_ym)
);

CREATE INDEX IF NOT EXISTS idx_staff_payroll_periods_center
  ON public.staff_payroll_periods (center_id, period_ym DESC);

CREATE INDEX IF NOT EXISTS idx_staff_payroll_periods_staff
  ON public.staff_payroll_periods (staff_id, period_ym DESC);

CREATE TABLE IF NOT EXISTS public.staff_payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.staff_payroll_periods(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('prime', 'retenue', 'ajustement')),
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_payroll_lines_period
  ON public.staff_payroll_lines (period_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.staff_payroll_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.staff_payroll_periods(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'especes',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_payroll_payments_period
  ON public.staff_payroll_payments (period_id, payment_date DESC);

ALTER TABLE public.staff_payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payroll_payments ENABLE ROW LEVEL SECURITY;

-- Lecture : même centre
DROP POLICY IF EXISTS staff_payroll_periods_select ON public.staff_payroll_periods;
CREATE POLICY staff_payroll_periods_select ON public.staff_payroll_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.center_id = staff_payroll_periods.center_id
        AND viewer.center_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS staff_payroll_periods_write ON public.staff_payroll_periods;
CREATE POLICY staff_payroll_periods_write ON public.staff_payroll_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('admin', 'center_manager', 'campus_manager')
        AND viewer.center_id = staff_payroll_periods.center_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('admin', 'center_manager', 'campus_manager')
        AND viewer.center_id = staff_payroll_periods.center_id
    )
  );

DROP POLICY IF EXISTS staff_payroll_lines_select ON public.staff_payroll_lines;
CREATE POLICY staff_payroll_lines_select ON public.staff_payroll_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.staff_payroll_periods p
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE p.id = staff_payroll_lines.period_id
        AND viewer.center_id = p.center_id
    )
  );

DROP POLICY IF EXISTS staff_payroll_lines_write ON public.staff_payroll_lines;
CREATE POLICY staff_payroll_lines_write ON public.staff_payroll_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.staff_payroll_periods p
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE p.id = staff_payroll_lines.period_id
        AND viewer.center_id = p.center_id
        AND viewer.role IN ('admin', 'center_manager', 'campus_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_payroll_periods p
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE p.id = staff_payroll_lines.period_id
        AND viewer.center_id = p.center_id
        AND viewer.role IN ('admin', 'center_manager', 'campus_manager')
    )
  );

DROP POLICY IF EXISTS staff_payroll_payments_select ON public.staff_payroll_payments;
CREATE POLICY staff_payroll_payments_select ON public.staff_payroll_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.staff_payroll_periods p
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE p.id = staff_payroll_payments.period_id
        AND viewer.center_id = p.center_id
    )
  );

DROP POLICY IF EXISTS staff_payroll_payments_write ON public.staff_payroll_payments;
CREATE POLICY staff_payroll_payments_write ON public.staff_payroll_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.staff_payroll_periods p
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE p.id = staff_payroll_payments.period_id
        AND viewer.center_id = p.center_id
        AND viewer.role IN ('admin', 'center_manager', 'campus_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_payroll_periods p
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE p.id = staff_payroll_payments.period_id
        AND viewer.center_id = p.center_id
        AND viewer.role IN ('admin', 'center_manager', 'campus_manager')
    )
  );
