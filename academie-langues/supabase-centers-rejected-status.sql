-- A executer dans Supabase SQL Editor
-- Ajoute le statut "rejected" pour les centres (distinct de "suspended") :
-- un centre "pending" refuse pendant son essai de 72h passe en "rejected"
-- (jamais valide), different d'un centre "active" suspendu plus tard pour
-- un motif ponctuel. Les deux restent bloques cote acces (isCenterOperational),
-- seule la categorisation dans /superadmin/centres change.

-- 1) Supprime toute contrainte CHECK existante sur centers.status, quel que
--    soit son nom (elle a pu etre creee/renommee hors des scripts suivis ici,
--    ce qui explique que "pending" fonctionne deja sans migration dediee).
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where rel.relname = 'centers'
      and att.attname = 'status'
      and con.contype = 'c'
  loop
    execute format('alter table public.centers drop constraint %I', c.conname);
  end loop;
end $$;

-- 2) Recree une contrainte unique couvrant les 4 statuts reellement utilises.
alter table public.centers add constraint centers_status_check
  check (status in ('active', 'pending', 'suspended', 'rejected'));
