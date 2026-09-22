-- Convocations : mode Manuel/Auto + case « Examen » sur créneaux planning (université)

-- 1) Flag centre : manual (défaut) | auto
alter table public.centers
  add column if not exists exam_convocation_from_planning text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'centers_exam_convocation_from_planning_check'
  ) then
    alter table public.centers
      add constraint centers_exam_convocation_from_planning_check
      check (exam_convocation_from_planning in ('manual', 'auto'));
  end if;
end $$;

-- 2) Case « Examen » sur créneau planning
alter table public.schedule_slots
  add column if not exists is_exam boolean not null default false;

create index if not exists idx_schedule_slots_center_exam_date
  on public.schedule_slots (center_id, specific_date)
  where is_exam = true and specific_date is not null;

-- 3) Lien anti-doublon convocation ↔ créneau
alter table public.exam_convocations
  add column if not exists schedule_slot_id uuid references public.schedule_slots(id) on delete set null;

create unique index if not exists idx_exam_convocations_schedule_slot_unique
  on public.exam_convocations (schedule_slot_id)
  where schedule_slot_id is not null;

-- 4) Materialize : copier is_exam + retourner les ids créés
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
  v_created_ids uuid[] := ARRAY[]::uuid[];
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
    v_date := p_from_date + (v_i || ' weeks')::interval;
    v_date := v_date + ((v_src.day_of_week - EXTRACT(ISODOW FROM v_date)::int + 7) % 7);

    IF public.check_formateur_overlap(
      v_src.center_id, v_src.formateur_id,
      v_src.day_of_week, v_src.start_time::time, v_src.end_time::time,
      v_date, NULL
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

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
      mode, online_link, created_by, session_scope, specific_date, is_exam
    ) VALUES (
      v_src.center_id, v_src.filiere_id, v_src.niveau_id, v_gids[1],
      v_src.day_of_week, v_src.start_time, v_src.end_time,
      v_src.discipline_id, v_src.title, v_src.formateur_id, v_src.room_name,
      v_src.mode, v_src.online_link, COALESCE(p_actor, v_src.created_by),
      'collective', v_date, COALESCE(v_src.is_exam, false)
    ) RETURNING id INTO v_new_id;

    INSERT INTO public.schedule_slot_groupes (slot_id, groupe_id)
    SELECT v_new_id, unnest(v_gids)
    ON CONFLICT DO NOTHING;

    v_created_ids := array_append(v_created_ids, v_new_id);
    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'skipped', v_skipped,
    'created_ids', to_jsonb(v_created_ids)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.materialize_weekly_slot TO authenticated;
