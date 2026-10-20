-- ============================================================
-- TeamSync — room membership security
-- Run in the Supabase SQL Editor AFTER the base TeamSync schema
-- and teamsync_profiles_requirements.sql. Safe to re-run.
--
-- Fixes
--   1. Self-escalation: the old policies let any signed-in user insert
--      themselves into a room as 'owner'/'employee', or update their own
--      'pending' row to 'employee'/'owner', skipping owner approval.
--      Now a user may only add themselves as 'pending' (or as 'owner' of a
--      room they created), and only room owners can change a membership.
--   2. Promoted owners: update/delete checked rooms.owner_id (the creator
--      only), so promoted owners could not accept, promote or remove
--      members. Now any member with role 'owner' can.
--   The room creator's own owner row is protected: other owners can't
--   demote or remove them.
-- ============================================================

-- ── Helpers (security definer → no RLS recursion on room_members) ──
create or replace function public.is_room_owner(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.room_members
                 where room_id = p_room and user_id = auth.uid() and role = 'owner');
$$;
grant execute on function public.is_room_owner(uuid) to authenticated;

create or replace function public.is_room_creator(p_room uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rooms where id = p_room and owner_id = p_user);
$$;
grant execute on function public.is_room_creator(uuid, uuid) to authenticated;

-- ── Insert: request to join (pending), or the creator adding themself as owner ──
drop policy if exists "members_insert" on public.room_members;
create policy "members_insert" on public.room_members for insert with check (
  user_id = auth.uid()
  and (
    role = 'pending'
    or (role = 'owner' and public.is_room_creator(room_id, auth.uid()))
  )
);

-- ── Update: room owners only (accept, promote) ──
drop policy if exists "members_update" on public.room_members;
create policy "members_update" on public.room_members for update
  using (public.is_room_owner(room_id))
  with check (public.is_room_owner(room_id));

-- ── Delete: leave a room yourself, or an owner removes / declines someone
--    (never the room creator, unless they leave themself) ──
drop policy if exists "members_delete" on public.room_members;
create policy "members_delete" on public.room_members for delete using (
  user_id = auth.uid()
  or (public.is_room_owner(room_id) and not public.is_room_creator(room_id, user_id))
);

-- ── Guard: a membership can't be moved to another room/user, and the
--    room creator always stays an owner ──
create or replace function public.guard_member_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.room_id is distinct from old.room_id or new.user_id is distinct from old.user_id then
    raise exception 'A membership cannot be moved to another room or user';
  end if;
  if new.role is distinct from old.role and public.is_room_creator(old.room_id, old.user_id) then
    raise exception 'The room creator always stays an owner';
  end if;
  return new;
end;$$;

drop trigger if exists trg_guard_member_update on public.room_members;
create trigger trg_guard_member_update
  before update on public.room_members
  for each row execute function public.guard_member_update();
