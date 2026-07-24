-- A executer dans Supabase SQL Editor
-- Fix Finance : reçus par centre + FK échéances + RPC record_payment
--
-- 1. Reçus : contrainte globale → unique (center_id, receipt_number)
-- 2. FK installment_id : installments (legacy) → enrollment_installments
-- 3. RPC record_payment unique avec préfixe centre sur le reçu

-- ============================================================
-- 0. Table séquence (si absente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.center_receipt_seq (
  center_id uuid PRIMARY KEY REFERENCES public.centers(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0,
  prefix text NOT NULL DEFAULT 'RC'
);

-- ============================================================
-- 1. Option B — unicité par centre (pas globale)
-- ============================================================
ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_receipt_unique;

ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_receipt_center_unique;

-- Avant d'appliquer : vérifier qu'il n'y a pas de doublons DANS le même centre
-- SELECT center_id, receipt_number, COUNT(*)
-- FROM student_payments
-- WHERE receipt_number IS NOT NULL
-- GROUP BY 1, 2 HAVING COUNT(*) > 1;

ALTER TABLE public.student_payments
  ADD CONSTRAINT student_payments_receipt_center_unique
  UNIQUE (center_id, receipt_number);

-- ============================================================
-- 1b. FK échéances — enrollment_installments (pas installments legacy)
-- ============================================================
UPDATE public.student_payments sp
SET installment_id = NULL
WHERE sp.installment_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollment_installments ei
    WHERE ei.id = sp.installment_id
  );

ALTER TABLE public.student_payments
  DROP CONSTRAINT IF EXISTS student_payments_installment_id_fkey;

ALTER TABLE public.student_payments
  ADD CONSTRAINT student_payments_installment_id_fkey
  FOREIGN KEY (installment_id)
  REFERENCES public.enrollment_installments(id)
  ON DELETE SET NULL;

-- ============================================================
-- 2. Option C — resynchroniser last_number depuis les paiements existants
-- ============================================================
INSERT INTO public.center_receipt_seq (center_id, last_number, prefix)
SELECT c.id, 0, 'RC'
FROM public.centers c
ON CONFLICT (center_id) DO NOTHING;

UPDATE public.center_receipt_seq crs
SET last_number = GREATEST(
  crs.last_number,
  COALESCE(sub.max_seq, 0)
)
FROM (
  SELECT
    sp.center_id,
    MAX(
      CASE
        WHEN sp.receipt_number ~ '-[0-9]+$'
        THEN NULLIF(regexp_replace(sp.receipt_number, '^.*-', ''), '')::integer
        ELSE 0
      END
    ) AS max_seq
  FROM public.student_payments sp
  WHERE sp.center_id IS NOT NULL
    AND sp.receipt_number IS NOT NULL
  GROUP BY sp.center_id
) sub
WHERE crs.center_id = sub.center_id;

-- ============================================================
-- 3. Option D — supprimer l'ancienne surcharge legacy (p_student_id)
-- ============================================================
DROP FUNCTION IF EXISTS public.record_payment(
  uuid, uuid, numeric, text, uuid, text
);

-- ============================================================
-- 4. Option A + B — record_payment avec préfixe centre + séquence verrouillée
--    (surcharge utilisée par /centre/finance et StudentFinanceTab)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_payment(
  p_enrollment_id uuid,
  p_center_id uuid,
  p_amount numeric,
  p_method text DEFAULT 'Mobile Money'::text,
  p_installment_id uuid DEFAULT NULL::uuid,
  p_recorded_by uuid DEFAULT NULL::uuid,
  p_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_id uuid;
  v_receipt text;
  v_seq integer;
  v_prefix text;
  v_center_code text;
  v_remaining numeric;
  v_inst record;
BEGIN
  IF p_enrollment_id IS NULL OR p_center_id IS NULL THEN
    RAISE EXCEPTION 'enrollment_id et center_id requis.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Montant invalide.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.filieres f ON f.id = e.filiere_id
    WHERE e.id = p_enrollment_id
      AND f.center_id = p_center_id
  ) THEN
    RAISE EXCEPTION 'Inscription introuvable pour ce centre.';
  END IF;

  IF p_installment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.enrollment_installments ei
    WHERE ei.id = p_installment_id
      AND ei.enrollment_id = p_enrollment_id
  ) THEN
    RAISE EXCEPTION 'Échéance invalide pour cette inscription.';
  END IF;

  -- Code centre lisible sur le reçu (slug > code > fallback)
  SELECT COALESCE(
    NULLIF(trim(signup_slug), ''),
    NULLIF(trim(code), ''),
    'CTR' || left(p_center_id::text, 4)
  )
  INTO v_center_code
  FROM public.centers
  WHERE id = p_center_id;

  v_center_code := upper(regexp_replace(v_center_code, '[^a-zA-Z0-9]', '', 'g'));
  IF length(v_center_code) > 12 THEN
    v_center_code := left(v_center_code, 12);
  END IF;

  INSERT INTO public.center_receipt_seq (center_id, last_number, prefix)
  VALUES (p_center_id, 0, 'RC')
  ON CONFLICT (center_id) DO NOTHING;

  UPDATE public.center_receipt_seq
     SET last_number = last_number + 1
   WHERE center_id = p_center_id
   RETURNING last_number, prefix INTO v_seq, v_prefix;

  v_receipt := v_center_code || '-' || v_prefix || '-' ||
               to_char(CURRENT_DATE, 'YYYY') || '-' ||
               lpad(v_seq::text, 5, '0');

  INSERT INTO public.student_payments (
    enrollment_id, center_id, amount, payment_method,
    receipt_number, installment_id, recorded_by, notes, payment_date
  ) VALUES (
    p_enrollment_id, p_center_id, p_amount, p_method,
    v_receipt, p_installment_id, COALESCE(p_recorded_by, auth.uid()), p_notes, now()
  ) RETURNING id INTO v_payment_id;

  v_remaining := p_amount;

  IF p_installment_id IS NOT NULL THEN
    UPDATE public.enrollment_installments
       SET paid_amount = LEAST(paid_amount + v_remaining, amount),
           status = CASE
             WHEN LEAST(paid_amount + v_remaining, amount) >= amount THEN 'paid'
             WHEN LEAST(paid_amount + v_remaining, amount) > 0 THEN 'partial'
             ELSE status
           END
     WHERE id = p_installment_id;

    SELECT GREATEST(0, v_remaining - (amount - paid_amount + v_remaining))
      INTO v_remaining
      FROM public.enrollment_installments
     WHERE id = p_installment_id;
  END IF;

  IF v_remaining > 0 THEN
    FOR v_inst IN
      SELECT id, amount, paid_amount
        FROM public.enrollment_installments
       WHERE enrollment_id = p_enrollment_id
         AND status != 'paid'
         AND (p_installment_id IS NULL OR id != p_installment_id)
       ORDER BY "position", due_date
    LOOP
      EXIT WHEN v_remaining <= 0;
      DECLARE
        v_gap numeric := v_inst.amount - v_inst.paid_amount;
        v_apply numeric := LEAST(v_remaining, v_gap);
      BEGIN
        UPDATE public.enrollment_installments
           SET paid_amount = paid_amount + v_apply,
               status = CASE
                 WHEN paid_amount + v_apply >= amount THEN 'paid'
                 WHEN paid_amount + v_apply > 0 THEN 'partial'
                 ELSE status
               END
         WHERE id = v_inst.id;
        v_remaining := v_remaining - v_apply;
      END;
    END LOOP;
  END IF;

  RETURN v_payment_id;
END;
$function$;

-- ============================================================
-- 5. (Optionnel) Échéances TCF manquantes pour inscriptions déjà actives
--    Une seule tranche = montant convenu sur l'inscription (par étudiant)
-- ============================================================
INSERT INTO public.enrollment_installments (
  enrollment_id, label, amount, due_date, status, paid_amount, position
)
SELECT
  e.id,
  'Solde TCF',
  e.tuition_fee,
  COALESCE(e.enrolled_at::date, CURRENT_DATE),
  'pending',
  0,
  1
FROM public.enrollments e
JOIN public.filieres f ON f.id = e.filiere_id AND f.name = 'TCF Canada'
WHERE COALESCE(e.tuition_fee, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollment_installments ei
    WHERE ei.enrollment_id = e.id
  );
