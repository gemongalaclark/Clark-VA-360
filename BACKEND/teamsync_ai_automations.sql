-- ============================================================
-- TeamSync — AI Workflow Orchestration (Make.com + Gemini)
-- Run in the Supabase SQL Editor AFTER teamsync_email_notifications.sql
-- (it reuses public.app_secrets) and teamsync_task_attachments.sql. Safe to re-run.
--
-- What this adds
--   1. room_integrations   — per-room Discord / Slack webhook URL (owners only)
--   2. task_ai_reviews     — Gemini's "AI QA Check" per submitted task (owners only)
--   3. push_task_event()   — on assign / submit / approve / revision, POSTs ONE enriched
--                            JSON payload to your Make.com Custom Webhook (via pg_net)
--   4. save_ai_review()    — the endpoint Make.com calls to write Gemini's verdict back
--
-- Full walkthrough: BACKEND/TEAMSYNC_AI_AUTOMATIONS_SETUP.md
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- ── 0. Config (same private table as the EmailJS trigger) ─────
insert into public.app_secrets (key, value) values
  ('make_webhook_url',    'YOUR_MAKE_WEBHOOK_URL'),
  -- Make.com sends this back with every AI result so nobody else can write reviews
  ('make_callback_token', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  -- Timezone used for deadlines in chat / calendar text
  ('display_timezone',    'Asia/Manila')
on conflict (key) do nothing;
-- Read your token:   select value from public.app_secrets where key = 'make_callback_token';
-- Set your webhook:  update public.app_secrets set value = 'https://hook.eu2.make.com/…' where key = 'make_webhook_url';

-- ── 1. Room chat integration (Discord / Slack) ────────────────
create table if not exists public.room_integrations (
  room_id          uuid primary key references public.rooms(id) on delete cascade,
  chat_webhook_url text check (chat_webhook_url is null or chat_webhook_url ~
    '^https://((ptb\.|canary\.)?discord(app)?\.com/api/webhooks/[0-9]+/[A-Za-z0-9_-]+|hooks\.slack\.com/services/[A-Za-z0-9_/]+)$'),
  updated_at       timestamptz not null default now()
);
alter table public.room_integrations enable row level security;

-- The webhook URL is a secret (anyone holding it can post to the channel): owners only.
drop policy if exists "integrations_owner_all" on public.room_integrations;
create policy "integrations_owner_all" on public.room_integrations for all
  using (exists (select 1 from public.room_members
                 where room_id = room_integrations.room_id and user_id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from public.room_members
                      where room_id = room_integrations.room_id and user_id = auth.uid() and role = 'owner'));

-- ── 2. AI QA reviews (owners only — the employee never sees the AI verdict) ──
create table if not exists public.task_ai_reviews (
  task_id        uuid primary key references public.tasks(id) on delete cascade,
  room_id        uuid not null references public.rooms(id) on delete cascade,
  score          int  not null check (score between 0 and 100),
  summary        text not null,
  recommendation text not null check (recommendation in ('approve', 'revise')),
  created_at     timestamptz not null default now()
);
alter table public.task_ai_reviews enable row level security;

drop policy if exists "ai_reviews_owner_select" on public.task_ai_reviews;
create policy "ai_reviews_owner_select" on public.task_ai_reviews for select
  using (exists (select 1 from public.room_members
                 where room_id = task_ai_reviews.room_id and user_id = auth.uid() and role = 'owner'));
-- No insert/update/delete policies: only save_ai_review() (security definer) writes here.

do $$
begin
  alter publication supabase_realtime add table public.task_ai_reviews;
exception when duplicate_object then null;
end $$;

-- Lets the Review page know whether to show "AI is checking…" (no secret values leak)
create or replace function public.ai_automation_enabled()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value ~ '^https://' from public.app_secrets where key = 'make_webhook_url'), false);
$$;
grant execute on function public.ai_automation_enabled() to authenticated;

-- ── 3. Helpers ─────────────────────────────────────────────────
-- Discord accepts Slack-format bodies on "<webhook>/slack", so Make.com needs one HTTP module for both.
create or replace function public.chat_post_url(p_url text)
returns text language sql immutable as $$
  select case
    when p_url is null then null
    when p_url ~ '^https://([a-z]+\.)?discord(app)?\.com/' then p_url || '/slack'
    else p_url
  end;
$$;

create or replace function public.format_deadline(p_deadline timestamptz)
returns text language sql stable security definer set search_path = public as $$
  select to_char(p_deadline at time zone coalesce(
           (select value from public.app_secrets where key = 'display_timezone'), 'UTC'),
         'Mon DD, YYYY "at" HH12:MI AM');
$$;

-- ── 4. Outbound event → Make.com ──────────────────────────────
create or replace function public.push_task_event()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_event   text;
  v_hook    text;
  v_app_url text;
  v_room    public.rooms;
  v_emp     public.profiles;
  v_actor   public.profiles;
  v_chat    text;
  v_total   int;
  v_done    int;
  v_pct     int;
  v_due     text;
  v_msg     text;
  v_ai      jsonb := null;
  v_prompt  text;
