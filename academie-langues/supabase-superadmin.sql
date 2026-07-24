-- A executer dans Supabase SQL Editor
-- Phase 0 — Fondations superadmin Nexa (role, contrainte, journal d'audit)

-- 1) Elargir la contrainte de role pour inclure tous les roles reellement utilises
--    (staff/campus_manager etaient deja utilises en prod sans etre couverts par
--    l'ancienne contrainte supabase-center-applications.sql) + le nouveau role superadmin.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in (
    'student',
    'admin',
    'center_manager',
    'campus_manager',
    'trainer',
    'staff',
    'superadmin'
  ));

-- 2) Journal d'audit superadmin — trace toute connexion et action sensible.
--    Ecriture/lecture reservees au service role (jamais expose au client).
create table if not exists superadmin_audit_logs (
  id uuid default gen_random_uuid() primary key,
  superadmin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text,
  target_id text,
  reason text,
  metadata jsonb default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists superadmin_audit_logs_superadmin_id_idx
  on superadmin_audit_logs (superadmin_id);
create index if not exists superadmin_audit_logs_created_at_idx
  on superadmin_audit_logs (created_at desc);

alter table superadmin_audit_logs enable row level security;

-- Aucune policy publique : seule la service role key (utilisee uniquement
-- cote serveur dans app/utils/superadmin-auth-server.ts) peut lire/ecrire.
drop policy if exists "no public access" on superadmin_audit_logs;
create policy "no public access" on superadmin_audit_logs
  for all using (false) with check (false);

-- 3) Pour creer un compte superadmin :
--    a) Creer l'utilisateur dans Supabase Auth (Dashboard > Authentication > Add user)
--       ou via l'API admin. Ne JAMAIS passer par l'inscription publique /login.
--    b) Mettre a jour son profil :
--
--    update profiles set role = 'superadmin' where email = 'ops@nexa.africa';
--
--    c) Le compte devra obligatoirement activer le MFA (TOTP) a sa premiere
--       connexion sur /superadmin — impose par le code (app/login/page.tsx).
