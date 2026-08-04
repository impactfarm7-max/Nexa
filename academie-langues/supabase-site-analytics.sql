-- À exécuter une fois dans l'éditeur SQL Supabase.
create table if not exists public.site_visitors (
  visitor_id uuid primary key, first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(), first_path text not null default '/', last_path text not null default '/'
);
create table if not exists public.site_daily_visits (
  visit_date date not null, visitor_id uuid not null references public.site_visitors(visitor_id) on delete cascade,
  page_views integer not null default 1 check (page_views > 0), first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(), primary key (visit_date, visitor_id)
);
create table if not exists public.site_daily_pages (
  visit_date date not null, path text not null, visitor_id uuid not null references public.site_visitors(visitor_id) on delete cascade,
  views integer not null default 1 check (views > 0), primary key (visit_date, path, visitor_id)
);

-- Compatibilité avec une première version partiellement créée :
-- CREATE TABLE IF NOT EXISTS ne rajoute pas les colonnes manquantes.
alter table public.site_visitors add column if not exists first_seen_at timestamptz default now();
alter table public.site_visitors add column if not exists last_seen_at timestamptz default now();
alter table public.site_visitors add column if not exists first_path text default '/';
alter table public.site_visitors add column if not exists last_path text default '/';

alter table public.site_daily_visits add column if not exists visit_date date;
alter table public.site_daily_visits add column if not exists page_views integer default 1;
alter table public.site_daily_visits add column if not exists first_seen_at timestamptz default now();
alter table public.site_daily_visits add column if not exists last_seen_at timestamptz default now();
update public.site_daily_visits
set visit_date = coalesce(visit_date, (first_seen_at at time zone 'Africa/Douala')::date, (now() at time zone 'Africa/Douala')::date)
where visit_date is null;
alter table public.site_daily_visits alter column visit_date set default ((now() at time zone 'Africa/Douala')::date);
alter table public.site_daily_visits alter column visit_date set not null;

alter table public.site_daily_pages add column if not exists visit_date date;
alter table public.site_daily_pages add column if not exists path text default '/';
alter table public.site_daily_pages add column if not exists views integer default 1;
update public.site_daily_pages
set visit_date = coalesce(visit_date, (now() at time zone 'Africa/Douala')::date)
where visit_date is null;
alter table public.site_daily_pages alter column visit_date set default ((now() at time zone 'Africa/Douala')::date);
alter table public.site_daily_pages alter column visit_date set not null;
create index if not exists site_visitors_first_seen_idx on public.site_visitors(first_seen_at);
create index if not exists site_daily_visits_date_idx on public.site_daily_visits(visit_date);
create index if not exists site_daily_pages_date_idx on public.site_daily_pages(visit_date);
create unique index if not exists site_daily_visits_visitor_day_uidx on public.site_daily_visits(visit_date, visitor_id);
create unique index if not exists site_daily_pages_visitor_path_day_uidx on public.site_daily_pages(visit_date, path, visitor_id);
alter table public.site_visitors enable row level security;
alter table public.site_daily_visits enable row level security;
alter table public.site_daily_pages enable row level security;
revoke all on public.site_visitors, public.site_daily_visits, public.site_daily_pages from anon, authenticated;

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

create or replace function public.get_site_analytics(p_days integer default 30) returns jsonb language sql security definer set search_path = public stable as $$
with settings as (select greatest(7,least(coalesce(p_days,30),90)) days,(now() at time zone 'Africa/Douala')::date today),
dates as (select generate_series(s.today-(s.days-1),s.today,interval '1 day')::date as visit_day from settings s),
daily as (select d.visit_day,count(v.visitor_id)::integer as visitors,coalesce(sum(v.page_views),0)::integer as page_views,
 (select count(*)::integer from public.site_visitors sv where (sv.first_seen_at at time zone 'Africa/Douala')::date=d.visit_day) as new_visitors
 from dates d left join public.site_daily_visits v on v.visit_date=d.visit_day group by d.visit_day order by d.visit_day),
pages as (select p.path,sum(p.views)::integer views,count(distinct p.visitor_id)::integer visitors from public.site_daily_pages p,settings s
 where p.visit_date>=s.today-(s.days-1) group by p.path order by views desc limit 8)
select jsonb_build_object(
 'series',coalesce((select jsonb_agg(jsonb_build_object('date',visit_day,'visitors',visitors,'newVisitors',new_visitors,'pageViews',page_views) order by visit_day) from daily),'[]'::jsonb),
 'topPages',coalesce((select jsonb_agg(to_jsonb(pages)) from pages),'[]'::jsonb),
 'totalVisitors',(select count(*) from public.site_visitors),
 'periodVisitors',(select count(distinct v.visitor_id) from public.site_daily_visits v,settings s where v.visit_date>=s.today-(s.days-1)),
 'periodPageViews',(select coalesce(sum(v.page_views),0) from public.site_daily_visits v,settings s where v.visit_date>=s.today-(s.days-1)),
 'previousPeriodVisitors',(select count(distinct v.visitor_id) from public.site_daily_visits v,settings s where v.visit_date between s.today-(s.days*2-1) and s.today-s.days),
 'previousPeriodPageViews',(select coalesce(sum(v.page_views),0) from public.site_daily_visits v,settings s where v.visit_date between s.today-(s.days*2-1) and s.today-s.days)); $$;
revoke all on function public.record_site_visit(uuid,text) from public,anon,authenticated;
revoke all on function public.get_site_analytics(integer) from public,anon,authenticated;
grant execute on function public.record_site_visit(uuid,text) to service_role;
grant execute on function public.get_site_analytics(integer) to service_role;
