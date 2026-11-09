-- ============================================================
-- Google Calendar Auto Scheduler — rate limits for the scheduler-scan function
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Scanning a schedule spends the project's Gemini quota (shared with the portfolio
-- chat, TeamSync, BuhayVA and ClarkFlow), and anyone with a Google account can
-- sign in to the Scheduler. These counters cap scans per user per hour and for the
-- whole site per day. Same design as PORTFOLIO CHAT/schema.sql, separate table so
-- scans don't use up the chat bot's daily budget.
--
-- Security model: RLS on with no policies and the RPC is callable by the service
-- role only, so the browser can't read or reset the counters.
-- ============================================================

create table if not exists public.scheduler_scan_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 1,
  primary key (bucket, window_start)
);

alter table public.scheduler_scan_limits enable row level security;
revoke all on public.scheduler_scan_limits from anon, authenticated;

-- Takes one scan slot, atomically. Returns 'ok', 'user' (hourly limit for this user)
-- or 'site' (daily limit for everyone).
create or replace function public.scheduler_take_scan(p_user uuid, p_hourly integer, p_daily integer)
returns text
language plpgsql
set search_path = public
as $$
begin
  delete from scheduler_scan_limits where window_start < now() - interval '2 days';

  insert into scheduler_scan_limits as l (bucket, window_start)
  values ('user:' || p_user, date_trunc('hour', now()))
  on conflict (bucket, window_start) do update set hits = l.hits + 1
  where l.hits < p_hourly;
  if not found then return 'user'; end if;

  insert into scheduler_scan_limits as l (bucket, window_start)
  values ('site', date_trunc('day', now()))
  on conflict (bucket, window_start) do update set hits = l.hits + 1
  where l.hits < p_daily;
  if not found then return 'site'; end if;

  return 'ok';
end;
$$;

revoke all on function public.scheduler_take_scan(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.scheduler_take_scan(uuid, integer, integer) to service_role;
