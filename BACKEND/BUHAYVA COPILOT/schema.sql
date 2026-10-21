-- ============================================================
-- BuhayVA Copilot — Job Analyzer, Pitch Generator & Application CRM
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Tables are prefixed `bv_` because this Supabase project is shared with
-- TeamSync, OnboardBase and the Auto Scheduler.
--
--   bv_members            allowlist: who may use live mode (and spend Make/Gemini quota)
--   bv_user_profile       master resume + niche preferences (1 per user)
--   bv_job_applications   every analyzed job + its CRM status
--
-- Security model: every table has RLS. A user sees only their own rows, and
-- only if they are in bv_members. Make.com never gets a service-role key: it
-- calls the two RPCs at the bottom with the *user's own* JWT, so RLS applies
-- to the automation exactly as it does to the browser.
-- ============================================================

-- ── 1. Tables ─────────────────────────────────────────────────
create table if not exists public.bv_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.bv_user_profile (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  full_name       text not null,
  target_niches   text not null,
  resume_text     text not null check (char_length(resume_text) <= 12000),
  portfolio_links text,
  hourly_rate_min numeric default 8,
  updated_at      timestamptz not null default now()
);

create table if not exists public.bv_job_applications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform             text not null default 'Other' check (platform in ('Upwork', 'OnlineJobs.ph', 'Other')),
  job_title            text not null default 'Untitled job',
  company_or_client    text,
  job_url              text,
  raw_description      text not null check (char_length(raw_description) <= 15000),
  fit_score            integer check (fit_score between 0 and 100),
  attention_check_word text default 'None',
  red_flags            jsonb not null default '[]'::jsonb,
  matching_skills      jsonb not null default '[]'::jsonb,
  subject_line         text,
  tailored_pitch       text,
  status               text not null default 'Analyzed'
                       check (status in ('Analyzed', 'Applied', 'Interviewing', 'Offer', 'Archived')),
  -- AI pipeline state, separate from the CRM status above
  analysis_state       text not null default 'pending' check (analysis_state in ('pending', 'done', 'failed')),
  analysis_error       text,
  notes                text,
  applied_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists bv_jobs_user_created_idx on public.bv_job_applications (user_id, created_at desc);

-- ── 2. Helpers & triggers ─────────────────────────────────────
-- SECURITY DEFINER so policies can check membership without exposing bv_members.
create or replace function public.bv_is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.bv_members where user_id = auth.uid());
$$;

create or replace function public.bv_touch()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  -- Rows always belong to their creator; nobody can reassign them.
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

-- Stamp the first time a job reaches Applied (or jumps straight to a later stage).
create or replace function public.bv_stamp_applied()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.applied_at is null and new.status in ('Applied', 'Interviewing', 'Offer') then
    new.applied_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bv_profile_touch on public.bv_user_profile;
create trigger bv_profile_touch before insert or update on public.bv_user_profile
  for each row execute function public.bv_touch();

drop trigger if exists bv_jobs_touch on public.bv_job_applications;
create trigger bv_jobs_touch before insert or update on public.bv_job_applications
  for each row execute function public.bv_touch();

drop trigger if exists bv_jobs_stamp_applied on public.bv_job_applications;
create trigger bv_jobs_stamp_applied before insert or update on public.bv_job_applications
  for each row execute function public.bv_stamp_applied();

-- ── 3. Row Level Security ─────────────────────────────────────
alter table public.bv_members          enable row level security;
alter table public.bv_user_profile     enable row level security;
alter table public.bv_job_applications enable row level security;

-- bv_members: no policies on purpose. Only the SQL editor / service role can add members.

drop policy if exists bv_profile_own on public.bv_user_profile;
create policy bv_profile_own on public.bv_user_profile
  for all to authenticated
  using (user_id = auth.uid() and public.bv_is_member())
  with check (user_id = auth.uid() and public.bv_is_member());

drop policy if exists bv_jobs_own on public.bv_job_applications;
create policy bv_jobs_own on public.bv_job_applications
  for all to authenticated
  using (user_id = auth.uid() and public.bv_is_member())
  with check (user_id = auth.uid() and public.bv_is_member());

