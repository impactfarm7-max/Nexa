-- A executer dans Supabase SQL Editor
-- Statut utilise pour les etudiants qui creent eux-memes un compte avec un code centre.

alter table profiles drop constraint if exists profiles_tag_status_check;
alter table profiles add constraint profiles_tag_status_check
  check (
    tag_status is null
    or tag_status in (
      'normal',
      'actif',
      'revoque',
      'termine',
      'supprime',
      'pending_center_approval'
    )
  );
