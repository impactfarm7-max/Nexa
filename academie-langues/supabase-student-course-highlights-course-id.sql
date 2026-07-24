-- Migration : course_id sur les surlignages (navigation Notes → cours centre)
-- À exécuter dans Supabase SQL Editor si la table existe déjà

alter table public.student_course_highlights
  add column if not exists course_id uuid references public.courses(id) on delete set null;

create index if not exists idx_student_course_highlights_course_id
  on public.student_course_highlights (course_id)
  where course_id is not null;

-- Rétro-remplissage pour les surlignages centre existants
update public.student_course_highlights h
set course_id = cl.course_id
from public.course_lessons cl
where h.source_type = 'center_lesson'
  and h.source_id = cl.id::text
  and h.course_id is null;
