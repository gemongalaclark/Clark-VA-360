-- ============================================================
-- TeamSync — owner task editing: server-side rule + employee notification
-- Run in the Supabase SQL Editor AFTER teamsync_assigned_tasks.sql
-- (and teamsync_email_notifications.sql, so the notification is also emailed).
-- ============================================================

-- 1. Guard: owners may edit title/description/deadline only while the task is
--    'assigned' or 'rejected' (revision). Approve / decline of a submitted task
--    still works because those change the status. Employee path is unchanged.
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
         or new.deadline    is distinct from old.deadline) then
      raise exception 'Only assigned or revision tasks can be edited';
    end if;
    return new;
  end if;

  -- employee path
  if old.employee_id is distinct from auth.uid() then
    raise exception 'Not allowed';
  end if;
  if new.status not in ('submitted') or old.status not in ('assigned','rejected') then
    raise exception 'Employees can only submit assigned or revision-requested tasks';
  end if;
  new.title          := old.title;
  new.description    := old.description;
  new.deadline       := old.deadline;
  new.employee_id    := old.employee_id;
  new.room_id        := old.room_id;
  new.assigned_by    := old.assigned_by;
  new.reviewer_notes := null;           -- cleared on resubmission
  new.submitted_at   := now();
  return new;
end;$$;

-- 2. Notify the employee when the owner edits their task
create or replace function public.notify_task_edited()
returns trigger language plpgsql security definer as $$
declare v_name text;
begin
  if new.status is distinct from old.status then return new; end if;
  if new.title       is not distinct from old.title
     and new.description is not distinct from old.description
     and new.deadline    is not distinct from old.deadline then
    return new;
  end if;

  select first_name||' '||last_name into v_name from public.profiles
    where id = coalesce(new.assigned_by, (select owner_id from public.rooms where id = new.room_id));
  insert into public.notifications(user_id, room_id, type, message)
  values (new.employee_id, new.room_id, 'task_updated',
          coalesce(v_name,'Your client')||' updated the task "'||new.title||'"'
          ||case when new.deadline is not null then ' (has a deadline)' else '' end
          ||'. Please review the latest details.');
  return new;
end;$$;

drop trigger if exists on_task_edited on public.tasks;
create trigger on_task_edited after update on public.tasks
  for each row execute function public.notify_task_edited();
