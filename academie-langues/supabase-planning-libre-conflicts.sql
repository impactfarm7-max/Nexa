-- =============================================================================
-- Planning centres libres : conflits formateur + upsert atomique
-- Ne modifie PAS le flux TCF. Réutilise schedule_slots / schedule_slot_groupes.
-- =============================================================================

-- Chevauchement horaires (time ranges [start, end))
CREATE OR REPLACE FUNCTION public.times_overlap(
  a_start time,
  a_end time,
  b_start time,
  b_end time
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT a_start < b_end AND b_start < a_end;
$$;

-- Vérifie si un formateur est déjà pris sur une plage (récurrente ou date précise)
CREATE OR REPLACE FUNCTION public.check_formateur_overlap(
  p_center_id uuid,
  p_formateur_id uuid,
  p_day_of_week int,
  p_start_time time,
  p_end_time time,
  p_specific_date date DEFAULT NULL,
  p_exclude_slot_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conflict boolean := false;
BEGIN
  IF p_formateur_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.schedule_slots s
    WHERE s.center_id = p_center_id
      AND s.formateur_id = p_formateur_id
      AND (p_exclude_slot_id IS NULL OR s.id <> p_exclude_slot_id)
      AND public.times_overlap(s.start_time::time, s.end_time::time, p_start_time, p_end_time)
      AND (
        -- Même date précise
        (p_specific_date IS NOT NULL AND s.specific_date = p_specific_date)
        OR
        -- Slot récurrent même jour (sans date précise côté nouveau créneau)
        (
          p_specific_date IS NULL
          AND s.specific_date IS NULL
          AND s.day_of_week = p_day_of_week
        )
        OR
        -- Nouveau créneau daté vs slot récurrent du même jour de semaine
        (
          p_specific_date IS NOT NULL
          AND s.specific_date IS NULL
          AND s.day_of_week = EXTRACT(ISODOW FROM p_specific_date)::int
        )
        OR
        -- Slot daté vs nouveau créneau récurrent
        (
          p_specific_date IS NULL
          AND s.specific_date IS NOT NULL
          AND EXTRACT(ISODOW FROM s.specific_date)::int = p_day_of_week
        )
      )
      -- Ignorer si ce jour précis est annulé (exception cancelled)
      AND NOT EXISTS (
        SELECT 1 FROM public.schedule_exceptions e
        WHERE e.slot_id = s.id
          AND e.type = 'cancelled'
          AND (
            (p_specific_date IS NOT NULL AND e.exception_date = p_specific_date)
            OR (p_specific_date IS NULL AND e.exception_date IS NOT NULL
                AND EXTRACT(ISODOW FROM e.exception_date)::int = p_day_of_week)
          )
      )
  ) INTO v_conflict;

  RETURN COALESCE(v_conflict, false);
END;
$$;

-- Upsert créneau + liens classes (tronc commun)
CREATE OR REPLACE FUNCTION public.upsert_schedule_slot(
  p_slot_id uuid,
  p_center_id uuid,
  p_filiere_id uuid,
  p_niveau_id uuid,
  p_groupe_id uuid,
  p_groupe_ids uuid[],
  p_day_of_week int,
  p_start_time time,
  p_end_time time,
  p_discipline_id uuid,
  p_title text,
  p_formateur_id uuid,
  p_room_name text,
  p_mode text,
  p_online_link text,
  p_created_by uuid,
  p_is_tronc_commun boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_groups uuid[];
  v_g uuid;
BEGIN
  IF p_start_time IS NULL OR p_end_time IS NULL OR p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Horaires invalides.';
  END IF;
  IF p_day_of_week IS NULL OR p_day_of_week < 1 OR p_day_of_week > 7 THEN
    RAISE EXCEPTION 'Jour de semaine invalide.';
  END IF;

  -- Classes : tronc commun = tableau ; sinon groupe unique
  IF p_is_tronc_commun THEN
    v_groups := COALESCE(p_groupe_ids, ARRAY[]::uuid[]);
    IF cardinality(v_groups) < 2 THEN
      RAISE EXCEPTION 'Tronc commun : sélectionnez au moins 2 classes.';
    END IF;
  ELSE
    IF p_groupe_id IS NULL AND (p_groupe_ids IS NULL OR cardinality(p_groupe_ids) = 0) THEN
      RAISE EXCEPTION 'Classe obligatoire.';
    END IF;
    IF p_groupe_id IS NOT NULL THEN
      v_groups := ARRAY[p_groupe_id];
    ELSE
      v_groups := p_groupe_ids;
    END IF;
  END IF;

  IF p_formateur_id IS NOT NULL AND public.check_formateur_overlap(
    p_center_id, p_formateur_id, p_day_of_week, p_start_time, p_end_time, NULL, p_slot_id
  ) THEN
    RAISE EXCEPTION 'Ce formateur est déjà programmé sur cette plage.';
  END IF;

  IF p_slot_id IS NULL THEN
    INSERT INTO public.schedule_slots (
      center_id, filiere_id, niveau_id, groupe_id,
      day_of_week, start_time, end_time,
      discipline_id, title, formateur_id, room_name,
      mode, online_link, created_by, session_scope, specific_date
    ) VALUES (
      p_center_id, p_filiere_id, p_niveau_id, v_groups[1],
      p_day_of_week, p_start_time, p_end_time,
      p_discipline_id, NULLIF(trim(COALESCE(p_title, '')), ''), p_formateur_id, NULLIF(trim(COALESCE(p_room_name, '')), ''),
      COALESCE(NULLIF(p_mode, ''), 'presentiel'),
      CASE WHEN p_mode = 'en_ligne' THEN NULLIF(trim(COALESCE(p_online_link, '')), '') ELSE NULL END,
      p_created_by, 'collective', NULL
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.schedule_slots SET
      niveau_id = p_niveau_id,
      groupe_id = v_groups[1],
      day_of_week = p_day_of_week,
      start_time = p_start_time,
      end_time = p_end_time,
      discipline_id = p_discipline_id,
      title = NULLIF(trim(COALESCE(p_title, '')), ''),
      formateur_id = p_formateur_id,
      room_name = NULLIF(trim(COALESCE(p_room_name, '')), ''),
      mode = COALESCE(NULLIF(p_mode, ''), 'presentiel'),
      online_link = CASE WHEN p_mode = 'en_ligne' THEN NULLIF(trim(COALESCE(p_online_link, '')), '') ELSE NULL END
    WHERE id = p_slot_id AND center_id = p_center_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Créneau introuvable.';
    END IF;

    DELETE FROM public.schedule_slot_groupes WHERE slot_id = v_id;
  END IF;

  FOREACH v_g IN ARRAY v_groups LOOP
    INSERT INTO public.schedule_slot_groupes (slot_id, groupe_id)
    VALUES (v_id, v_g)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Si la table n'a pas de unique, tenter insert simple (ignore duplicates via exception)
  -- Fallback already handled by ON CONFLICT DO NOTHING if PK exists

  RETURN v_id;
END;
$$;

-- Duplication d'un créneau sur N semaines (day_of_week récurrent — pas de specific_date)
CREATE OR REPLACE FUNCTION public.duplicate_schedule_slot_weeks(
  p_slot_id uuid,
  p_weeks int,
  p_actor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_src public.schedule_slots%ROWTYPE;
  v_i int;
  v_created int := 0;
  v_skipped int := 0;
  v_new_id uuid;
  v_gids uuid[];
BEGIN
  IF p_weeks IS NULL OR p_weeks < 1 OR p_weeks > 52 THEN
    RAISE EXCEPTION 'Nombre de semaines invalide (1–52).';
  END IF;

  SELECT * INTO v_src FROM public.schedule_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Créneau source introuvable.';
  END IF;

  SELECT COALESCE(array_agg(groupe_id), ARRAY[v_src.groupe_id]::uuid[])
  INTO v_gids
  FROM public.schedule_slot_groupes
  WHERE slot_id = p_slot_id;

  IF v_gids IS NULL OR cardinality(v_gids) = 0 THEN
    IF v_src.groupe_id IS NOT NULL THEN
      v_gids := ARRAY[v_src.groupe_id];
    ELSE
      RAISE EXCEPTION 'Aucune classe liée au créneau.';
    END IF;
  END IF;

  -- Le créneau source compte comme semaine 0 ; on crée p_weeks copies "logiques"
  -- Pour un modèle purement récurrent (specific_date null), une seule ligne suffit déjà.
  -- Ici on clone des lignes avec le même day_of_week uniquement si besoin de variantes ;
  -- Pour récurrence hebdo standard : on considère le slot source comme template et
  -- on crée (p_weeks - 1) clones identiques UNIQUEMENT si specific_date est set.
  -- Sinon on retourne created=0 skipped=0 message template_ok.

  IF v_src.specific_date IS NULL THEN
    -- Template hebdomadaire : déjà récurrent — rien à dupliquer en lignes
    RETURN jsonb_build_object(
      'created', 0,
      'skipped', 0,
      'mode', 'weekly_template',
      'message', 'Créneau déjà récurrent chaque semaine. Utilisez des dates précises pour cloner.'
    );
  END IF;

  FOR v_i IN 1..p_weeks LOOP
    BEGIN
      IF public.check_formateur_overlap(
        v_src.center_id,
        v_src.formateur_id,
        EXTRACT(ISODOW FROM (v_src.specific_date + (v_i || ' weeks')::interval))::int,
        v_src.start_time::time,
        v_src.end_time::time,
        (v_src.specific_date + (v_i || ' weeks')::interval)::date,
        NULL
      ) THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.schedule_slots (
        center_id, filiere_id, niveau_id, groupe_id,
        day_of_week, start_time, end_time,
        discipline_id, title, formateur_id, room_name,
        mode, online_link, created_by, session_scope, specific_date
      ) VALUES (
        v_src.center_id, v_src.filiere_id, v_src.niveau_id, v_gids[1],
        EXTRACT(ISODOW FROM (v_src.specific_date + (v_i || ' weeks')::interval))::int,
        v_src.start_time, v_src.end_time,
        v_src.discipline_id, v_src.title, v_src.formateur_id, v_src.room_name,
        v_src.mode, v_src.online_link, COALESCE(p_actor, v_src.created_by),
        COALESCE(v_src.session_scope, 'collective'),
        (v_src.specific_date + (v_i || ' weeks')::interval)::date
      )
      RETURNING id INTO v_new_id;

      INSERT INTO public.schedule_slot_groupes (slot_id, groupe_id)
      SELECT v_new_id, unnest(v_gids)
      ON CONFLICT DO NOTHING;

      v_created := v_created + 1;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'skipped', v_skipped, 'mode', 'dated_copies');
END;
$$;

-- Pour centres libres : appliquer un template hebdo "garanti" en créant
-- des occurrences datées pour les N prochaines semaines (utile si besoin de exceptions individuelles)
CREATE OR REPLACE FUNCTION public.materialize_weekly_slot(
  p_slot_id uuid,
  p_from_date date,
  p_weeks int,
  p_actor uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_src public.schedule_slots%ROWTYPE;
  v_i int;
  v_date date;
  v_created int := 0;
  v_skipped int := 0;
  v_new_id uuid;
  v_gids uuid[];
BEGIN
  IF p_weeks < 1 OR p_weeks > 52 THEN
    RAISE EXCEPTION 'Nombre de semaines invalide (1–52).';
  END IF;

  SELECT * INTO v_src FROM public.schedule_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Créneau introuvable.'; END IF;

  SELECT COALESCE(array_agg(groupe_id), ARRAY[v_src.groupe_id]::uuid[])
  INTO v_gids FROM public.schedule_slot_groupes WHERE slot_id = p_slot_id;
  IF v_gids IS NULL OR cardinality(v_gids) = 0 THEN
    IF v_src.groupe_id IS NULL THEN RAISE EXCEPTION 'Classe manquante.'; END IF;
    v_gids := ARRAY[v_src.groupe_id];
  END IF;

  FOR v_i IN 0..(p_weeks - 1) LOOP
    -- Trouver le prochain jour_of_week à partir de p_from_date + i weeks
    v_date := p_from_date + (v_i || ' weeks')::interval;
    -- Ajuster au day_of_week du template (ISODOW 1=Mon)
    v_date := v_date + ((v_src.day_of_week - EXTRACT(ISODOW FROM v_date)::int + 7) % 7);

    IF public.check_formateur_overlap(
      v_src.center_id, v_src.formateur_id,
      v_src.day_of_week, v_src.start_time::time, v_src.end_time::time,
      v_date, NULL
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Éviter doublon même date + même template logic
    IF EXISTS (
      SELECT 1 FROM public.schedule_slots s
      WHERE s.center_id = v_src.center_id
        AND s.formateur_id IS NOT DISTINCT FROM v_src.formateur_id
        AND s.specific_date = v_date
        AND s.start_time = v_src.start_time
        AND s.end_time = v_src.end_time
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.schedule_slots (
      center_id, filiere_id, niveau_id, groupe_id,
      day_of_week, start_time, end_time,
      discipline_id, title, formateur_id, room_name,
      mode, online_link, created_by, session_scope, specific_date
    ) VALUES (
      v_src.center_id, v_src.filiere_id, v_src.niveau_id, v_gids[1],
      v_src.day_of_week, v_src.start_time, v_src.end_time,
      v_src.discipline_id, v_src.title, v_src.formateur_id, v_src.room_name,
      v_src.mode, v_src.online_link, COALESCE(p_actor, v_src.created_by),
      'collective', v_date
    ) RETURNING id INTO v_new_id;

    INSERT INTO public.schedule_slot_groupes (slot_id, groupe_id)
    SELECT v_new_id, unnest(v_gids)
    ON CONFLICT DO NOTHING;

    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'skipped', v_skipped);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_formateur_overlap TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_schedule_slot TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_schedule_slot_weeks TO authenticated;
GRANT EXECUTE ON FUNCTION public.materialize_weekly_slot TO authenticated;
