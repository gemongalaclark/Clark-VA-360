-- ============================================================
-- Clark VA 360 Job Tracker — applied jobs + bookmarked jobs
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Tables are prefixed `jt_` because this Supabase project is shared with
-- TeamSync, OnboardBase, BuhayVA Copilot, BALANSE and the Auto Scheduler.
--
-- Accounts are username + password only (no email), so the Job Tracker does
-- NOT use Supabase Auth. It keeps its own accounts:
--   jt_users         username + bcrypt password hash
--   jt_sessions      sha256 of each session token (the raw token lives only in the browser)
--   jt_applications  jobs the user has applied to, and where each one stands (status)
--   jt_bookmarks     jobs saved for later, with what the application needs
--
-- Public showcase: a user can turn on a share link (jt_users.share_slug). Anyone with
-- the link can call jt_public_showcase, which returns ONLY the username plus each
-- application's title, link and date applied (no status, source, goal or bookmarks).
--
-- Security model: RLS is ON with NO policies, so the anon key cannot read or
-- write any jt_ table directly. The browser only calls the SECURITY DEFINER
-- functions below; each one resolves the session token to a user and touches
-- only that user's rows.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ── 1. Tables ─────────────────────────────────────────────────
create table if not exists public.jt_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);
create unique index if not exists jt_users_username_key on public.jt_users (lower(username));
-- Public share link id. null = sharing is off.
alter table public.jt_users add column if not exists share_slug text;
create unique index if not exists jt_users_share_slug_key on public.jt_users (share_slug) where share_slug is not null;

