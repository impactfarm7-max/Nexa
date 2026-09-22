-- Vocabulaire terrain univ : type de cours CM / TD / TP sur l'UE

alter table public.filiere_matieres
  add column if not exists course_format text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'filiere_matieres_course_format_check'
  ) then
    alter table public.filiere_matieres
      add constraint filiere_matieres_course_format_check
      check (course_format is null or course_format in ('cm', 'td', 'tp'));
  end if;
end $$;
