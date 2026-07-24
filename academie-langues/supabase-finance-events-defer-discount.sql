-- =============================================================================
-- Finance unifiée : moratoire (report) + réduction dossier + journal d'événements
-- Ne modifie PAS record_payment ni le template payment_plan des filières.
-- =============================================================================

-- A. Colonnes report sur échéances
ALTER TABLE public.enrollment_installments
  ADD COLUMN IF NOT EXISTS original_due_date date,
  ADD COLUMN IF NOT EXISTS deferral_reason text,
  ADD COLUMN IF NOT EXISTS deferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS deferred_by uuid;

-- B. Colonnes réduction sur inscriptions
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS discount_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS discount_applied_by uuid;

-- C. Journal d'événements finance
CREATE TABLE IF NOT EXISTS public.enrollment_finance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.enrollment_installments(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('deferral', 'discount', 'payment_note')),
  amount numeric,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_finance_events_enrollment
  ON public.enrollment_finance_events (enrollment_id, created_at DESC);

-- =============================================================================
-- RPC : report d'échéance (moratoire)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.defer_installment(
  p_installment_id uuid,
  p_new_due_date date,
  p_reason text,
  p_actor uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inst public.enrollment_installments%ROWTYPE;
  v_actor uuid := COALESCE(p_actor, auth.uid());
  v_old_due date;
  v_event_id uuid;
