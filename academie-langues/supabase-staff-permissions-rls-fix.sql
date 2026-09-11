-- A executer dans Supabase SQL Editor.
--
-- FUITE CONFIRMEE EN DIRECT (test empirique, pas theorique) : un manager de
-- centre authentifie pouvait lire staff_permissions de N'IMPORTE QUEL AUTRE
-- CENTRE de la plateforme (`select * from staff_permissions` avec son propre
-- JWT retournait les lignes de tous les centres, y compris des comptes reels
-- de production). La table n'a soit aucun RLS, soit une policy permissive
-- (`using(true)`) -- a verifier via la requete #1/#3 de
-- supabase-rls-security-audit.sql si vous voulez confirmer la cause exacte
-- avant d'executer ce fix, mais le resultat souhaite est le meme.
--
-- Verifie dans le code (app/api/staff/route.ts, commentaire ligne ~108) :
-- AUCUN acces client legitime a cette table -- tout passe par le
-- service_role (supabaseAdmin). Meme remede que pour exam_sessions/
-- owner_update dans supabase-security-hardening-2026-09-11.sql : RLS
-- active, zero policy cliente, le service_role continue de fonctionner
-- normalement (il bypass RLS par construction).

begin;

alter table public.staff_permissions enable row level security;

-- Supprime toute policy existante qui pourrait etre la cause de la fuite
-- (permissive ou mal scopee), pour repartir sur un etat "aucun acces
-- client" garanti, quelle que soit la policy d'origine.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'staff_permissions'
  loop
    execute format('drop policy if exists %I on public.staff_permissions', pol.policyname);
  end loop;
end $$;

commit;
