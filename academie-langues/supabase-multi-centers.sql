-- Autorise un même compte à administrer plusieurs centres sans remplacer
-- l'appartenance au centre précédent.

DO $$
DECLARE
  constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.center_users'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (user_id)'
  LOOP
    EXECUTE format('ALTER TABLE public.center_users DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.center_users_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS center_users_center_user_unique
  ON public.center_users(center_id, user_id);

CREATE INDEX IF NOT EXISTS center_users_user_lookup
  ON public.center_users(user_id);

-- Un campus principal par centre, et non un seul campus principal pour toute
-- la plateforme.
DROP INDEX IF EXISTS public.idx_campuses_one_main;
CREATE UNIQUE INDEX idx_campuses_one_main
  ON public.campuses(center_id)
  WHERE is_main = true;
