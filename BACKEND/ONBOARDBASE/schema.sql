-- ============================================================
-- OnboardBase — Client Onboarding Portal
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Tables are prefixed `ob_` because this Supabase project is shared with
-- TeamSync (which already owns `profiles`) and the Auto Scheduler.
--
--   ob_profiles          1:1 with auth.users — name, company, role (admin | client)
--   ob_projects          one engagement per client (status: onboarding | active)
--   ob_onboarding_steps  powers the progress bar; generated from a template
--   ob_intake_forms      one JSONB document per client (save & resume)
--   ob_files             registry of Storage objects (brand assets, deliverables)
--
-- Security model: every table has RLS. Clients see only rows tied to their own
-- auth.uid(); admins (ob_profiles.role = 'admin') see everything.
-- ============================================================

-- ── 1. Tables ─────────────────────────────────────────────────
create table if not exists public.ob_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  company_name text,
  role         text not null default 'client' check (role in ('admin', 'client')),
  created_at   timestamptz not null default now()
);

create table if not exists public.ob_projects (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.ob_profiles(id) on delete cascade,
  title         text not null,
  status        text not null default 'onboarding' check (status in ('onboarding', 'active')),
  start_date    date not null default current_date,
  -- "Active Project" handoff view
  contact_name  text,
  contact_email text,
  meeting_url   text,
  created_at    timestamptz not null default now(),
  unique (client_id)
);

create table if not exists public.ob_onboarding_steps (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.ob_projects(id) on delete cascade,
  step_key     text not null,            -- contract | brand_assets | intake | kickoff | review
  step_name    text not null,
  description  text,
  position     int  not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (project_id, step_key)
);
create index if not exists ob_steps_project_idx on public.ob_onboarding_steps (project_id, position);

create table if not exists public.ob_intake_forms (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null unique references public.ob_profiles(id) on delete cascade,
  question_data jsonb not null default '{}'::jsonb,   -- flexible answers, no rigid schema
  current_step  int   not null default 0,             -- where to resume
  submitted_at  timestamptz,
  updated_at    timestamptz not null default now()
);

create table if not exists public.ob_files (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.ob_profiles(id) on delete cascade,
  file_path   text not null,             -- object path inside the `onboardbase` bucket
  file_name   text not null,
  file_type   text not null default 'brand_asset' check (file_type in ('brand_asset', 'deliverable')),
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references public.ob_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists ob_files_client_idx on public.ob_files (client_id, created_at desc);

-- ── 2. Helpers ────────────────────────────────────────────────
-- SECURITY DEFINER so policies can ask "is this caller an admin?" without
-- recursing into ob_profiles' own RLS.
create or replace function public.ob_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.ob_profiles where id = auth.uid() and role = 'admin');
$$;

-- Standard onboarding template. Edit here to change what every new client gets.
create or replace function public.ob_create_default_steps()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.ob_onboarding_steps (project_id, step_key, step_name, description, position) values
    (new.id, 'contract',     'Sign Contract',        'Review and sign the service agreement.',                        1),
    (new.id, 'brand_assets', 'Upload Brand Assets',  'Drop in your logo, headshots and brand guidelines.',            2),
    (new.id, 'intake',       'Complete Intake Form', 'Tell us about your business, goals and tools.',                 3),
    (new.id, 'kickoff',      'Book Kickoff Call',    'Pick a time so we can walk through the plan together.',         4),
    (new.id, 'review',       'Final Review',         'We confirm everything is in place and switch your project on.', 5);
  return new;
end;
$$;

drop trigger if exists ob_projects_default_steps on public.ob_projects;
create trigger ob_projects_default_steps
  after insert on public.ob_projects
  for each row execute function public.ob_create_default_steps();

-- Keep completed_at honest, and stop clients from rewriting the template itself.
create or replace function public.ob_guard_step_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.ob_is_admin() then
    if new.project_id is distinct from old.project_id
       or new.step_key  is distinct from old.step_key
       or new.step_name is distinct from old.step_name
       or new.position  is distinct from old.position then
      raise exception 'Clients may only change completion state';
    end if;
    -- "Final Review" is the VA's sign-off; clients can't tick it themselves.
    if old.step_key = 'review' then
      raise exception 'Only an admin can complete the final review';
    end if;
  end if;
  if new.is_completed and not old.is_completed then
    new.completed_at := now();
  elsif not new.is_completed then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists ob_steps_guard on public.ob_onboarding_steps;
create trigger ob_steps_guard
  before update on public.ob_onboarding_steps
  for each row execute function public.ob_guard_step_update();

-- The handoff: when the last step is ticked, the project flips to "active".
create or replace function public.ob_sync_project_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  remaining int;
begin
  select count(*) into remaining
    from public.ob_onboarding_steps
   where project_id = new.project_id and not is_completed;

  update public.ob_projects
     set status = case when remaining = 0 then 'active' else 'onboarding' end
   where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists ob_steps_sync_status on public.ob_onboarding_steps;
create trigger ob_steps_sync_status
  after update of is_completed on public.ob_onboarding_steps
  for each row execute function public.ob_sync_project_status();

