-- ============================================================
-- TeamSync — task reference attachments (links + files, each with a short note)
-- Run in the Supabase SQL Editor AFTER teamsync_assigned_tasks.sql and
-- teamsync_task_edit.sql. Safe to re-run.
--
-- tasks.attachments is a jsonb array, e.g.
--   [{ "type":"link", "url":"https://…", "title":"Brand guide", "note":"Use page 3" },
--    { "type":"file", "path":"<room_id>/<uuid>-logo.png", "name":"logo.png",
--      "size":12345, "mime":"image/png", "note":"Primary logo" }]
-- ============================================================

-- ── 1. Column ─────────────────────────────────────────────────
alter table public.tasks add column if not exists attachments jsonb not null default '[]'::jsonb;

-- ── 2. Private storage bucket (20 MB per file) ────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 20971520)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- Files live under "<room_id>/…". Room members can read; only the room's owner can write/delete.
drop policy if exists "ts attach: members read" on storage.objects;
create policy "ts attach: members read" on storage.objects for select to authenticated
using (
  bucket_id = 'task-attachments'
  and exists (select 1 from public.room_members rm
              where rm.room_id::text = (storage.foldername(name))[1] and rm.user_id = auth.uid())
);

drop policy if exists "ts attach: owner upload" on storage.objects;
create policy "ts attach: owner upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-attachments'
  and exists (select 1 from public.room_members rm
              where rm.room_id::text = (storage.foldername(name))[1] and rm.user_id = auth.uid() and rm.role = 'owner')
);

drop policy if exists "ts attach: owner delete" on storage.objects;
create policy "ts attach: owner delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'task-attachments'
  and exists (select 1 from public.room_members rm
              where rm.room_id::text = (storage.foldername(name))[1] and rm.user_id = auth.uid() and rm.role = 'owner')
);

-- ── 3. Guard: employees can never change attachments ──────────
-- Same function as teamsync_task_edit.sql plus one line for attachments.
create or replace function public.guard_task_update()
returns trigger language plpgsql security definer as $$
declare v_is_owner boolean;
begin
  select exists (select 1 from public.room_members
                 where room_id = old.room_id and user_id = auth.uid() and role = 'owner') into v_is_owner;

  if v_is_owner then
    if new.status is not distinct from old.status
       and old.status not in ('assigned','rejected')
       and (new.title       is distinct from old.title
         or new.description is distinct from old.description
         or new.deadline    is distinct from old.deadline
         or new.attachments is distinct from old.attachments) then
      raise exception 'Only assigned or revision tasks can be edited';
    end if;
    return new;
  end if;

  if old.employee_id is distinct from auth.uid() then
    raise exception 'Not allowed';
  end if;
  if new.status not in ('submitted') or old.status not in ('assigned','rejected') then
    raise exception 'Employees can only submit assigned or revision-requested tasks';
  end if;
  new.title          := old.title;
  new.description    := old.description;
  new.deadline       := old.deadline;
  new.attachments    := old.attachments;
  new.employee_id    := old.employee_id;
  new.room_id        := old.room_id;
  new.assigned_by    := old.assigned_by;
  new.reviewer_notes := null;
  new.submitted_at   := now();
  return new;
end;$$;
