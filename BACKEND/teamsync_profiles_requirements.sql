-- ============================================================
-- TeamSync — profile details (picture, mobile, Facebook) + room join requirements
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ── 1. Private contact details (mobile + Facebook) ────────────
-- Kept out of `profiles` because room peers can read every column of a peer's profile row.
-- Only the user themself and the owners of a room they belong to can read these.
create table if not exists public.profile_contacts (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  mobile_number text,
  facebook_url  text,
  updated_at    timestamptz not null default now()
);
alter table public.profile_contacts enable row level security;

-- Security definer so the check bypasses room_members RLS (no policy recursion).
create or replace function public.is_owner_of_member(p_target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members me
    join public.room_members them on them.room_id = me.room_id
    where me.user_id = auth.uid() and me.role = 'owner' and them.user_id = p_target
  );
$$;
grant execute on function public.is_owner_of_member(uuid) to authenticated;

drop policy if exists "contacts_select" on public.profile_contacts;
create policy "contacts_select" on public.profile_contacts for select
  using (user_id = auth.uid() or public.is_owner_of_member(user_id));
drop policy if exists "contacts_insert" on public.profile_contacts;
create policy "contacts_insert" on public.profile_contacts for insert with check (user_id = auth.uid());
drop policy if exists "contacts_update" on public.profile_contacts;
create policy "contacts_update" on public.profile_contacts for update using (user_id = auth.uid());
drop policy if exists "contacts_delete" on public.profile_contacts;
create policy "contacts_delete" on public.profile_contacts for delete using (user_id = auth.uid());

-- If an earlier version of this script put the columns on profiles, move the data and drop them.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'mobile_number') then
    insert into public.profile_contacts (user_id, mobile_number, facebook_url)
    select id, mobile_number, facebook_url from public.profiles
    where mobile_number is not null or facebook_url is not null
    on conflict (user_id) do nothing;
    alter table public.profiles drop column mobile_number;
    alter table public.profiles drop column facebook_url;
  end if;
end $$;

-- ── 2. Room join requirements (owner can change later) ────────
alter table public.rooms add column if not exists require_avatar boolean not null default false;
alter table public.rooms add column if not exists require_mobile boolean not null default false;

-- ── 3. Public avatars bucket, 5 MB max, images only ───────────
-- Files live under "<user_id>/…"; anyone can view, only the owner of the folder can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ts avatars: read" on storage.objects;
create policy "ts avatars: read" on storage.objects for select to public
using (bucket_id = 'avatars');

drop policy if exists "ts avatars: own upload" on storage.objects;
create policy "ts avatars: own upload" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ts avatars: own update" on storage.objects;
create policy "ts avatars: own update" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ts avatars: own delete" on storage.objects;
create policy "ts avatars: own delete" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 4. Owners change a room's requirements ────────────────────
-- Any owner of the room (including promoted owners) may call this.
create or replace function public.set_room_requirements(p_room uuid, p_avatar boolean, p_mobile boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.room_members
                 where room_id = p_room and user_id = auth.uid() and role = 'owner') then
    raise exception 'Only a room owner can change these settings';
  end if;
  update public.rooms set require_avatar = coalesce(p_avatar, false),
                          require_mobile = coalesce(p_mobile, false)
   where id = p_room;
end;$$;
grant execute on function public.set_room_requirements(uuid, boolean, boolean) to authenticated;

-- ── 5. Enforce requirements when someone asks to join ─────────
-- Only join requests ('pending') are checked; owners/existing members are never blocked.
create or replace function public.enforce_room_requirements()
returns trigger language plpgsql security definer set search_path = public as $$
declare r public.rooms; p public.profiles; c public.profile_contacts;
begin
  if new.role <> 'pending' then return new; end if;
  select * into r from public.rooms            where id = new.room_id;
  select * into p from public.profiles         where id = new.user_id;
  select * into c from public.profile_contacts where user_id = new.user_id;

  if r.require_avatar and coalesce(p.avatar_url, '') = '' then
    raise exception 'This room only accepts users with a profile picture. Add one from Edit profile, then try again.';
  end if;
  if r.require_mobile and coalesce(trim(c.mobile_number), '') = '' then
    raise exception 'This room only accepts users with a mobile number. Add one from Edit profile, then try again.';
  end if;
  return new;
end;$$;

drop trigger if exists trg_enforce_room_requirements on public.room_members;
create trigger trg_enforce_room_requirements
  before insert on public.room_members
  for each row execute function public.enforce_room_requirements();