-- Auto-create a profile for every new auth user. Invited clients arrive with
-- full_name / company_name in user metadata (see the invite-client Edge Function).
-- Everyone starts as 'client' — promote your own account manually (see README).
create or replace function public.ob_handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'ob_invited' then
    insert into public.ob_profiles (id, email, full_name, company_name, role)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'company_name',
      'client'
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists ob_on_auth_user_created on auth.users;
create trigger ob_on_auth_user_created
  after insert on auth.users
  for each row execute function public.ob_handle_new_user();

-- ── 3. Row Level Security ─────────────────────────────────────
alter table public.ob_profiles         enable row level security;
alter table public.ob_projects         enable row level security;
alter table public.ob_onboarding_steps enable row level security;
alter table public.ob_intake_forms     enable row level security;
alter table public.ob_files            enable row level security;

-- ob_profiles
drop policy if exists "ob profiles: read own or admin" on public.ob_profiles;
create policy "ob profiles: read own or admin" on public.ob_profiles
  for select to authenticated
  using (id = auth.uid() or public.ob_is_admin());

drop policy if exists "ob profiles: admin manage" on public.ob_profiles;
create policy "ob profiles: admin manage" on public.ob_profiles
  for all to authenticated
  using (public.ob_is_admin()) with check (public.ob_is_admin());

-- ob_projects (clients read only; admins do everything)
drop policy if exists "ob projects: read own or admin" on public.ob_projects;
create policy "ob projects: read own or admin" on public.ob_projects
  for select to authenticated
  using (client_id = auth.uid() or public.ob_is_admin());

drop policy if exists "ob projects: admin manage" on public.ob_projects;
create policy "ob projects: admin manage" on public.ob_projects
  for all to authenticated
  using (public.ob_is_admin()) with check (public.ob_is_admin());

-- ob_onboarding_steps (clients may tick their own steps; the guard trigger limits what changes)
drop policy if exists "ob steps: read own or admin" on public.ob_onboarding_steps;
create policy "ob steps: read own or admin" on public.ob_onboarding_steps
  for select to authenticated
  using (
    public.ob_is_admin()
    or exists (select 1 from public.ob_projects p where p.id = project_id and p.client_id = auth.uid())
  );

drop policy if exists "ob steps: update own or admin" on public.ob_onboarding_steps;
create policy "ob steps: update own or admin" on public.ob_onboarding_steps
  for update to authenticated
  using (
    public.ob_is_admin()
    or exists (select 1 from public.ob_projects p where p.id = project_id and p.client_id = auth.uid())
  )
  with check (
    public.ob_is_admin()
    or exists (select 1 from public.ob_projects p where p.id = project_id and p.client_id = auth.uid())
  );

drop policy if exists "ob steps: admin insert/delete" on public.ob_onboarding_steps;
create policy "ob steps: admin insert/delete" on public.ob_onboarding_steps
  for all to authenticated
  using (public.ob_is_admin()) with check (public.ob_is_admin());

-- ob_intake_forms
drop policy if exists "ob intake: own or admin read" on public.ob_intake_forms;
create policy "ob intake: own or admin read" on public.ob_intake_forms
  for select to authenticated
  using (client_id = auth.uid() or public.ob_is_admin());

drop policy if exists "ob intake: own insert" on public.ob_intake_forms;
create policy "ob intake: own insert" on public.ob_intake_forms
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists "ob intake: own update" on public.ob_intake_forms;
create policy "ob intake: own update" on public.ob_intake_forms
  for update to authenticated
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- ob_files
drop policy if exists "ob files: own or admin read" on public.ob_files;
create policy "ob files: own or admin read" on public.ob_files
  for select to authenticated
  using (client_id = auth.uid() or public.ob_is_admin());

drop policy if exists "ob files: own brand asset insert, admin any" on public.ob_files;
create policy "ob files: own brand asset insert, admin any" on public.ob_files
  for insert to authenticated
  with check (
    public.ob_is_admin()
    or (client_id = auth.uid() and file_type = 'brand_asset' and uploaded_by = auth.uid())
  );

drop policy if exists "ob files: own brand asset delete, admin any" on public.ob_files;
create policy "ob files: own brand asset delete, admin any" on public.ob_files
  for delete to authenticated
  using (
    public.ob_is_admin()
    or (client_id = auth.uid() and file_type = 'brand_asset')
  );

-- ── 4. Storage ────────────────────────────────────────────────
-- Private bucket. Objects live at  <client_id>/<timestamp>-<filename>
-- so the first path segment is the tenant boundary.
insert into storage.buckets (id, name, public, file_size_limit)
values ('onboardbase', 'onboardbase', false, 10485760)   -- 10 MB per file
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "ob storage: read own folder or admin" on storage.objects;
create policy "ob storage: read own folder or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'onboardbase'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.ob_is_admin())
  );

drop policy if exists "ob storage: write own folder or admin" on storage.objects;
create policy "ob storage: write own folder or admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'onboardbase'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.ob_is_admin())
  );

drop policy if exists "ob storage: delete own folder or admin" on storage.objects;
create policy "ob storage: delete own folder or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'onboardbase'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.ob_is_admin())
  );
