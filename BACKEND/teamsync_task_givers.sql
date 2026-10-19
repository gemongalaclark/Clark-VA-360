-- Lets an employee see who assigned their tasks, even if the normal
-- profiles "peers" policy hides that profile. Safe to re-run.
-- Only returns name + picture, and only for people who assigned a task to the caller.
create or replace function public.get_my_task_givers(p_room uuid)
returns table (id uuid, first_name text, last_name text, avatar_url text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.first_name, p.last_name, p.avatar_url
  from public.profiles p
  where p.id in (
    select t.assigned_by from public.tasks t
    where t.room_id = p_room and t.employee_id = auth.uid() and t.assigned_by is not null
  );
$$;
grant execute on function public.get_my_task_givers(uuid) to authenticated;
