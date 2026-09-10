-- Marque les comptes de démonstration publique (bouton "Visiter" landing).
-- Ces comptes sont en lecture seule côté middleware (app/middleware.ts) et
-- côté client Supabase (app/utils/supabase.ts) — voir docs/superpowers/specs/
-- 2026-09-10-visite-demo-lecture-seule-design.md

begin;

alter table public.profiles
  add column if not exists is_demo_account boolean not null default false;

create index if not exists idx_profiles_is_demo_account
  on public.profiles (is_demo_account)
  where is_demo_account = true;

commit;
