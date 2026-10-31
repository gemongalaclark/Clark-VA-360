-- ============================================================
-- Portfolio chat bot — rate limits for the public portfolio-chat function
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- The bot needs no login, so these counters are what stop strangers
-- from running up the Gemini bill. Only hashed IPs are stored, and
-- conversations are never saved.
--
-- Security model: RLS is on with no policies and the RPC is callable by
-- the service role only, so the browser can't read or reset the counters.
-- ============================================================

create table if not exists public.chat_rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 1,
  primary key (bucket, window_start)
);

alter table public.chat_rate_limits enable row level security;

-- Takes one slot, atomically. Returns 'ok', 'visitor' (hourly limit hit)
-- or 'site' (daily limit for the whole site hit).
create or replace function public.chat_take_slot(p_visitor text, p_hourly integer, p_daily integer)
returns text
language plpgsql
set search_path = public
as $$
begin
  delete from chat_rate_limits where window_start < now() - interval '2 days';

  insert into chat_rate_limits as l (bucket, window_start)
  values ('visitor:' || p_visitor, date_trunc('hour', now()))
  on conflict (bucket, window_start) do update set hits = l.hits + 1
  where l.hits < p_hourly;
  if not found then return 'visitor'; end if;

  insert into chat_rate_limits as l (bucket, window_start)
  values ('site', date_trunc('day', now()))
  on conflict (bucket, window_start) do update set hits = l.hits + 1
  where l.hits < p_daily;
  if not found then return 'site'; end if;

  return 'ok';
end;
$$;

revoke all on function public.chat_take_slot(text, integer, integer) from public, anon, authenticated;
grant execute on function public.chat_take_slot(text, integer, integer) to service_role;
