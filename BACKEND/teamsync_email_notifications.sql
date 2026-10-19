-- ============================================================
-- TeamSync — email every notification via EmailJS
-- Run in the Supabase SQL Editor AFTER teamsync_assigned_tasks.sql.
--
-- How it works: any row inserted into public.notifications (task assigned,
-- submitted, approved, revision, join requests, ...) fires a trigger that
-- POSTs to the EmailJS REST API using pg_net (async, never blocks or fails
-- the original insert). Runs server-side, so emails go out even when the
-- recipient is offline.
--
-- EmailJS prerequisites (dashboard.emailjs.com):
--   1. Account > Security: enable "Allow EmailJS API for non-browser applications".
--   2. Account > API keys: copy your Public Key AND Private Key.
--   3. Email Template variables used below:
--        {{to_email}}  {{to_name}}  {{subject}}  {{message}}  {{type}}  {{app_url}}
--      Set the template's "To Email" field to {{to_email}}.
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- ── 1. Private config (RLS on + no policies = unreachable from the client API) ──
create table if not exists public.app_secrets (
  key   text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Fill these in (replace the placeholder values), then run once:
insert into public.app_secrets (key, value) values
  ('emailjs_service_id',  'YOUR_SERVICE_ID'),
  ('emailjs_template_id', 'YOUR_TEMPLATE_ID'),
  ('emailjs_public_key',  'YOUR_PUBLIC_KEY'),
  ('emailjs_private_key', 'YOUR_PRIVATE_KEY'),
  ('app_url',             'https://your-site.example.com')
on conflict (key) do nothing;
-- To change a value later:  update public.app_secrets set value = '...' where key = '...';

-- ── 2. Trigger: email each new notification ──
create or replace function public.email_notification()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_cfg     jsonb;
  v_email   text;
  v_name    text;
  v_subject text;
begin
  select jsonb_object_agg(key, value) into v_cfg from public.app_secrets;
  if v_cfg is null or coalesce(v_cfg->>'emailjs_service_id', 'YOUR_SERVICE_ID') = 'YOUR_SERVICE_ID' then
    return new;  -- not configured yet: skip quietly
  end if;

  select email, first_name into v_email, v_name from public.profiles where id = new.user_id;
  if v_email is null then return new; end if;

  v_subject := case new.type
    when 'task_assigned' then 'New task assigned'
    when 'task_submitted' then 'Task submitted for review'
    when 'task_approved' then 'Task approved'
    when 'task_rejected' then 'Revision requested'
    when 'task_updated' then 'Task updated'
    when 'task_deadline' then 'Deadline reminder'
    else 'New notification'
  end;

  begin
    perform net.http_post(
      url     := 'https://api.emailjs.com/api/v1.0/email/send',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object(
        'service_id',      v_cfg->>'emailjs_service_id',
        'template_id',     v_cfg->>'emailjs_template_id',
        'user_id',         v_cfg->>'emailjs_public_key',
        'accessToken',     v_cfg->>'emailjs_private_key',
        'template_params', jsonb_build_object(
          'to_email', v_email,
          'to_name',  coalesce(v_name, 'there'),
          'subject',  'TeamSync — ' || v_subject,
          'message',  new.message,
          'type',     new.type,
          'app_url',  v_cfg->>'app_url'
        )
      )
    );
  exception when others then
    raise warning 'email_notification failed: %', sqlerrm;  -- never block the notification itself
  end;
  return new;
end;$$;

drop trigger if exists on_notification_email on public.notifications;
create trigger on_notification_email after insert on public.notifications
  for each row execute function public.email_notification();