begin
  if tg_op = 'INSERT' then
    v_event := 'task_assigned';
  elsif new.status is distinct from old.status and new.status in ('submitted', 'approved', 'rejected') then
    v_event := 'task_' || new.status;
  else
    return new;
  end if;

  -- A (re)submission makes any earlier AI verdict stale
  if v_event = 'task_submitted' then
    delete from public.task_ai_reviews where task_id = new.id;
  end if;

  select value into v_hook    from public.app_secrets where key = 'make_webhook_url';
  select value into v_app_url from public.app_secrets where key = 'app_url';
  if coalesce(v_hook, '') !~ '^https://' then return new; end if;  -- not configured yet

  select * into v_room  from public.rooms    where id = new.room_id;
  select * into v_emp   from public.profiles where id = new.employee_id;
  select * into v_actor from public.profiles
    where id = case when v_event = 'task_submitted' then new.employee_id
                    else coalesce(auth.uid(), new.assigned_by, v_room.owner_id) end;
  select chat_webhook_url into v_chat from public.room_integrations where room_id = new.room_id;

  select count(*), count(*) filter (where status = 'approved') into v_total, v_done
    from public.tasks where room_id = new.room_id;
  v_pct := case when v_total = 0 then 0 else round(100.0 * v_done / v_total) end;
  v_due := case when new.deadline is not null then public.format_deadline(new.deadline) end;

  v_msg := case v_event
    when 'task_assigned' then
      '🚀 New task assigned in ' || v_room.name || ' (#' || v_room.room_code || '): '
      || v_emp.first_name || ' ' || v_emp.last_name || ' was assigned "' || new.title || '"'
      || coalesce(' — due ' || v_due, '') || '.'
    when 'task_submitted' then
      '📥 ' || v_emp.first_name || ' ' || v_emp.last_name || ' submitted "' || new.title
      || '" for review in ' || v_room.name || '.'
    when 'task_approved' then
      '✅ Task approved! ' || coalesce(v_actor.first_name || ' ' || v_actor.last_name, 'The owner')
      || ' approved "' || new.title || '" — ' || v_room.name || ' progress is now at ' || v_pct || '%!'
    when 'task_rejected' then
      '🔁 Revision requested on "' || new.title || '" for ' || v_emp.first_name
      || coalesce(': ' || new.reviewer_notes, '.')
  end;

  -- Gemini request body, fully built here so Make.com only has to forward it
  if v_event = 'task_submitted' then
    v_prompt :=
      'TASK TITLE: ' || new.title || E'\n'
      || 'TASK DESCRIPTION (owner''s instructions): ' || coalesce(nullif(trim(new.description), ''), '(none given)') || E'\n'
      || 'OWNER REFERENCE ATTACHMENTS: ' || coalesce(new.attachments::text, '[]') || E'\n'
      || 'DEADLINE: ' || coalesce(v_due, 'none') || E'\n'
      || 'SUBMITTED: ' || public.format_deadline(coalesce(new.submitted_at, now())) || E'\n'
      || 'EMPLOYEE FIRST NAME: ' || v_emp.first_name || E'\n'
      || 'EMPLOYEE SUBMISSION (one row per planned post): ' || coalesce(new.submission::text, '[]');

    v_ai := jsonb_build_object('gemini_request', jsonb_build_object(
      'systemInstruction', jsonb_build_object('parts', jsonb_build_array(jsonb_build_object('text',
        'You are the QA inspector for TeamSync, an agency task tool. Before the owner reviews it, compare the '
        || 'employee''s submission against the owner''s task instructions. Each submission row is one planned social '
        || 'media post (channel, date, day, time, status, topic, visual link). You cannot open links: judge only what '
        || 'is written — number of deliverables vs. what was asked, topics vs. the brief, dates vs. the deadline, '
        || 'missing or suspicious links. score: 0-100, how completely the submission meets the instructions. '
        || 'summary: at most 2 short plain-text sentences, name the employee by first name, cite concrete counts or '
        || 'gaps. recommendation: "approve" if score >= 80 and nothing important is missing, otherwise "revise". '
        || 'Never invent facts that are not in the data.'))),
      'contents', jsonb_build_array(jsonb_build_object('role', 'user',
        'parts', jsonb_build_array(jsonb_build_object('text', v_prompt)))),
      'generationConfig', jsonb_build_object(
        'temperature', 0.2,
        -- Gemini 3.x thinks by default and can exceed Make's 40 s HTTP timeout; a QA check only needs a little
        'thinkingConfig', jsonb_build_object('thinkingLevel', 'low'),
        'responseMimeType', 'application/json',
        'responseSchema', jsonb_build_object(
          'type', 'OBJECT',
          'properties', jsonb_build_object(
            'score',          jsonb_build_object('type', 'INTEGER'),
            'summary',        jsonb_build_object('type', 'STRING'),
            'recommendation', jsonb_build_object('type', 'STRING', 'enum', jsonb_build_array('approve', 'revise'))),
          'required', jsonb_build_array('score', 'summary', 'recommendation')))
    )::text);  -- a string, so Make.com can drop it straight into an HTTP body
  end if;

  begin
    perform net.http_post(
      url     := v_hook,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object(
        'event',   v_event,
        'app_url', v_app_url,
        'room',    jsonb_build_object('id', v_room.id, 'name', v_room.name, 'code', v_room.room_code, 'progress_pct', v_pct),
        'task',    jsonb_build_object(
          'id', new.id, 'title', new.title, 'description', new.description, 'status', new.status,
          'deadline', new.deadline, 'deadline_label', v_due, 'reviewer_notes', new.reviewer_notes),
        'employee', jsonb_build_object('first_name', v_emp.first_name, 'name', v_emp.first_name || ' ' || v_emp.last_name, 'email', v_emp.email),
        'actor',    jsonb_build_object('name', v_actor.first_name || ' ' || v_actor.last_name, 'email', v_actor.email),
        'chat',     jsonb_build_object(
          'enabled',  v_chat is not null,
          'post_url', public.chat_post_url(v_chat),
          'message',  v_msg,
          'body',     jsonb_build_object('text', v_msg)::text),
        'calendar', jsonb_build_object(
          'enabled',        v_event = 'task_assigned' and new.deadline is not null,
          'title',          '⏰ Due: ' || new.title || ' (TeamSync)',
          'start',          new.deadline - interval '1 hour',
          'end',            new.deadline,
          'attendee_email', v_emp.email,
          'description',    coalesce(new.description, '') || E'\n\nRoom: ' || v_room.name
                            || coalesce(E'\nOpen TeamSync: ' || v_app_url, '')),
        'ai', v_ai
      )
    );
  exception when others then
    raise warning 'push_task_event failed: %', sqlerrm;  -- never block the task change itself
  end;
  return new;
