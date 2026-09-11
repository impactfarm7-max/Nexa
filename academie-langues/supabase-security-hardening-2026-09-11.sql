-- A executer dans Supabase SQL Editor
-- Durcissement suite à l'audit sécurité du 2026-09-11 :
--
-- 1) profiles : le trigger protect_profile_security_fields ne bloquait que
--    role/center_id/created_by_center_id. Toutes les colonnes de quota,
--    d'abonnement et de statut étaient modifiables par l'utilisateur
--    lui-même via un appel PostgREST direct (PATCH /profiles?id=eq.<son_id>
--    avec son propre JWT) : ee_total, exam_total, pack_name,
--    subscription_ends_at, is_demo_account, etc. -> quota/abonnement
--    illimité auto-attribué. Étend la liste des colonnes protégées.
--
-- 2) exam_sessions : "exam_sessions_owner_update" n'avait pas de `with
--    check`, donc autorisait la modification de N'IMPORTE QUELLE colonne
--    sur ses propres lignes, y compris ce_result/co_result/ee_result/
--    eo_result (falsification de score -> certificat TCF mensonger).
--    Aucun code applicatif légitime n'écrit sur exam_sessions autrement
--    que via app/api/exam-session/route.ts (service_role) : les policies
--    insert/update "owner" ne sont donc utilisées par personne de légitime
--    et peuvent être supprimées sans rien casser (select reste ouvert,
--    utilisé par app/dashboard/page.tsx pour afficher "Mes notes").

begin;

-- 1) profiles : étend la liste des champs protégés contre une écriture
-- directe par le titulaire de la ligne (id = auth.uid()). Les API
-- service_role (créent/gèrent ces champs légitimement) restent libres.
create or replace function public.protect_profile_security_fields()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    if new.role is distinct from old.role
       or new.center_id is distinct from old.center_id
       or new.created_by_center_id is distinct from old.created_by_center_id
       or new.is_demo_account is distinct from old.is_demo_account
       or new.tag_status is distinct from old.tag_status
       or new.center_status is distinct from old.center_status
       or new.pack_name is distinct from old.pack_name
       or new.subscription_ends_at is distinct from old.subscription_ends_at
       or new.subscription_paused_at is distinct from old.subscription_paused_at
       or new.ee_total is distinct from old.ee_total
       or new.ee_used is distinct from old.ee_used
       or new.exam_total is distinct from old.exam_total
       or new.exam_used is distinct from old.exam_used
       or new.exam_4m_total is distinct from old.exam_4m_total
       or new.exam_4m_used is distinct from old.exam_4m_used
       or new.eo_total is distinct from old.eo_total
       or new.eo_used is distinct from old.eo_used
       or new.coaching_total is distinct from old.coaching_total
       or new.coaching_used is distinct from old.coaching_used
       or new.tutor_ia_total is distinct from old.tutor_ia_total
       or new.tutor_ia_used is distinct from old.tutor_ia_used
       or new.daily_sim_count is distinct from old.daily_sim_count
       or new.daily_sim_date is distinct from old.daily_sim_date
       or new.weekly_eo_count is distinct from old.weekly_eo_count
       or new.weekly_eo_reset_date is distinct from old.weekly_eo_reset_date then
      raise exception 'protected profile fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;
-- Le trigger existe déjà (trg_protect_profile_security_fields), la fonction
-- remplacée ci-dessus suffit : pas besoin de recréer le trigger.

-- 2) exam_sessions : retire les policies insert/update "owner" (RLS-scoped,
-- jamais utilisées par l'app -- toutes les écritures passent par le
-- service_role dans app/api/exam-session/route.ts). Le select reste ouvert.
drop policy if exists "exam_sessions_owner_insert" on public.exam_sessions;
drop policy if exists "exam_sessions_owner_update" on public.exam_sessions;

commit;
