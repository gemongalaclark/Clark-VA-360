-- ============================================================
-- TeamSync — notify the employee when the owner deletes their task
-- Run in the Supabase SQL Editor AFTER teamsync_assigned_tasks.sql
-- (and teamsync_email_notifications.sql, so the notification is also emailed).
-- Safe to re-run.
-- ============================================================

create or replace function public.notify_task_deleted()
returns trigger language plpgsql security definer as $$
declare v_name text;
begin
  -- Skip when the task disappears because its room or employee was deleted (cascade):
  -- the notification's foreign keys would no longer resolve.
  if not exists (select 1 from public.rooms    where id = old.room_id)     then return old; end if;
  if not exists (select 1 from public.profiles where id = old.employee_id) then return old; end if;

  select first_name||' '||last_name into v_name from public.profiles
    where id = coalesce(auth.uid(), old.assigned_by, (select owner_id from public.rooms where id = old.room_id));

  insert into public.notifications(user_id, room_id, type, message)
  values (old.employee_id, old.room_id, 'task_deleted',
          coalesce(v_name,'Your client')||' deleted the task "'||old.title||'". No further action is needed.');
  return old;
end;$$;

drop trigger if exists on_task_deleted on public.tasks;
create trigger on_task_deleted before delete on public.tasks
  for each row execute function public.notify_task_deleted();
