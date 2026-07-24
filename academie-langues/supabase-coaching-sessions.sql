-- À exécuter dans Supabase SQL Editor pour compléter la table existante.
-- La table public.coaching_sessions existe déjà chez toi.

alter table public.coaching_sessions
  add column if not exists reminder_sent_at timestamptz;

create index if not exists coaching_sessions_user_id_idx
  on public.coaching_sessions(user_id);

create index if not exists coaching_sessions_upcoming_idx
  on public.coaching_sessions(status, session_date, session_time)
  where status in ('en_attente', 'confirme');

create index if not exists coaching_sessions_reminder_idx
  on public.coaching_sessions(session_date, session_time)
  where status = 'confirme' and reminder_sent_at is null;
