-- À exécuter dans l'éditeur SQL Supabase avant le déploiement applicatif.
create table if not exists public.api_rate_limits (
  key_hash text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_ms bigint
) returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.api_rate_limits%rowtype;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 or p_limit < 1 or p_window_ms < 1000 then
    raise exception 'invalid rate limit parameters';
  end if;

  insert into public.api_rate_limits(key_hash, request_count, reset_at, updated_at)
  values (p_key_hash, 1, v_now + (p_window_ms * interval '1 millisecond'), v_now)
  on conflict (key_hash) do update
  set request_count = case
        when api_rate_limits.reset_at <= v_now then 1
        else api_rate_limits.request_count + 1
      end,
      reset_at = case
        when api_rate_limits.reset_at <= v_now then v_now + (p_window_ms * interval '1 millisecond')
        else api_rate_limits.reset_at
      end,
      updated_at = v_now
  returning * into v_row;

  return query select
    v_row.request_count <= p_limit,
    case when v_row.request_count <= p_limit then 0
      else greatest(1, ceil(extract(epoch from (v_row.reset_at - v_now)))::integer)
    end;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, bigint) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, bigint) to service_role;

create index if not exists api_rate_limits_reset_at_idx on public.api_rate_limits(reset_at);
