-- ============================================================
-- BALANSE — Personal finance dashboard (overview, debt tracker, goals)
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Tables are prefixed `bl_` because this Supabase project is shared with
-- TeamSync, OnboardBase, BuhayVA Copilot and the Auto Scheduler.
--
-- Accounts are username + password only (no email), so BALANSE does NOT use
-- Supabase Auth. It keeps its own accounts:
--   bl_users      username + bcrypt password hash
--   bl_sessions   sha256 of each session token (the raw token lives only in the browser)
--   bl_debts      debts per user
--   bl_goals      savings goals per user
--   bl_subscriptions  recurring monthly / yearly subscriptions per user
--
-- Security model: RLS is ON with NO policies, so the anon key cannot read or
-- write any bl_ table directly. The browser only calls the SECURITY DEFINER
-- functions below; each one resolves the session token to a user and touches
-- only that user's rows.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ── 1. Tables ─────────────────────────────────────────────────
create table if not exists public.bl_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
create unique index if not exists bl_users_username_key on public.bl_users (lower(username));

create table if not exists public.bl_sessions (
  token_hash text primary key,
  user_id    uuid not null references public.bl_users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
create index if not exists bl_sessions_user_idx on public.bl_sessions (user_id);

create table if not exists public.bl_debts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.bl_users(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  lender          text check (char_length(lender) <= 80),
  total_amount    numeric(14,2) not null check (total_amount > 0),
  paid_amount     numeric(14,2) not null default 0 check (paid_amount >= 0),
  monthly_payment numeric(14,2) check (monthly_payment >= 0),
  due_day         smallint check (due_day between 1 and 31),
  start_date      date,   -- when the debt started
  end_date        date,   -- when it should be fully paid
  notes           text check (char_length(notes) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists bl_debts_user_idx on public.bl_debts (user_id, created_at);
-- For databases created before the debt dates existed.
alter table public.bl_debts add column if not exists start_date date;
alter table public.bl_debts add column if not exists end_date   date;
-- Set by bl_track_completion(): when the debt was fully paid (it then shows under "Past debts").
alter table public.bl_debts add column if not exists completed_at timestamptz;

create table if not exists public.bl_goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.bl_users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 80),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_amount  numeric(14,2) not null default 0 check (saved_amount >= 0),
  target_date   date,
  notes         text check (char_length(notes) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists bl_goals_user_idx on public.bl_goals (user_id, created_at);
-- Set by bl_track_completion(): when the goal was reached (it then shows under "Past goals").
alter table public.bl_goals add column if not exists completed_at timestamptz;

-- Renews on renew_day each month, or on renew_month + renew_day each year.
create table if not exists public.bl_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.bl_users(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  paid_via    text not null check (char_length(paid_via) between 1 and 40),
  billing     text not null check (billing in ('monthly', 'yearly')),
  renew_day   smallint not null check (renew_day between 1 and 31),
  renew_month smallint check (renew_month between 1 and 12),
  amount      numeric(14,2) not null check (amount > 0),
  notes       text check (char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint bl_subscriptions_month_matches_billing
    check ((billing = 'yearly') = (renew_month is not null))
);
create index if not exists bl_subscriptions_user_idx on public.bl_subscriptions (user_id, created_at);

alter table public.bl_users    enable row level security;
alter table public.bl_sessions enable row level security;
alter table public.bl_debts    enable row level security;
alter table public.bl_goals    enable row level security;
alter table public.bl_subscriptions enable row level security;
revoke all on public.bl_users, public.bl_sessions, public.bl_debts, public.bl_goals, public.bl_subscriptions from anon, authenticated;

-- ── 2. Internal helpers ───────────────────────────────────────
create or replace function public.bl_hash_token(p_token text)
returns text
language sql immutable set search_path = public, extensions
as $$ select encode(digest(p_token, 'sha256'), 'hex'); $$;

create or replace function public.bl_new_session(p_user uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare v_token text := encode(gen_random_bytes(32), 'hex');
begin
  delete from bl_sessions where user_id = p_user and expires_at < now();
  insert into bl_sessions (token_hash, user_id) values (bl_hash_token(v_token), p_user);
  return v_token;
end;
$$;

-- Resolves a token to its user, or raises. Every data function starts here.
create or replace function public.bl_user_from_token(p_token text)
returns uuid
language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_user uuid;
begin
  select user_id into v_user from bl_sessions
   where token_hash = bl_hash_token(coalesce(p_token, '')) and expires_at > now();
  if v_user is null then
    raise exception 'Your session has expired. Please sign in again.' using errcode = '28000';
  end if;
  return v_user;
end;
$$;

-- Stamps completed_at the moment a debt is fully paid / a goal is reached, keeps the
-- original stamp on later edits, and clears it if an edit drops the item below 100%.
create or replace function public.bl_track_completion()
returns trigger
language plpgsql set search_path = public
as $$
declare v_done boolean;
begin
  if tg_table_name = 'bl_debts' then
    v_done := new.paid_amount >= new.total_amount;
  else
    v_done := new.saved_amount >= new.target_amount;
  end if;

  if not v_done then
    new.completed_at := null;
  elsif tg_op = 'UPDATE' then
    new.completed_at := coalesce(old.completed_at, new.completed_at, now());
  else
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists bl_debts_completion on public.bl_debts;
create trigger bl_debts_completion before insert or update on public.bl_debts
  for each row execute function public.bl_track_completion();
drop trigger if exists bl_goals_completion on public.bl_goals;
create trigger bl_goals_completion before insert or update on public.bl_goals
  for each row execute function public.bl_track_completion();

-- Backfill items finished before completed_at existed (their last edit is the best guess).
update public.bl_debts set completed_at = updated_at where completed_at is null and paid_amount >= total_amount;
update public.bl_goals set completed_at = updated_at where completed_at is null and saved_amount >= target_amount;

-- ── 3. Auth RPCs ──────────────────────────────────────────────
create or replace function public.bl_sign_up(p_username text, p_password text)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_name text := trim(coalesce(p_username, ''));
  v_id   uuid;
begin
  if v_name !~ '^[A-Za-z0-9_.]{3,24}$' then
    raise exception 'Username must be 3–24 characters: letters, numbers, dot or underscore.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters.' using errcode = '22023';
  end if;
  if exists (select 1 from bl_users where lower(username) = lower(v_name)) then
    raise exception 'That username is already taken.' using errcode = '23505';
  end if;

  insert into bl_users (username, password_hash)
  values (v_name, crypt(p_password, gen_salt('bf', 10)))
  returning id into v_id;

  return json_build_object('token', bl_new_session(v_id), 'username', v_name);
end;
$$;

create or replace function public.bl_sign_in(p_username text, p_password text)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare v_user bl_users;
begin
  select * into v_user from bl_users where lower(username) = lower(trim(coalesce(p_username, '')));
  if v_user.id is null or v_user.password_hash <> crypt(coalesce(p_password, ''), v_user.password_hash) then
    raise exception 'Incorrect username or password.' using errcode = '28P01';
  end if;
  return json_build_object('token', bl_new_session(v_user.id), 'username', v_user.username);
end;
$$;

create or replace function public.bl_sign_out(p_token text)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from bl_sessions where token_hash = bl_hash_token(coalesce(p_token, '')); $$;

create or replace function public.bl_me(p_token text)
returns json
language sql stable security definer set search_path = public, extensions
as $$ select json_build_object('username', username) from bl_users where id = bl_user_from_token(p_token); $$;

-- ── 4. Data RPCs ──────────────────────────────────────────────
create or replace function public.bl_load(p_token text)
returns json
language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_user uuid := bl_user_from_token(p_token);
begin
  return json_build_object(
    'debts', coalesce((select json_agg(d order by d.created_at) from bl_debts d where d.user_id = v_user), '[]'::json),
    'goals', coalesce((select json_agg(g order by g.created_at) from bl_goals g where g.user_id = v_user), '[]'::json),
    'subscriptions', coalesce((select json_agg(s order by s.created_at) from bl_subscriptions s where s.user_id = v_user), '[]'::json)
  );
end;
$$;

-- Insert when p_debt has no id, otherwise update that row (only if it belongs to the caller).
create or replace function public.bl_save_debt(p_token text, p_debt jsonb)
returns bl_debts
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user  uuid := bl_user_from_token(p_token);
  v_row   bl_debts;
  v_start date := nullif(p_debt->>'start_date', '')::date;
  v_end   date := nullif(p_debt->>'end_date', '')::date;
begin
  if v_start is not null and v_end is not null and v_end < v_start then
    raise exception 'The end date can’t be before the start date.' using errcode = '22023';
  end if;
  if p_debt ? 'id' and p_debt->>'id' is not null then
    update bl_debts set
      name            = trim(p_debt->>'name'),
      lender          = nullif(trim(p_debt->>'lender'), ''),
      total_amount    = (p_debt->>'total_amount')::numeric,
      paid_amount     = coalesce((p_debt->>'paid_amount')::numeric, 0),
      monthly_payment = nullif(p_debt->>'monthly_payment', '')::numeric,
      due_day         = nullif(p_debt->>'due_day', '')::smallint,
      start_date      = v_start,
      end_date        = v_end,
      notes           = nullif(trim(p_debt->>'notes'), ''),
      updated_at      = now()
    where id = (p_debt->>'id')::uuid and user_id = v_user
    returning * into v_row;
    if v_row.id is null then raise exception 'Debt not found.'; end if;
  else
    insert into bl_debts (user_id, name, lender, total_amount, paid_amount, monthly_payment, due_day, start_date, end_date, notes)
    values (
      v_user,
      trim(p_debt->>'name'),
      nullif(trim(p_debt->>'lender'), ''),
      (p_debt->>'total_amount')::numeric,
      coalesce((p_debt->>'paid_amount')::numeric, 0),
      nullif(p_debt->>'monthly_payment', '')::numeric,
      nullif(p_debt->>'due_day', '')::smallint,
      v_start,
      v_end,
      nullif(trim(p_debt->>'notes'), '')
    )
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.bl_delete_debt(p_token text, p_id uuid)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from bl_debts where id = p_id and user_id = bl_user_from_token(p_token); $$;

create or replace function public.bl_save_goal(p_token text, p_goal jsonb)
returns bl_goals
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user uuid := bl_user_from_token(p_token);
  v_row  bl_goals;
begin
  if p_goal ? 'id' and p_goal->>'id' is not null then
    update bl_goals set
      name          = trim(p_goal->>'name'),
      target_amount = (p_goal->>'target_amount')::numeric,
      saved_amount  = coalesce((p_goal->>'saved_amount')::numeric, 0),
      target_date   = nullif(p_goal->>'target_date', '')::date,
      notes         = nullif(trim(p_goal->>'notes'), ''),
      updated_at    = now()
    where id = (p_goal->>'id')::uuid and user_id = v_user
    returning * into v_row;
    if v_row.id is null then raise exception 'Goal not found.'; end if;
  else
    insert into bl_goals (user_id, name, target_amount, saved_amount, target_date, notes)
    values (
      v_user,
      trim(p_goal->>'name'),
      (p_goal->>'target_amount')::numeric,
      coalesce((p_goal->>'saved_amount')::numeric, 0),
      nullif(p_goal->>'target_date', '')::date,
      nullif(trim(p_goal->>'notes'), '')
    )
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.bl_delete_goal(p_token text, p_id uuid)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from bl_goals where id = p_id and user_id = bl_user_from_token(p_token); $$;

create or replace function public.bl_save_subscription(p_token text, p_sub jsonb)
returns bl_subscriptions
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user    uuid := bl_user_from_token(p_token);
  v_row     bl_subscriptions;
  v_billing text := p_sub->>'billing';
  -- Monthly subscriptions have no month, whatever the client sent.
  v_month   smallint := case when v_billing = 'yearly' then nullif(p_sub->>'renew_month', '')::smallint end;
begin
  if p_sub ? 'id' and p_sub->>'id' is not null then
    update bl_subscriptions set
      title       = trim(p_sub->>'title'),
      paid_via    = trim(p_sub->>'paid_via'),
      billing     = v_billing,
      renew_day   = (p_sub->>'renew_day')::smallint,
      renew_month = v_month,
      amount      = (p_sub->>'amount')::numeric,
      notes       = nullif(trim(p_sub->>'notes'), ''),
      updated_at  = now()
    where id = (p_sub->>'id')::uuid and user_id = v_user
    returning * into v_row;
    if v_row.id is null then raise exception 'Subscription not found.'; end if;
  else
    insert into bl_subscriptions (user_id, title, paid_via, billing, renew_day, renew_month, amount, notes)
    values (
      v_user,
      trim(p_sub->>'title'),
      trim(p_sub->>'paid_via'),
      v_billing,
      (p_sub->>'renew_day')::smallint,
      v_month,
      (p_sub->>'amount')::numeric,
      nullif(trim(p_sub->>'notes'), '')
    )
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.bl_delete_subscription(p_token text, p_id uuid)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from bl_subscriptions where id = p_id and user_id = bl_user_from_token(p_token); $$;

-- ── 5. Grants: the browser may call only the public RPCs ─────
revoke all on function public.bl_new_session(uuid)        from public, anon, authenticated;
revoke all on function public.bl_user_from_token(text)    from public, anon, authenticated;
grant execute on function
  public.bl_sign_up(text, text),
  public.bl_sign_in(text, text),
  public.bl_sign_out(text),
  public.bl_me(text),
  public.bl_load(text),
  public.bl_save_debt(text, jsonb),
  public.bl_delete_debt(text, uuid),
  public.bl_save_goal(text, jsonb),
  public.bl_delete_goal(text, uuid),
  public.bl_save_subscription(text, jsonb),
  public.bl_delete_subscription(text, uuid)
to anon, authenticated;