revoke all on public.bv_members from anon, authenticated;
revoke all on public.bv_user_profile, public.bv_job_applications from anon;
grant select, insert, update, delete on public.bv_user_profile, public.bv_job_applications to authenticated;

-- ── 4. RPCs called by Make.com (with the user's JWT) ──────────
-- Step A: verify the caller and fetch everything Gemini needs in one call.
-- A missing/expired token fails here (401/403), so Gemini is never called for strangers.
create or replace function public.bv_get_analysis_context(p_job_id uuid)
returns json
language plpgsql stable security invoker set search_path = public
as $$
declare
  ctx json;
begin
  if auth.uid() is null or not public.bv_is_member() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select json_build_object(
           'job_id',          j.id,
           'platform',        j.platform,
           'job_url',         coalesce(j.job_url, ''),
           'raw_description', j.raw_description,
           'full_name',       p.full_name,
           'target_niches',   p.target_niches,
           'resume_text',     p.resume_text,
           'portfolio_links', coalesce(p.portfolio_links, ''),
           'hourly_rate_min', coalesce(p.hourly_rate_min, 0)
         )
    into ctx
    from public.bv_job_applications j
    join public.bv_user_profile p on p.user_id = j.user_id
   where j.id = p_job_id and j.user_id = auth.uid();

  if ctx is null then
    raise exception 'Job not found, or master profile missing' using errcode = 'P0002';
  end if;
  return ctx;
end;
$$;

-- Step B: save Gemini's answer. Takes the raw model text so Make doesn't have to
-- re-serialize it; tolerates ```json fences and validates every field.
create or replace function public.bv_apply_analysis(p_job_id uuid, p_analysis_text text)
returns public.bv_job_applications
language plpgsql security invoker set search_path = public
as $$
declare
  cleaned text;
  a       jsonb;
  score   text;
  result  public.bv_job_applications;
begin
  if auth.uid() is null or not public.bv_is_member() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  cleaned := btrim(coalesce(p_analysis_text, ''));
  cleaned := regexp_replace(cleaned, '^```(json)?\s*', '');
  cleaned := regexp_replace(cleaned, '\s*```$', '');

  begin
    a := cleaned::jsonb;
    if jsonb_typeof(a) <> 'object' then
      raise exception 'not an object';
    end if;
  exception when others then
    update public.bv_job_applications
       set analysis_state = 'failed',
           analysis_error = 'Gemini did not return valid JSON. Retry, or check the Make.com Gemini module output.'
     where id = p_job_id and user_id = auth.uid()
    returning * into result;
    if result.id is null then
      raise exception 'Job not found' using errcode = 'P0002';
    end if;
    return result;
  end;

  score := a ->> 'fit_score';

  update public.bv_job_applications set
    job_title            = coalesce(nullif(left(btrim(a ->> 'job_title'), 200), ''), job_title),
    company_or_client    = coalesce(nullif(left(btrim(a ->> 'company_or_client'), 200), ''), 'Unknown'),
    fit_score            = case when score ~ '^\s*-?\d+(\.\d+)?\s*$'
                                then least(100, greatest(0, round(score::numeric)))::int end,
    attention_check_word = coalesce(nullif(left(btrim(a ->> 'attention_check_word'), 200), ''), 'None'),
    red_flags            = case when jsonb_typeof(a -> 'red_flags') = 'array' then a -> 'red_flags' else '[]'::jsonb end,
    matching_skills      = case when jsonb_typeof(a -> 'matching_skills') = 'array' then a -> 'matching_skills' else '[]'::jsonb end,
    subject_line         = nullif(left(btrim(a ->> 'subject_line'), 300), ''),
    tailored_pitch       = nullif(btrim(a ->> 'tailored_pitch'), ''),
    analysis_state       = 'done',
    analysis_error       = null
  where id = p_job_id and user_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

revoke execute on function public.bv_get_analysis_context(uuid) from public, anon;
revoke execute on function public.bv_apply_analysis(uuid, text) from public, anon;
grant execute on function public.bv_get_analysis_context(uuid) to authenticated;
grant execute on function public.bv_apply_analysis(uuid, text) to authenticated;
grant execute on function public.bv_is_member() to authenticated;

-- ── 5. Give yourself access (edit the email, then run) ────────
-- The account must already exist in Authentication → Users.
-- insert into public.bv_members (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
