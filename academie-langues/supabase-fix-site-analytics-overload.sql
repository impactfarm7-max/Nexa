-- A executer dans Supabase SQL Editor
-- Corrige : "Could not choose the best candidate function between
-- record_site_visit(uuid, text) and record_site_visit(uuid, text, text, uuid)".
-- Une variante a 4 parametres existe en base sans etre trackee dans ce repo,
-- ce qui rend chaque appel /api/analytics/visit ambigu (echec 503) depuis
-- qu'elle a ete creee. Plus aucune visite ni page vue n'est enregistree
-- tant que ce conflit n'est pas resolu (le total et le graphique actuels
-- viennent des donnees historiques d'avant le conflit).

drop function if exists public.record_site_visit(uuid, text, text, uuid);

-- Recree la seule version que le code appelle (voir app/api/analytics/visit/route.ts).
create or replace function public.record_site_visit(p_visitor_id uuid, p_path text) returns void language plpgsql security definer set search_path = public as $$
declare v_now timestamptz := now(); v_day date := (v_now at time zone 'Africa/Douala')::date; v_path text := left(coalesce(nullif(trim(p_path), ''), '/'), 300);
begin
  insert into public.site_visitors(visitor_id, first_seen_at, last_seen_at, first_path, last_path) values(p_visitor_id,v_now,v_now,v_path,v_path)
  on conflict(visitor_id) do update set last_seen_at=excluded.last_seen_at,last_path=excluded.last_path;
  insert into public.site_daily_visits(visit_date,visitor_id,page_views,first_seen_at,last_seen_at) values(v_day,p_visitor_id,1,v_now,v_now)
  on conflict(visit_date,visitor_id) do update set page_views=site_daily_visits.page_views+1,last_seen_at=excluded.last_seen_at;
  insert into public.site_daily_pages(visit_date,path,visitor_id,views) values(v_day,v_path,p_visitor_id,1)
  on conflict(visit_date,path,visitor_id) do update set views=site_daily_pages.views+1;
end; $$;

revoke all on function public.record_site_visit(uuid,text) from public,anon,authenticated;
grant execute on function public.record_site_visit(uuid,text) to service_role;
