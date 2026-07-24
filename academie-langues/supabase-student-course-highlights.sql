-- Surlignages et thèmes couleur — espace cours étudiant
-- À exécuter dans Supabase SQL Editor

create table if not exists public.student_highlight_themes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  color_key text not null,
  hex_color text not null,
  label text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, color_key),
  constraint student_highlight_themes_color_key_check
    check (color_key in ('yellow', 'green', 'blue', 'pink', 'orange'))
);

create table if not exists public.student_course_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  course_id uuid references public.courses(id) on delete set null,
  selected_text text not null,
  note text,
  color_key text not null,
  anchor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_course_highlights_source_type_check
    check (source_type in ('nexa_module', 'center_lesson')),
  constraint student_course_highlights_color_key_check
    check (color_key in ('yellow', 'green', 'blue', 'pink', 'orange'))
);

create index if not exists idx_student_course_highlights_user_source
  on public.student_course_highlights (user_id, source_type, source_id);

create index if not exists idx_student_course_highlights_course_id
  on public.student_course_highlights (course_id)
  where course_id is not null;

alter table public.student_highlight_themes enable row level security;
alter table public.student_course_highlights enable row level security;

drop policy if exists student_highlight_themes_own on public.student_highlight_themes;
create policy student_highlight_themes_own on public.student_highlight_themes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists student_course_highlights_own on public.student_course_highlights;
create policy student_course_highlights_own on public.student_course_highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
