-- Mode de séance individuelle : visio (en_ligne) ou présentiel
alter table public.coaching_sessions
  add column if not exists session_mode text not null default 'en_ligne';

alter table public.coaching_sessions
  drop constraint if exists coaching_sessions_session_mode_check;

alter table public.coaching_sessions
  add constraint coaching_sessions_session_mode_check
  check (session_mode in ('en_ligne', 'presentiel'));