BEGIN
  IF p_installment_id IS NULL THEN
    RAISE EXCEPTION 'Échéance requise.';
  END IF;
  IF p_new_due_date IS NULL THEN
    RAISE EXCEPTION 'Nouvelle date de paiement requise.';
  END IF;
  IF trim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Motif du report requis.';
  END IF;

  SELECT * INTO v_inst
  FROM public.enrollment_installments
  WHERE id = p_installment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Échéance introuvable.';
  END IF;

  IF v_inst.status = 'paid' OR COALESCE(v_inst.paid_amount, 0) >= COALESCE(v_inst.amount, 0) THEN
    RAISE EXCEPTION 'Impossible de reporter une échéance déjà soldée.';
  END IF;

  IF p_new_due_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'La nouvelle date doit être postérieure à aujourd''hui.';
  END IF;

  v_old_due := v_inst.due_date;

  UPDATE public.enrollment_installments
  SET
    original_due_date = COALESCE(original_due_date, due_date),
    due_date = p_new_due_date,
    deferral_reason = trim(p_reason),
    deferred_at = now(),
    deferred_by = v_actor
  WHERE id = p_installment_id;

  INSERT INTO public.enrollment_finance_events (
    enrollment_id, installment_id, type, amount, payload, reason, created_by
  ) VALUES (
    v_inst.enrollment_id,
    p_installment_id,
    'deferral',
    NULL,
    jsonb_build_object(
      'old_due_date', v_old_due,
      'new_due_date', p_new_due_date,
      'label', v_inst.label
    ),
    trim(p_reason),
    v_actor
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- =============================================================================
-- RPC : réduction dossier + redistribution des échéances non soldées
-- =============================================================================
CREATE OR REPLACE FUNCTION public.apply_enrollment_discount(
  p_enrollment_id uuid,
  p_amount numeric,
  p_reason text,
  p_actor uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enr public.enrollments%ROWTYPE;
  v_actor uuid := COALESCE(p_actor, auth.uid());
  v_paid numeric;
  v_old_tuition numeric;
  v_new_tuition numeric;
  v_new_discount numeric;
  v_remain_due numeric;
  v_unpaid_total numeric;
  v_event_id uuid;
  r RECORD;
  v_share numeric;
  v_allocated numeric := 0;
  v_count int := 0;
  v_idx int := 0;
  v_new_amount numeric;
  v_paid_on_row numeric;
BEGIN
  IF p_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'Inscription requise.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant de réduction invalide.';
  END IF;
  IF trim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Motif de la réduction requis.';
  END IF;

  SELECT * INTO v_enr
  FROM public.enrollments
  WHERE id = p_enrollment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscription introuvable.';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.student_payments
  WHERE enrollment_id = p_enrollment_id;

  v_old_tuition := COALESCE(v_enr.tuition_fee, 0);
  IF p_amount > GREATEST(0, v_old_tuition - v_paid) THEN
    RAISE EXCEPTION 'La réduction dépasse le reste à payer (% F).',
      (v_old_tuition - v_paid);
  END IF;
  IF p_amount >= v_old_tuition AND v_paid = 0 THEN
    RAISE EXCEPTION 'La réduction doit laisser un montant dû strictement positif, ou utiliser une exemption dédiée.';
  END IF;

  v_new_tuition := v_old_tuition - p_amount;
  IF v_new_tuition < v_paid THEN
    RAISE EXCEPTION 'La réduction rendrait le total dû inférieur aux paiements déjà encaissés.';
  END IF;

  v_new_discount := COALESCE(v_enr.discount_amount, 0) + p_amount;

  UPDATE public.enrollments
  SET
    tuition_fee = v_new_tuition,
    discount_amount = v_new_discount,
    discount_reason = trim(p_reason),
    discount_applied_at = now(),
    discount_applied_by = v_actor
  WHERE id = p_enrollment_id;

  v_remain_due := v_new_tuition - v_paid;

  -- Total restant sur échéances non soldées (montant - déjà payé sur la ligne)
  SELECT COALESCE(SUM(GREATEST(0, COALESCE(amount, 0) - COALESCE(paid_amount, 0))), 0),
         COUNT(*)
    INTO v_unpaid_total, v_count
  FROM public.enrollment_installments
  WHERE enrollment_id = p_enrollment_id
    AND status IS DISTINCT FROM 'paid'
    AND GREATEST(0, COALESCE(amount, 0) - COALESCE(paid_amount, 0)) > 0;

  IF v_count > 0 AND v_unpaid_total > 0 THEN
    FOR r IN
      SELECT id, amount, COALESCE(paid_amount, 0) AS paid_amount
      FROM public.enrollment_installments
      WHERE enrollment_id = p_enrollment_id
        AND status IS DISTINCT FROM 'paid'
        AND GREATEST(0, COALESCE(amount, 0) - COALESCE(paid_amount, 0)) > 0
      ORDER BY position NULLS LAST, due_date NULLS LAST, id
    LOOP
      v_idx := v_idx + 1;
      v_paid_on_row := r.paid_amount;
      IF v_idx = v_count THEN
        -- Dernière ligne : absorbe l'arrondi
        v_new_amount := v_paid_on_row + GREATEST(0, v_remain_due - v_allocated);
      ELSE
        v_share := GREATEST(0, r.amount - v_paid_on_row) / v_unpaid_total;
        v_new_amount := v_paid_on_row + ROUND(v_remain_due * v_share);
        v_allocated := v_allocated + (v_new_amount - v_paid_on_row);
      END IF;

      UPDATE public.enrollment_installments
      SET
        amount = v_new_amount,
        status = CASE
          WHEN v_paid_on_row <= 0 THEN 'pending'
          WHEN v_paid_on_row >= v_new_amount THEN 'paid'
          ELSE 'partial'
        END
      WHERE id = r.id;
    END LOOP;
  ELSIF v_count = 0 AND v_remain_due > 0 THEN
    -- Pas d'échéance ouverte : créer une échéance solde
    INSERT INTO public.enrollment_installments (
      enrollment_id, label, amount, due_date, status, paid_amount, position
    ) VALUES (
      p_enrollment_id,
      'Solde après réduction',
      v_remain_due,
      CURRENT_DATE,
      'pending',
      0,
      COALESCE((
        SELECT MAX(position) FROM public.enrollment_installments WHERE enrollment_id = p_enrollment_id
      ), 0) + 1
    );
  END IF;

  INSERT INTO public.enrollment_finance_events (
    enrollment_id, installment_id, type, amount, payload, reason, created_by
  ) VALUES (
    p_enrollment_id,
    NULL,
    'discount',
    p_amount,
    jsonb_build_object(
      'old_tuition_fee', v_old_tuition,
      'new_tuition_fee', v_new_tuition,
      'discount_amount_total', v_new_discount,
      'tuition_paid', v_paid
    ),
    trim(p_reason),
    v_actor
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.defer_installment(uuid, date, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.defer_installment(uuid, date, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_enrollment_discount(uuid, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_enrollment_discount(uuid, numeric, text, uuid) TO service_role;