create table if not exists public.jt_sessions (
  token_hash text primary key,
  user_id    uuid not null references public.jt_users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
create index if not exists jt_sessions_user_idx on public.jt_sessions (user_id);

-- source: where the job was found. 'other' requires source_other (e.g. "Indeed").
create table if not exists public.jt_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.jt_users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  url          text not null check (char_length(url) between 1 and 2000),
  applied_on   date not null,
  source       text not null check (source in ('linkedin', 'onlinejobsph', 'upwork', 'other')),
  source_other text check (char_length(source_other) <= 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint jt_applications_other_named
    check ((source = 'other') = (source_other is not null))
);
-- Where the application stands. Added after launch, so it's an ALTER (safe on existing databases).
alter table public.jt_applications add column if not exists status text not null default 'no_reply'
  check (status in ('no_reply', 'in_process', 'hired', 'rejected'));
-- 'rejected' added later: swap the old check (Postgres' default name for it) for one that allows it.
alter table public.jt_applications drop constraint if exists jt_applications_status_check;
alter table public.jt_applications add constraint jt_applications_status_check
  check (status in ('no_reply', 'in_process', 'hired', 'rejected'));
create index if not exists jt_applications_user_idx on public.jt_applications (user_id, applied_on desc);

create table if not exists public.jt_bookmarks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.jt_users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  url          text not null check (char_length(url) between 1 and 2000),
  requirements text check (char_length(requirements) <= 2000),   -- one requirement per line
  source       text not null check (source in ('linkedin', 'onlinejobsph', 'upwork', 'other')),
  source_other text check (char_length(source_other) <= 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint jt_bookmarks_other_named
    check ((source = 'other') = (source_other is not null))
);
create index if not exists jt_bookmarks_user_idx on public.jt_bookmarks (user_id, created_at desc);

alter table public.jt_users        enable row level security;
alter table public.jt_sessions     enable row level security;
alter table public.jt_applications enable row level security;
alter table public.jt_bookmarks    enable row level security;
revoke all on public.jt_users, public.jt_sessions, public.jt_applications, public.jt_bookmarks from anon, authenticated;

-- ── 2. Internal helpers ───────────────────────────────────────
create or replace function public.jt_hash_token(p_token text)
returns text
language sql immutable set search_path = public, extensions
as $$ select encode(digest(p_token, 'sha256'), 'hex'); $$;

create or replace function public.jt_new_session(p_user uuid)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare v_token text := encode(gen_random_bytes(32), 'hex');
begin
  delete from jt_sessions where user_id = p_user and expires_at < now();
  insert into jt_sessions (token_hash, user_id) values (jt_hash_token(v_token), p_user);
  return v_token;
end;
$$;

-- Resolves a token to its user, or raises. Every data function starts here.
create or replace function public.jt_user_from_token(p_token text)
returns uuid
language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_user uuid;
begin
  select user_id into v_user from jt_sessions
   where token_hash = jt_hash_token(coalesce(p_token, '')) and expires_at > now();
  if v_user is null then
    raise exception 'Your session has expired. Please sign in again.' using errcode = '28000';
  end if;
  return v_user;
end;
$$;

-- Validates the fields shared by applications and bookmarks; returns the cleaned source_other.
create or replace function public.jt_check_job(p_job jsonb)
returns text
language plpgsql immutable set search_path = public
as $$
declare
  v_source text := p_job->>'source';
  v_other  text := nullif(trim(coalesce(p_job->>'source_other', '')), '');
begin
  if char_length(trim(coalesce(p_job->>'title', ''))) = 0 then
    raise exception 'Add the job title.' using errcode = '22023';
  end if;
  if trim(coalesce(p_job->>'url', '')) !~* '^https?://\S+$' then
    raise exception 'The job link must be a full web address starting with http:// or https://.' using errcode = '22023';
  end if;
  if v_source is null or v_source not in ('linkedin', 'onlinejobsph', 'upwork', 'other') then
    raise exception 'Pick where you found the job.' using errcode = '22023';
  end if;
  if v_source = 'other' and v_other is null then
    raise exception 'Name the site where you found the job.' using errcode = '22023';
  end if;
  -- Only "Other" keeps a custom name, whatever the client sent.
  return case when v_source = 'other' then v_other end;
end;
$$;

-- ── 3. Auth RPCs ──────────────────────────────────────────────
create or replace function public.jt_sign_up(p_username text, p_password text)
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
  if exists (select 1 from jt_users where lower(username) = lower(v_name)) then
    raise exception 'That username is already taken.' using errcode = '23505';
  end if;

  insert into jt_users (username, password_hash)
  values (v_name, crypt(p_password, gen_salt('bf', 10)))
  returning id into v_id;

  return json_build_object('token', jt_new_session(v_id), 'username', v_name);
end;
$$;

create or replace function public.jt_sign_in(p_username text, p_password text)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare v_user jt_users;
begin
  select * into v_user from jt_users where lower(username) = lower(trim(coalesce(p_username, '')));
  if v_user.id is null or v_user.password_hash <> crypt(coalesce(p_password, ''), v_user.password_hash) then
    raise exception 'Incorrect username or password.' using errcode = '28P01';
  end if;
  return json_build_object('token', jt_new_session(v_user.id), 'username', v_user.username);
end;
$$;

create or replace function public.jt_sign_out(p_token text)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from jt_sessions where token_hash = jt_hash_token(coalesce(p_token, '')); $$;

create or replace function public.jt_me(p_token text)
returns json
language sql stable security definer set search_path = public, extensions
as $$ select json_build_object('username', username) from jt_users where id = jt_user_from_token(p_token); $$;

-- ── 4. Data RPCs ──────────────────────────────────────────────
create or replace function public.jt_load(p_token text)
returns json
language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_user uuid := jt_user_from_token(p_token);
begin
  return json_build_object(
    'member_since', (select created_at from jt_users where id = v_user),
    'share_slug',   (select share_slug from jt_users where id = v_user),
    'applications', coalesce((select json_agg(a order by a.applied_on desc, a.created_at desc)
                                from jt_applications a where a.user_id = v_user), '[]'::json),
    'bookmarks',    coalesce((select json_agg(b order by b.created_at desc)
                                from jt_bookmarks b where b.user_id = v_user), '[]'::json)
  );
end;
$$;

-- Insert when p_job has no id, otherwise update that row (only if it belongs to the caller).
create or replace function public.jt_save_application(p_token text, p_job jsonb)
returns jt_applications
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user  uuid := jt_user_from_token(p_token);
  v_other text := jt_check_job(p_job);
  v_date  date := nullif(p_job->>'applied_on', '')::date;
  v_status text := nullif(p_job->>'status', '');   -- null = keep the current status (or 'no_reply' when new)
  v_row   jt_applications;
begin
  if v_date is null then
    raise exception 'Add the date you applied.' using errcode = '22023';
  end if;
  if v_status is not null and v_status not in ('no_reply', 'in_process', 'hired', 'rejected') then
    raise exception 'Pick a valid status.' using errcode = '22023';
  end if;
  if p_job ? 'id' and p_job->>'id' is not null then
    update jt_applications set
      title        = trim(p_job->>'title'),
      url          = trim(p_job->>'url'),
      applied_on   = v_date,
      source       = p_job->>'source',
      source_other = v_other,
      status       = coalesce(v_status, status),
      updated_at   = now()
    where id = (p_job->>'id')::uuid and user_id = v_user
    returning * into v_row;
    if v_row.id is null then raise exception 'Job not found.'; end if;
  else
    insert into jt_applications (user_id, title, url, applied_on, source, source_other, status)
    values (v_user, trim(p_job->>'title'), trim(p_job->>'url'), v_date, p_job->>'source', v_other, coalesce(v_status, 'no_reply'))
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.jt_delete_application(p_token text, p_id uuid)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from jt_applications where id = p_id and user_id = jt_user_from_token(p_token); $$;

create or replace function public.jt_save_bookmark(p_token text, p_job jsonb)
returns jt_bookmarks
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user  uuid := jt_user_from_token(p_token);
  v_other text := jt_check_job(p_job);
  v_reqs  text := nullif(trim(coalesce(p_job->>'requirements', '')), '');
  v_row   jt_bookmarks;
begin
  if p_job ? 'id' and p_job->>'id' is not null then
    update jt_bookmarks set
      title        = trim(p_job->>'title'),
      url          = trim(p_job->>'url'),
      requirements = v_reqs,
      source       = p_job->>'source',
      source_other = v_other,
      updated_at   = now()
    where id = (p_job->>'id')::uuid and user_id = v_user
    returning * into v_row;
    if v_row.id is null then raise exception 'Bookmark not found.'; end if;
  else
    insert into jt_bookmarks (user_id, title, url, requirements, source, source_other)
    values (v_user, trim(p_job->>'title'), trim(p_job->>'url'), v_reqs, p_job->>'source', v_other)
    returning * into v_row;
  end if;
  return v_row;
end;
$$;

create or replace function public.jt_delete_bookmark(p_token text, p_id uuid)
returns void
language sql security definer set search_path = public, extensions
as $$ delete from jt_bookmarks where id = p_id and user_id = jt_user_from_token(p_token); $$;

-- ── 5. Public showcase ────────────────────────────────────────
-- p_mode: 'enable' (keep the current link or create one), 'reset' (new link; the old one
-- stops working) or 'disable' (turn sharing off). Returns { share_slug }.
create or replace function public.jt_set_share(p_token text, p_mode text)
returns json
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user uuid := jt_user_from_token(p_token);
  v_slug text;
begin
  if p_mode not in ('enable', 'reset', 'disable') then
    raise exception 'Unknown share option.' using errcode = '22023';
  end if;
  if p_mode = 'disable' then
    update jt_users set share_slug = null where id = v_user;
  elsif p_mode = 'reset' or (select share_slug from jt_users where id = v_user) is null then
    update jt_users set share_slug = encode(gen_random_bytes(8), 'hex') where id = v_user;
  end if;
  select share_slug into v_slug from jt_users where id = v_user;
  return json_build_object('share_slug', v_slug);
end;
$$;

-- Read-only, no sign-in: the showcase page for a share link.
create or replace function public.jt_public_showcase(p_slug text)
returns json
language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_user jt_users;
begin
  select * into v_user from jt_users where share_slug = p_slug and p_slug is not null;
  if v_user.id is null then
    raise exception 'This share link is no longer active.' using errcode = 'P0002';
  end if;
  return json_build_object(
    'username', v_user.username,
    'applications', coalesce((
      select json_agg(json_build_object('title', a.title, 'url', a.url, 'applied_on', a.applied_on)
                      order by a.applied_on desc, a.created_at desc)
        from jt_applications a where a.user_id = v_user.id), '[]'::json)
  );
end;
$$;

-- ── 6. Grants: the browser may call only the public RPCs ─────
revoke all on function public.jt_new_session(uuid)     from public, anon, authenticated;
revoke all on function public.jt_user_from_token(text) from public, anon, authenticated;
revoke all on function public.jt_check_job(jsonb)      from public, anon, authenticated;
grant execute on function
  public.jt_sign_up(text, text),
  public.jt_sign_in(text, text),
  public.jt_sign_out(text),
  public.jt_me(text),
  public.jt_load(text),
  public.jt_save_application(text, jsonb),
  public.jt_delete_application(text, uuid),
  public.jt_save_bookmark(text, jsonb),
  public.jt_delete_bookmark(text, uuid),
  public.jt_set_share(text, text),
  public.jt_public_showcase(text)
to anon, authenticated;
