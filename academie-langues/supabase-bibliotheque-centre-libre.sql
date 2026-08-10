-- A executer dans Supabase SQL Editor
-- Permet aux centres libres (formation pluri-annuelle) d'ajouter leurs propres
-- documents a la bibliotheque publique, avec visibilite "centre" (prive a leurs
-- etudiants) ou "publique" (tous les centres libres, apres validation superadmin).

alter table bibliotheque_documents add column if not exists center_id uuid references centers(id) on delete cascade;
alter table bibliotheque_documents add column if not exists visibility text not null default 'public';
alter table bibliotheque_documents add column if not exists is_paid boolean not null default false;
alter table bibliotheque_documents add column if not exists price numeric;
alter table bibliotheque_documents add column if not exists status text not null default 'approved';
alter table bibliotheque_documents add column if not exists created_by uuid references profiles(id) on delete set null;
alter table bibliotheque_documents add column if not exists reviewed_by uuid references profiles(id) on delete set null;
alter table bibliotheque_documents add column if not exists reviewed_at timestamptz;
alter table bibliotheque_documents add column if not exists rejection_reason text;
alter table bibliotheque_documents add column if not exists created_at timestamptz not null default now();

alter table bibliotheque_documents drop constraint if exists bibliotheque_documents_visibility_check;
alter table bibliotheque_documents add constraint bibliotheque_documents_visibility_check
  check (visibility in ('center', 'public'));

alter table bibliotheque_documents drop constraint if exists bibliotheque_documents_status_check;
alter table bibliotheque_documents add constraint bibliotheque_documents_status_check
  check (status in ('pending_review', 'approved', 'rejected'));

-- Documents existants (ajoutes par NEXA avant cette migration) : deja publics et approuves.
update bibliotheque_documents
set visibility = 'public', status = 'approved'
where center_id is null;

create index if not exists bibliotheque_documents_center_id_idx on bibliotheque_documents(center_id);
create index if not exists bibliotheque_documents_status_idx on bibliotheque_documents(status);
