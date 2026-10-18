-- ============================================================
-- TeamSync Workspace — Assigned Tasks migration
-- Run ONCE in the Supabase SQL Editor (after the base TeamSync schema).
-- Safe to re-run.
--
-- New task lifecycle
--   assigned  → owner created it, employee has not submitted yet ("To do")
--   submitted → employee submitted their work, waiting for owner review
--   approved  → owner approved
--   rejected  → owner declined / asked for a revision (back on the employee's list)
-- ============================================================

-- ── 1. Columns ────────────────────────────────────────────────
alter table public.tasks add column if not exists assigned_by  uuid references public.profiles(id) on delete set null;
alter table public.tasks add column if not exists deadline     timestamptz;          -- null = no deadline
alter table public.tasks add column if not exists submission   jsonb not null default '[]'::jsonb;  -- table rows filled in by the employee
alter table public.tasks add column if not exists submitted_at timestamptz;

-- ── 2. Statuses ───────────────────────────────────────────────
alter table public.tasks drop constraint if exists tasks_status_check;
update public.tasks set status = 'submitted' where status = 'pending';
alter table public.tasks
  add constraint tasks_status_check check (status in ('assigned','submitted','approved','rejected'));
alter table public.tasks alter column status set default 'assigned';

create index if not exists tasks_employee_status_idx on public.tasks (employee_id, status);
create index if not exists tasks_deadline_idx on public.tasks (deadline) where deadline is not null;

-- ── 3. Row Level Security ─────────────────────────────────────
-- Owners create tasks for employees of THEIR room only.
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks for insert with check (
  assigned_by = auth.uid()
  and exists (select 1 from public.room_members
              where room_id = tasks.room_id and user_id = auth.uid() and role = 'owner')
  and exists (select 1 from public.room_members
              where room_id = tasks.room_id and user_id = tasks.employee_id and role = 'employee')
);

-- Employee updates their own task (submit / resubmit); owners update any task in their room.
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks for update using (
  employee_id = auth.uid() or
  exists (select 1 from public.room_members where room_id = tasks.room_id and user_id = auth.uid() and role = 'owner')
);

-- Only owners delete tasks.
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks for delete using (
  exists (select 1 from public.room_members where room_id = tasks.room_id and user_id = auth.uid() and role = 'owner')
);

-- Guard: employees may only change the submission + move assigned/rejected → submitted.
create or replace function public.guard_task_update()
returns trigger language plpgsql security definer as $$
declare v_is_owner boolean;
begin
  select exists (select 1 from public.room_members
                 where room_id = old.room_id and user_id = auth.uid() and role = 'owner') into v_is_owner;
  if v_is_owner then return new; end if;

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
drop trigger if exists tasks_guard_update on public.tasks;
create trigger tasks_guard_update before update on public.tasks
  for each row execute function public.guard_task_update();

-- ── 4. Notifications ──────────────────────────────────────────
drop trigger if exists on_task_submitted on public.tasks;
drop trigger if exists on_task_reviewed  on public.tasks;
drop trigger if exists on_task_assigned  on public.tasks;
drop trigger if exists on_task_status_change on public.tasks;

-- Employee is told when a task is assigned to them
create or replace function public.notify_task_assigned()
returns trigger language plpgsql security definer as $$
declare v_name text;
begin
  select first_name||' '||last_name into v_name from public.profiles
    where id = coalesce(new.assigned_by, (select owner_id from public.rooms where id = new.room_id));
  insert into public.notifications(user_id, room_id, type, message)
  values (new.employee_id, new.room_id, 'task_assigned',
          coalesce(v_name,'Your client')||' assigned you a new task: "'||new.title||'"'
          ||case when new.deadline is not null then ' (has a deadline)' else '' end);
  return new;
end;$$;
create trigger on_task_assigned after insert on public.tasks
  for each row execute function public.notify_task_assigned();

-- Owner is told on submission; employee is told on approval / revision request
create or replace function public.notify_task_status_change()
returns trigger language plpgsql security definer as $$
declare v_owner uuid; v_name text;
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'submitted' then
    select coalesce(new.assigned_by, owner_id) into v_owner from public.rooms where id = new.room_id;
    select first_name||' '||last_name into v_name from public.profiles where id = new.employee_id;
    insert into public.notifications(user_id, room_id, type, message)
    values (v_owner, new.room_id, 'task_submitted',
            v_name||' completed a task and submitted it for review: "'||new.title||'"');

  elsif new.status = 'approved' then
    insert into public.notifications(user_id, room_id, type, message)
    values (new.employee_id, new.room_id, 'task_approved',
            'Your task "'||new.title||'" was approved. You''re good to go!');

  elsif new.status = 'rejected' then
    insert into public.notifications(user_id, room_id, type, message)
    values (new.employee_id, new.room_id, 'task_rejected',
            'Revision requested for "'||new.title||'"'
            ||case when new.reviewer_notes is not null then ': '||new.reviewer_notes else '.' end);
  end if;
  return new;
end;$$;
create trigger on_task_status_change after update on public.tasks
  for each row execute function public.notify_task_status_change();
