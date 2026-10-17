-- Create contact_messages table
CREATE TABLE contact_messages (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (submit the contact form)
CREATE POLICY "Allow public inserts"
  ON contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (you) can SELECT/read messages
CREATE POLICY "Allow authenticated reads"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- Google Calendar Auto Scheduler: registered Google users
-- Run this in the Supabase SQL editor if the table does not exist yet.
-- Also enable Authentication > Providers > Google and add Calendar scope:
-- https://www.googleapis.com/auth/calendar.events
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduler_users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT,
  full_name        TEXT,
  avatar_url       TEXT,
  provider         TEXT DEFAULT 'google',
  last_sign_in_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduler_users_email_idx ON scheduler_users (email);

ALTER TABLE scheduler_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scheduler users can read own row" ON scheduler_users;
CREATE POLICY "Scheduler users can read own row"
  ON scheduler_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Scheduler users can insert own row" ON scheduler_users;
CREATE POLICY "Scheduler users can insert own row"
  ON scheduler_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Scheduler users can update own row" ON scheduler_users;
CREATE POLICY "Scheduler users can update own row"
  ON scheduler_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-register every new auth user (Google sign-in creates auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_scheduler_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.scheduler_users (id, email, full_name, avatar_url, provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'google')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    last_sign_in_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_scheduler ON auth.users;
CREATE TRIGGER on_auth_user_created_scheduler
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_scheduler_user();

-- ============================================================
-- TeamSync Workspace — Supabase Schema
-- Run this section in the Supabase SQL Editor after the above.
-- ============================================================

-- ── Profiles (extends auth.users) ──────────────────────────
create table if not exists public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  first_name text not null,
  last_name  text not null,
  email      text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
-- profiles_select_peers added after room_members is created (see below)

-- ── Rooms ────────────────────────────────────────────────────
create table if not exists public.rooms (
  id         uuid  default gen_random_uuid() primary key,
  room_code  text  unique not null,
  name       text  not null,
  owner_id   uuid  references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null
);
alter table public.rooms enable row level security;

create policy "rooms_select" on public.rooms for select using (
  auth.uid() = owner_id or
  exists (select 1 from public.room_members where room_id = rooms.id and user_id = auth.uid())
);
create policy "rooms_insert" on public.rooms for insert with check (auth.uid() = owner_id);
create policy "rooms_update" on public.rooms for update using (auth.uid() = owner_id);
create policy "rooms_delete" on public.rooms for delete using (auth.uid() = owner_id);

-- ── Room Members ──────────────────────────────────────────────
create table if not exists public.room_members (
  id        uuid default gen_random_uuid() primary key,
  room_id   uuid references public.rooms(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  role      text check (role in ('owner','employee','pending')) not null default 'pending',
  joined_at timestamptz default now() not null,
  unique(room_id, user_id)
);
alter table public.room_members enable row level security;

create policy "members_select" on public.room_members for select using (
  user_id = auth.uid() or
  exists (select 1 from public.rooms where id = room_members.room_id and owner_id = auth.uid()) or
  exists (select 1 from public.room_members rm where rm.room_id = room_members.room_id and rm.user_id = auth.uid() and rm.role in ('owner','employee'))
);
create policy "members_insert" on public.room_members for insert with check (user_id = auth.uid());
create policy "members_update" on public.room_members for update using (
  user_id = auth.uid() or
  exists (select 1 from public.rooms where id = room_members.room_id and owner_id = auth.uid())
);
create policy "members_delete" on public.room_members for delete using (
  user_id = auth.uid() or
  exists (select 1 from public.rooms where id = room_members.room_id and owner_id = auth.uid())
);

-- NOW safe: room_members exists
create policy "profiles_select_peers" on public.profiles for select using (
  exists (
    select 1 from public.room_members rm1
    join public.room_members rm2 on rm1.room_id = rm2.room_id
    where rm1.user_id = auth.uid() and rm2.user_id = profiles.id
      and rm1.role in ('owner','employee')
  )
);

-- ── Tasks ─────────────────────────────────────────────────────
create table if not exists public.tasks (
  id             uuid default gen_random_uuid() primary key,
  room_id        uuid references public.rooms(id) on delete cascade not null,
  employee_id    uuid references public.profiles(id) on delete cascade not null,
  title          text not null,
  description    text,
  status         text check (status in ('pending','approved','rejected')) not null default 'pending',
  reviewer_notes text,
  created_at     timestamptz default now() not null,
  updated_at     timestamptz default now() not null
);
alter table public.tasks enable row level security;

create policy "tasks_select" on public.tasks for select using (
  exists (select 1 from public.room_members where room_id = tasks.room_id and user_id = auth.uid() and role in ('owner','employee'))
);
create policy "tasks_insert" on public.tasks for insert with check (
  employee_id = auth.uid() and
  exists (select 1 from public.room_members where room_id = tasks.room_id and user_id = auth.uid() and role = 'employee')
);
create policy "tasks_update" on public.tasks for update using (
  employee_id = auth.uid() or
  exists (select 1 from public.room_members where room_id = tasks.room_id and user_id = auth.uid() and role = 'owner')
);
create policy "tasks_delete" on public.tasks for delete using (employee_id = auth.uid() and status = 'pending');

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tasks_updated_at before update on public.tasks for each row execute function public.handle_updated_at();

-- ── Notifications ─────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  room_id    uuid references public.rooms(id) on delete cascade,
  type       text not null,
  message    text not null,
  read       boolean default false not null,
  created_at timestamptz default now() not null
);
alter table public.notifications enable row level security;

create policy "notif_select" on public.notifications for select using (user_id = auth.uid());
create policy "notif_insert" on public.notifications for insert with check (auth.uid() is not null);
create policy "notif_update" on public.notifications for update using (user_id = auth.uid());
create policy "notif_delete" on public.notifications for delete using (user_id = auth.uid());

-- ── Enable Realtime ───────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.room_members;

-- ── Trigger: notify owner on task submission ──────────────────
create or replace function public.notify_task_submitted()
returns trigger language plpgsql security definer as $$
declare v_owner uuid; v_name text;
begin
  select owner_id into v_owner from public.rooms where id = new.room_id;
  select first_name||' '||last_name into v_name from public.profiles where id = new.employee_id;
  insert into public.notifications(user_id,room_id,type,message)
  values(v_owner,new.room_id,'task_submitted',v_name||' submitted a task: "'||new.title||'"');
  return new;
end;$$;
create trigger on_task_submitted after insert on public.tasks for each row execute function public.notify_task_submitted();

-- ── Trigger: notify employee on review ───────────────────────
create or replace function public.notify_task_reviewed()
returns trigger language plpgsql security definer as $$
begin
  if new.status <> old.status and new.status in ('approved','rejected') then
    insert into public.notifications(user_id,room_id,type,message)
    values(new.employee_id,new.room_id,'task_'||new.status,'Your task "'||new.title||'" was '||new.status||'.');
  end if;
  return new;
end;$$;
create trigger on_task_reviewed after update on public.tasks for each row execute function public.notify_task_reviewed();

-- ── Trigger: notify owner on join request ────────────────────
create or replace function public.notify_join_request()
returns trigger language plpgsql security definer as $$
declare v_owner uuid; v_name text;
begin
  if new.role = 'pending' then
    select owner_id into v_owner from public.rooms where id = new.room_id;
    select first_name||' '||last_name into v_name from public.profiles where id = new.user_id;
    insert into public.notifications(user_id,room_id,type,message)
    values(v_owner,new.room_id,'member_request',v_name||' requested to join your room.');
  end if;
  return new;
end;$$;
create trigger on_join_request after insert on public.room_members for each row execute function public.notify_join_request();

-- ── Trigger: notify employee on acceptance ───────────────────
create or replace function public.notify_member_accepted()
returns trigger language plpgsql security definer as $$
declare v_room_name text;
begin
  if new.role = 'employee' and old.role = 'pending' then
    select name into v_room_name from public.rooms where id = new.room_id;
    insert into public.notifications(user_id,room_id,type,message)
    values(new.user_id,new.room_id,'member_accepted','You were accepted into "'||v_room_name||'"!');
  end if;
  return new;
end;$$;
create trigger on_member_accepted after update on public.room_members for each row execute function public.notify_member_accepted();

-- ── Helper: generate unique 8-char room code ─────────────────
create or replace function public.generate_room_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int; taken boolean;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(chars, floor(random()*length(chars)+1)::int, 1);
    end loop;
    select exists(select 1 from public.rooms where room_code = result) into taken;
    exit when not taken;
  end loop;
  return result;
end;$$;
