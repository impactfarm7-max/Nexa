-- Audit en lecture seule à exécuter dans Supabase SQL Editor.
-- Il ne modifie aucune table et permet de préparer des politiques adaptées au schéma réel.

-- 1. Tables exposées sans RLS.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p')
  and n.nspname in ('public', 'storage')
  and not c.relrowsecurity
order by 1, 2;

-- 2. Tables avec RLS activé mais sans aucune politique.
select n.nspname as schema_name, c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where c.relkind in ('r', 'p')
  and n.nspname in ('public', 'storage')
  and c.relrowsecurity
group by n.nspname, c.relname
having count(p.oid) = 0
order by 1, 2;

-- 3. Détail des politiques et opérations couvertes.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd, policyname;

-- 4. Droits accordés directement aux rôles client.
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;

-- 5. Fonctions SECURITY DEFINER et rôles pouvant les exécuter.
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname in ('public', 'storage')
order by 1, 2;

-- 6. Buckets publics et politiques Storage.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;
