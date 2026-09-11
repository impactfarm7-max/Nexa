-- A executer dans Supabase SQL Editor.
--
-- BLOQUANT CONFIRME EN DIRECT (test empirique) : la table `centers` porte
-- une contrainte CHECK `centers_center_type_check` qui restreint
-- `center_type` a un ensemble de valeurs fixe (probablement 'tcf_canada'
-- et 'generic' seulement) -- cette contrainte n'existe dans AUCUN fichier
-- SQL versionne de ce repo, elle a ete ajoutee directement en base
-- (Supabase Studio ou migration non tracee). Consequence : toute tentative
-- de creer un centre avec `center_type` = 'ecole' / 'universite' /
-- 'entreprise' echoue avec :
--   "new row for relation "centers" violates check constraint
--    "centers_center_type_check""
-- meme si le code applicatif (routes /api/centre/creer, /api/center/create,
-- /api/center/me) est deja correct et envoie la bonne valeur brute.
--
-- Ce script remplace la contrainte pour accepter les 5 valeurs actuelles de
-- `app/data/center-types.ts` (`CENTER_TYPES`). Si vous ajoutez un 6e type de
-- centre plus tard, ce script devra etre reexecute avec la valeur ajoutee.

begin;

alter table public.centers drop constraint if exists centers_center_type_check;

alter table public.centers add constraint centers_center_type_check
  check (center_type in ('tcf_canada', 'generic', 'ecole', 'universite', 'entreprise'));

commit;