end;$$;

drop trigger if exists on_task_push_event on public.tasks;
create trigger on_task_push_event after insert or update on public.tasks
  for each row execute function public.push_task_event();

-- ── 5. Make.com → Supabase: save Gemini's verdict ─────────────
-- Called with the anon key at  POST <SUPABASE_URL>/rest/v1/rpc/save_ai_review
-- p_result is Gemini's raw JSON text: {"score":95,"summary":"…","recommendation":"approve"}
-- Returns the chat message to post, so Make.com never has to build JSON strings itself.
create or replace function public.save_ai_review(p_task_id uuid, p_token text, p_result text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_res   jsonb;
  v_task  public.tasks;
  v_emp   public.profiles;
  v_room  public.rooms;
  v_chat  text;
  v_score int;
  v_sum   text;
  v_rec   text;
  v_msg   text;
begin
  if p_token is null or p_token is distinct from
     (select value from public.app_secrets where key = 'make_callback_token') then
    raise exception 'Invalid token';
  end if;

  begin
    -- tolerate a ```json fence in case the model adds one
    v_res := regexp_replace(trim(p_result), '^```(json)?\s*|\s*```$', '', 'g')::jsonb;
  exception when others then
    raise exception 'AI result is not valid JSON';
  end;

  select * into v_task from public.tasks where id = p_task_id;
  if not found then raise exception 'Task not found'; end if;

  v_score := greatest(0, least(100, coalesce((v_res->>'score')::numeric, 0)::int));
  v_sum   := left(coalesce(nullif(trim(v_res->>'summary'), ''), 'No summary returned.'), 500);
  v_rec   := case when lower(v_res->>'recommendation') = 'approve' then 'approve' else 'revise' end;

  insert into public.task_ai_reviews (task_id, room_id, score, summary, recommendation)
  values (v_task.id, v_task.room_id, v_score, v_sum, v_rec)
  on conflict (task_id) do update set
    score = excluded.score, summary = excluded.summary,
    recommendation = excluded.recommendation, created_at = now();

  select * into v_emp  from public.profiles where id = v_task.employee_id;
  select * into v_room from public.rooms    where id = v_task.room_id;
  select chat_webhook_url into v_chat from public.room_integrations where room_id = v_task.room_id;

  v_msg := '📥 ' || v_emp.first_name || ' ' || v_emp.last_name || ' submitted "' || v_task.title
        || '" for review in ' || v_room.name || E'.\n✨ AI QA Check (' || v_score || '% match): ' || v_sum
        || ' Recommended action: ' || initcap(v_rec) || '.';

  return jsonb_build_object(
    'ok',            true,
    'chat_enabled',  v_chat is not null,
    'chat_post_url', public.chat_post_url(v_chat),
    'chat_body',     jsonb_build_object('text', v_msg)::text);
end;$$;
revoke all on function public.save_ai_review(uuid, text, text) from public;
grant execute on function public.save_ai_review(uuid, text, text) to anon, authenticated;
