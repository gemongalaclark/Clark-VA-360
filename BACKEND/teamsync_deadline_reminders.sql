-- ============================================================
-- TeamSync — deadline reminders (in-app notification + email, 3 days before)
-- Run in the Supabase SQL Editor AFTER teamsync_email_notifications.sql
-- (re-run that file too: it now has a subject line for 'task_deadline').
-- Safe to re-run.
--
-- Every hour pg_cron calls send_deadline_reminders(). For each task that is
-- still on the employee's plate (assigned / revision requested) and due within
-- the next 3 days, it inserts ONE 'task_deadline' notification. The existing
-- email trigger then emails it to the employee's profile email.
-- A task is reminded once per deadline value: if the owner moves the deadline,
-- a fresh reminder is sent for the new date.
-- ============================================================

create extension if not exists pg_cron;

-- Remembers which (task, deadline) pairs were already reminded
create table if not exists public.task_deadline_reminders (
  task_id   uuid        not null references public.tasks(id) on delete cascade,
  deadline  timestamptz not null,
  sent_at   timestamptz not null default now(),
  primary key (task_id, deadline)
);
alter table public.task_deadline_reminders enable row level security;
revoke all on public.task_deadline_reminders from anon, authenticated;

create or replace function public.send_deadline_reminders()
returns integer language plpgsql security definer
set search_path = public as $$
declare
  r record;
  v_left interval;
  v_when text;
  v_count integer := 0;
begin
  for r in
    select t.id, t.title, t.deadline, t.employee_id, t.room_id
    from public.tasks t
    where t.deadline is not null
      and t.status in ('assigned', 'rejected')
      and t.deadline > now()
      and t.deadline <= now() + interval '3 days'
      and not exists (select 1 from public.task_deadline_reminders d
                      where d.task_id = t.id and d.deadline = t.deadline)
  loop
    v_left := r.deadline - now();
    v_when := case
      when v_left < interval '1 hour'  then 'in less than an hour'
      when v_left < interval '24 hours' then 'in about ' || ceil(extract(epoch from v_left) / 3600)::int || ' hours'
      else 'in about ' || round(extract(epoch from v_left) / 86400)::int || ' days'
    end;

    insert into public.task_deadline_reminders (task_id, deadline) values (r.id, r.deadline);
    insert into public.notifications (user_id, room_id, type, message)
    values (r.employee_id, r.room_id, 'task_deadline',
            'Deadline reminder: "' || r.title || '" is due ' || v_when || '. Submit it before the deadline.');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;$$;
revoke all on function public.send_deadline_reminders() from public, anon, authenticated;

-- Hourly schedule (re-creates the job if it already exists)
do $$
begin
  perform cron.unschedule('teamsync-deadline-reminders');
exception when others then null;
end $$;
select cron.schedule('teamsync-deadline-reminders', '0 * * * *', $$select public.send_deadline_reminders();$$);

-- Optional: send reminders for tasks that are already inside the 3-day window right now
select public.send_deadline_reminders();
