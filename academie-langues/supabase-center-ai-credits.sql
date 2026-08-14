-- Profile counters for centre-side AI surplus (student tutor/exam already exist)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_corrections_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_corrections_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS course_builder_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS course_builder_used integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.center_ai_credit_wallets (
  center_id uuid PRIMARY KEY REFERENCES public.centers(id) ON DELETE CASCADE,
  generic integer NOT NULL DEFAULT 0 CHECK (generic >= 0),
  tutor_ia integer NOT NULL DEFAULT 0 CHECK (tutor_ia >= 0),
  exam_sim integer NOT NULL DEFAULT 0 CHECK (exam_sim >= 0),
  ai_corrections integer NOT NULL DEFAULT 0 CHECK (ai_corrections >= 0),
  course_builder integer NOT NULL DEFAULT 0 CHECK (course_builder >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.center_ai_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('generic', 'typed')),
  credit_type text CHECK (
    credit_type IS NULL OR credit_type IN ('tutor_ia', 'exam_sim', 'ai_corrections', 'course_builder')
  ),
  quantity integer NOT NULL CHECK (quantity >= 1),
  amount_fcfa integer,
  note text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (mode = 'generic' AND credit_type IS NULL)
    OR (mode = 'typed' AND credit_type IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_center_ai_credit_purchases_center
  ON public.center_ai_credit_purchases (center_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.center_ai_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credit_type text NOT NULL CHECK (credit_type IN ('tutor_ia', 'exam_sim', 'ai_corrections', 'course_builder')),
  quantity integer NOT NULL CHECK (quantity >= 1),
  source text NOT NULL CHECK (source IN ('generic', 'typed')),
  payment_amount integer,
  payment_reason text,
  granted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_center_ai_credit_grants_center
  ON public.center_ai_credit_grants (center_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_center_ai_credit_grants_beneficiary
  ON public.center_ai_credit_grants (beneficiary_id, created_at DESC);

-- Service role used by Next APIs; lock down direct client access
ALTER TABLE public.center_ai_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_ai_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_ai_credit_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.purchase_center_ai_credits(
  p_center_id uuid,
  p_mode text,
  p_credit_type text,
  p_quantity integer,
  p_amount_fcfa integer,
  p_note text,
  p_created_by uuid
)
RETURNS TABLE (
  wallet_generic integer,
  wallet_tutor_ia integer,
  wallet_exam_sim integer,
  wallet_ai_corrections integer,
  wallet_course_builder integer,
  purchase_id uuid,
  purchase_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wallet public.center_ai_credit_wallets%ROWTYPE;
  v_purchase public.center_ai_credit_purchases%ROWTYPE;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;

  IF p_mode = 'generic' THEN
    IF p_credit_type IS NOT NULL THEN
      RAISE EXCEPTION 'INVALID_PURCHASE' USING ERRCODE = '22023';
    END IF;
  ELSIF p_mode = 'typed' THEN
    IF p_credit_type IS NULL OR p_credit_type NOT IN (
      'tutor_ia',
      'exam_sim',
      'ai_corrections',
      'course_builder'
    ) THEN
      RAISE EXCEPTION 'INVALID_PURCHASE' USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'INVALID_PURCHASE' USING ERRCODE = '22023';
  END IF;

  IF p_amount_fcfa IS NOT NULL AND p_amount_fcfa < 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.center_ai_credit_wallets (
    center_id,
    generic,
    tutor_ia,
    exam_sim,
    ai_corrections,
    course_builder,
    updated_at
  )
  VALUES (
    p_center_id,
    CASE WHEN p_mode = 'generic' THEN p_quantity ELSE 0 END,
    CASE WHEN p_credit_type = 'tutor_ia' THEN p_quantity ELSE 0 END,
    CASE WHEN p_credit_type = 'exam_sim' THEN p_quantity ELSE 0 END,
    CASE WHEN p_credit_type = 'ai_corrections' THEN p_quantity ELSE 0 END,
    CASE WHEN p_credit_type = 'course_builder' THEN p_quantity ELSE 0 END,
    now()
  )
  ON CONFLICT (center_id) DO UPDATE
  SET
    generic = center_ai_credit_wallets.generic + EXCLUDED.generic,
    tutor_ia = center_ai_credit_wallets.tutor_ia + EXCLUDED.tutor_ia,
    exam_sim = center_ai_credit_wallets.exam_sim + EXCLUDED.exam_sim,
    ai_corrections = center_ai_credit_wallets.ai_corrections + EXCLUDED.ai_corrections,
    course_builder = center_ai_credit_wallets.course_builder + EXCLUDED.course_builder,
    updated_at = now()
  RETURNING * INTO v_wallet;

  INSERT INTO public.center_ai_credit_purchases (
    center_id,
    mode,
    credit_type,
    quantity,
    amount_fcfa,
    note,
    created_by
  )
  VALUES (
    p_center_id,
    p_mode,
    p_credit_type,
    p_quantity,
    p_amount_fcfa,
    p_note,
    p_created_by
  )
  RETURNING * INTO v_purchase;

  RETURN QUERY
  SELECT
    v_wallet.generic,
    v_wallet.tutor_ia,
    v_wallet.exam_sim,
    v_wallet.ai_corrections,
    v_wallet.course_builder,
    v_purchase.id,
    v_purchase.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_center_ai_credits(
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_center_ai_credits(
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.grant_center_ai_credits(
  p_center_id uuid,
  p_beneficiary_id uuid,
  p_credit_type text,
  p_profile_total_column text,
  p_quantity integer,
  p_source text,
  p_payment_amount integer,
  p_payment_reason text,
  p_granted_by uuid
)
RETURNS TABLE (
  wallet_generic integer,
  wallet_tutor_ia integer,
  wallet_exam_sim integer,
  wallet_ai_corrections integer,
  wallet_course_builder integer,
  grant_id uuid,
  grant_created_at timestamptz,
  beneficiary_tutor_ia_total integer,
  beneficiary_exam_total integer,
  beneficiary_ai_corrections_total integer,
  beneficiary_course_builder_total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wallet public.center_ai_credit_wallets%ROWTYPE;
  v_grant public.center_ai_credit_grants%ROWTYPE;
  v_beneficiary public.profiles%ROWTYPE;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = '22023';
  END IF;
  IF p_credit_type IS NULL OR p_credit_type NOT IN (
    'tutor_ia',
    'exam_sim',
    'ai_corrections',
    'course_builder'
  ) THEN
    RAISE EXCEPTION 'INVALID_TYPE' USING ERRCODE = '22023';
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('generic', 'typed') THEN
    RAISE EXCEPTION 'INVALID_SOURCE' USING ERRCODE = '22023';
  END IF;
  IF p_profile_total_column IS DISTINCT FROM CASE p_credit_type
    WHEN 'tutor_ia' THEN 'tutor_ia_total'
    WHEN 'exam_sim' THEN 'exam_total'
    WHEN 'ai_corrections' THEN 'ai_corrections_total'
    WHEN 'course_builder' THEN 'course_builder_total'
  END THEN
    RAISE EXCEPTION 'INVALID_PROFILE_TOTAL_COLUMN' USING ERRCODE = '22023';
  END IF;
  IF (p_payment_amount IS NULL) <> (p_payment_reason IS NULL)
    OR (p_payment_amount IS NOT NULL AND p_payment_amount < 1)
    OR (p_payment_reason IS NOT NULL AND btrim(p_payment_reason) = '')
  THEN
    RAISE EXCEPTION 'INVALID_PAYMENT' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_beneficiary
  FROM public.profiles
  WHERE id = p_beneficiary_id
    AND center_id = p_center_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BENEFICIARY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.center_ai_credit_wallets (center_id)
  VALUES (p_center_id)
  ON CONFLICT (center_id) DO NOTHING;

  SELECT *
  INTO v_wallet
  FROM public.center_ai_credit_wallets
  WHERE center_id = p_center_id
  FOR UPDATE;

  IF p_source = 'generic' THEN
    IF v_wallet.generic < p_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
    END IF;
    v_wallet.generic := v_wallet.generic - p_quantity;
  ELSIF p_credit_type = 'tutor_ia' THEN
    IF v_wallet.tutor_ia < p_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
    END IF;
    v_wallet.tutor_ia := v_wallet.tutor_ia - p_quantity;
  ELSIF p_credit_type = 'exam_sim' THEN
    IF v_wallet.exam_sim < p_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
    END IF;
    v_wallet.exam_sim := v_wallet.exam_sim - p_quantity;
  ELSIF p_credit_type = 'ai_corrections' THEN
    IF v_wallet.ai_corrections < p_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
    END IF;
    v_wallet.ai_corrections := v_wallet.ai_corrections - p_quantity;
  ELSE
    IF v_wallet.course_builder < p_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
    END IF;
    v_wallet.course_builder := v_wallet.course_builder - p_quantity;
  END IF;

  UPDATE public.center_ai_credit_wallets
  SET
    generic = v_wallet.generic,
    tutor_ia = v_wallet.tutor_ia,
    exam_sim = v_wallet.exam_sim,
    ai_corrections = v_wallet.ai_corrections,
    course_builder = v_wallet.course_builder,
    updated_at = now()
  WHERE center_id = p_center_id
  RETURNING * INTO v_wallet;

  EXECUTE format(
    'UPDATE public.profiles
     SET %1$I = COALESCE(%1$I, 0) + $1
     WHERE id = $2 AND center_id = $3
     RETURNING *',
    p_profile_total_column
  )
  INTO v_beneficiary
  USING p_quantity, p_beneficiary_id, p_center_id;

  INSERT INTO public.center_ai_credit_grants (
    center_id,
    beneficiary_id,
    credit_type,
    quantity,
    source,
    payment_amount,
    payment_reason,
    granted_by
  )
  VALUES (
    p_center_id,
    p_beneficiary_id,
    p_credit_type,
    p_quantity,
    p_source,
    p_payment_amount,
    p_payment_reason,
    p_granted_by
  )
  RETURNING * INTO v_grant;

  RETURN QUERY
  SELECT
    v_wallet.generic,
    v_wallet.tutor_ia,
    v_wallet.exam_sim,
    v_wallet.ai_corrections,
    v_wallet.course_builder,
    v_grant.id,
    v_grant.created_at,
    COALESCE(v_beneficiary.tutor_ia_total, 0),
    COALESCE(v_beneficiary.exam_total, 0),
    COALESCE(v_beneficiary.ai_corrections_total, 0),
    COALESCE(v_beneficiary.course_builder_total, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_center_ai_credits(
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  uuid
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_center_ai_credits(
  uuid,
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  uuid
) TO service_role;
