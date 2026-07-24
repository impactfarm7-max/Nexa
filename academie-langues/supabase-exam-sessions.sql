

-- A executer dans Supabase SQL Editor
-- Persistance de l'examen complet : permet de reprendre apres coupure reseau,
-- crash du device, ou coupure de courant. Les corrections IA EE/EO sont
-- declenchees au fure et a mesure (background) et stockees ici.

create table if not exists exam_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  examen_id integer not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  current_step integer not null default 0,
  time_left integer not null default 9900,

  -- Reponses brutes saisies par l'etudiant
  ce_answers jsonb default '{}'::jsonb,
  co_answers jsonb default '{}'::jsonb,
  ee_answers jsonb default null,
  eo_data jsonb default null,

  -- Resultats (corrections IA + calculs locaux)
  ce_result jsonb default null,
  co_result jsonb default null,
  ee_result jsonb default null,
  eo_result jsonb default null,

  -- Etats des corrections IA en arriere-plan
  ee_correction_status text default 'pending' check (ee_correction_status in ('pending', 'running', 'done', 'failed')),
  eo_correction_status text default 'pending' check (eo_correction_status in ('pending', 'running', 'done', 'failed')),
  ee_correction_error text default null,
  eo_correction_error text default null,

  started_at timestamptz not null default now(),
  finished_at timestamptz default null,
  updated_at timestamptz not null default now()
);

-- Une seule session active par (user, examen)
create unique index if not exists exam_sessions_unique_active
  on exam_sessions(user_id, examen_id)
  where status = 'in_progress';

create index if not exists exam_sessions_user_status
  on exam_sessions(user_id, status, started_at desc);

alter table exam_sessions enable row level security;

-- Etudiant : tout sur ses propres sessions
drop policy if exists "exam_sessions_owner_select" on exam_sessions;
create policy "exam_sessions_owner_select" on exam_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "exam_sessions_owner_insert" on exam_sessions;
create policy "exam_sessions_owner_insert" on exam_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "exam_sessions_owner_update" on exam_sessions;
create policy "exam_sessions_owner_update" on exam_sessions
  for update using (auth.uid() = user_id);

-- Admins IAG : voir toutes les sessions
drop policy if exists "exam_sessions_admin_select" on exam_sessions;
create policy "exam_sessions_admin_select" on exam_sessions
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Trigger pour maintenir updated_at
create or replace function exam_sessions_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists exam_sessions_touch on exam_sessions;
create trigger exam_sessions_touch
  before update on exam_sessions
  for each row execute function exam_sessions_touch_updated_at();
