-- A executer manuellement dans Supabase SQL Editor.
--
-- PRE-CONDITION OBLIGATOIRE : ce script ne doit etre execute qu'APRES avoir
-- merge ET deploye en production le code applicatif des Tasks 1-8 de ce
-- chantier (helper de resolution/signature d'URL, proxy /api/lesson-media,
-- /api/missions/attachment, /api/communaute/signed-urls, et les pages
-- clientes qui les consomment). Ces routes lisent les fichiers via
-- supabaseAdmin (service_role, bypass RLS) et regenerent des URLs signees
-- a la demande -- tant qu'elles ne sont pas en place, basculer les buckets
-- en prive rend TOUS les fichiers existants inaccessibles (pieces jointes
-- de devoirs, cours PDF/video, images/fichiers de communaute) car le code
-- actuellement en prod utilise encore les URLs publiques stockees en dur.
--
-- Contexte : audit securite du 2026-09-11, confirme empiriquement que les
-- buckets Storage `mission-files`, `course-pdfs`, `course-videos` et
-- `community-files` sont marques public=true, avec des policies SELECT
-- sans aucun scoping ({public}/{anon}) -- n'importe qui connaissant ou
-- devinant une URL de fichier y accede sans authentification. Ce script
-- ferme cette fuite : bascule des 4 buckets en prive + remplacement des
-- policies SELECT par des policies scopees au centre de l'appelant (ou
-- suppression pure quand l'acces legitime passe exclusivement par
-- service_role).
--
-- `avatars`, `certificates`, `center-logos`, `room-photos`,
-- `support-attachments` sont hors scope : ils restent publics par design
-- (affichage sans contexte d'auth / verification publique de certificats)
-- et ne sont pas touches par ce fichier.

begin;

-- 1) Bascule des 4 buckets concernes en prive. Les objets existants ne
-- sont pas deplaces ni renommes : le helper de resolution cote app
-- (resolveStoragePath / getSignedStorageUrl, Task 1) gere indifferemment
-- une ancienne URL publique complete ou un chemin nu, donc aucune
-- migration de donnees n'est necessaire ici.
update storage.buckets
set public = false
where id in ('mission-files', 'course-pdfs', 'course-videos', 'community-files');

-- 2) mission-files : lecture reservee aux membres authentifies du meme
-- centre que le fichier. Le premier segment du chemin objet est toujours
-- le center_id (voir app/centre/cours/devoirs/page.tsx et
-- app/api/missions/attachment/route.ts). Meme pattern que
-- "center-documents authenticated read" (supabase-storage-center-documents.sql),
-- qui reutilise le helper SECURITY DEFINER current_profile_center_id()
-- (defini dans supabase-core-rls-hardening.sql) pour eviter la recursion
-- RLS sur profiles.
-- Cette policy est un filet de securite defense-en-profondeur : le flux
-- legitime passe par /api/missions/attachment (service_role, bypass RLS),
-- elle ne sert que si quelqu'un appelle l'API Storage directement avec
-- son propre JWT.
drop policy if exists "Public can read mission files" on storage.objects;
drop policy if exists "mission_files_select_scoped" on storage.objects;
create policy "mission_files_select_scoped" on storage.objects
for select to authenticated
using (
  bucket_id = 'mission-files'
  and (storage.foldername(name))[1] = (public.current_profile_center_id())::text
);

-- 3) course-pdfs / course-videos : AUCUN acces client direct legitime.
-- app/api/lesson-media/[id]/route.ts est deja le seul point d'entree et
-- utilise supabaseAdmin (service_role), qui bypasse RLS sans avoir besoin
-- d'une policy. On supprime donc les anciennes policies publiques sans les
-- remplacer -- toute policy authenticated/anon ici ne ferait qu'elargir
-- inutilement la surface d'acces.
drop policy if exists "Voir les pdf de cours" on storage.objects;
drop policy if exists "Voir les videos de cours" on storage.objects;

-- 4) community-files : la lecture doit etre au moins aussi restrictive que
-- l'ecriture deja en place. Reutilise exactement la condition de la policy
-- community_files_insert (supabase-community-files.sql) : le premier
-- segment du chemin (center_id) doit correspondre au centre du profil de
-- l'appelant, ou l'appelant doit etre rattache a ce centre via
-- center_users. Supprime les deux anciennes policies SELECT non scopees
-- (une "authenticated" trop large, une "anon" carrement ouverte a tous).
drop policy if exists "community_files_public_select" on storage.objects;
drop policy if exists "community_files_select" on storage.objects;
create policy "community_files_select_scoped" on storage.objects
for select to authenticated
using (
  bucket_id = 'community-files'
  and (
    (storage.foldername(name))[1] in (
      select center_id::text from public.profiles
      where id = auth.uid() and center_id is not null
    )
    or (storage.foldername(name))[1] in (
      select center_id::text from public.center_users
      where user_id = auth.uid()
    )
  )
);

commit;

-- ============================================================
-- VERIFICATION MANUELLE POST-EXECUTION (a faire par l'utilisateur --
-- l'implementeur de ce script n'a pas d'acces DB/prod pour la faire lui-meme) :
--
-- 1. Copier une ancienne URL publique complete d'une piece jointe
--    existante (".../storage/v1/object/public/mission-files/...") et la
--    charger directement dans un navigateur -> doit retourner une erreur
--    (400/403), preuve que le bucket est bien devenu prive.
-- 2. Le meme fichier reste telechargeable depuis l'app via le bouton
--    piece jointe (route /api/missions/attachment, Task 4/5).
-- 3. Un cours video/PDF deja existant reste visible via /document/[id].
-- 4. Une image ou un fichier deja poste dans un salon de communaute reste
--    visible/telechargeable dans le chat (route /api/communaute/signed-urls).
-- 5. Un utilisateur du centre A ne doit pas pouvoir acceder a un fichier
--    du centre B (mission-files ou community-files) via une requete
--    Storage directe avec son propre JWT.
-- ============================================================
