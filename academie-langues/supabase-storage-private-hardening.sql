-- Ferme les deux expositions Storage pouvant être corrigées sans casser les URLs
-- de missions/communauté. À exécuter après supabase-core-rls-hardening.sql.

begin;

update storage.buckets set public = false where id in ('ressources_iag', 'center-documents');

drop policy if exists "Lecture pour les utilisateurs connectÃ©s" on storage.objects;
drop policy if exists "Lecture pour les utilisateurs connectés" on storage.objects;
-- ressources_iag est exclusivement lu via les API serveur qui créent une URL signée
-- après vérification du document et, s'il est payant, de l'achat confirmé.

drop policy if exists "center-documents public read" on storage.objects;
drop policy if exists "center-documents authenticated read" on storage.objects;
create policy "center-documents authenticated read"
on storage.objects for select to authenticated
using (
  bucket_id = 'center-documents'
  and (storage.foldername(name))[1] = (public.current_profile_center_id())::text
);

commit;
