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
