-- ============================================================
-- QuoteVelo AI — Smart Inquiry Triage & Auto-Proposal Portal
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Tables are prefixed `qv_` because this Supabase project is shared with
-- TeamSync (`profiles`), OnboardBase (`ob_*`) and the Auto Scheduler.
--
--   qv_admins   who may open the dashboard (a user id allow-list)
--   qv_leads    one row per prospect inquiry + everything the AI adds to it
--
-- Security model
--   * The public quote form is anonymous: anon may INSERT a brand-new lead
--     (status 'new', no AI fields) and nothing else. Anon can never read.
--   * Admins (qv_admins) can read and update every lead.
--   * Activepieces writes back with the service-role key, which bypasses RLS.
--
-- Pipeline:  new → scored → sent → won   (lost is an archive state)
-- ============================================================

-- ── 1. Tables ─────────────────────────────────────────────────
create table if not exists public.qv_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.qv_leads (
  id            uuid primary key default gen_random_uuid(),

  -- Prospect input (public form)
  full_name     text not null check (char_length(full_name) between 1 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  company       text check (char_length(company) <= 160),
  service_type  text not null check (char_length(service_type) <= 120),
  budget_range  text not null check (char_length(budget_range) <= 60),
  timeline      text not null check (char_length(timeline) <= 60),
  project_scope text not null check (char_length(project_scope) between 10 and 4000),
  extra         jsonb not null default '{}'::jsonb,       -- decision maker, referral source, etc.

  -- Pipeline
  status        text not null default 'new' check (status in ('new', 'scored', 'sent', 'won', 'lost')),

  -- Filled by Activepieces Flow 1 (Gemini + Google Docs)
  ai_score         int  check (ai_score between 1 and 100),
  ai_tag           text check (ai_tag in ('High Priority', 'Standard', 'Low Budget')),
  ai_summary       jsonb,                                  -- ["bullet 1", "bullet 2", "bullet 3"]
  ai_proposal      text,                                   -- scope-of-work text
  ai_email_subject text,
  ai_email_body    text,
  proposal_doc_url text,
  ai_error         text,                                   -- set by the flow's failure branch
  scored_at        timestamptz,

  -- Filled by Activepieces Flow 2 (Gmail)
  send_requested_at timestamptz,                           -- owner clicked "Approve & Send"
  sent_at           timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists qv_leads_status_idx  on public.qv_leads (status, created_at desc);
create index if not exists qv_leads_created_idx on public.qv_leads (created_at desc);

-- ── 2. Helpers ────────────────────────────────────────────────
-- SECURITY DEFINER so policies can ask "is the caller an admin?" without
-- recursing into qv_admins' own RLS.
create or replace function public.qv_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.qv_admins where user_id = auth.uid());
$$;

create or replace function public.qv_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists qv_leads_touch on public.qv_leads;
create trigger qv_leads_touch
  before update on public.qv_leads
  for each row execute function public.qv_touch_updated_at();

-- A signed-in admin may edit status + the human-reviewable drafts, but must not
-- forge the machine-written facts (score, doc link, sent_at). Service role
-- (Activepieces) has auth.uid() = null and passes straight through.
create or replace function public.qv_guard_lead_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.full_name     is distinct from old.full_name
     or new.email         is distinct from old.email
     or new.project_scope is distinct from old.project_scope
     or new.ai_score      is distinct from old.ai_score
     or new.ai_tag        is distinct from old.ai_tag
     or new.ai_summary    is distinct from old.ai_summary
     or new.proposal_doc_url is distinct from old.proposal_doc_url
     or new.sent_at       is distinct from old.sent_at then
    raise exception 'Those fields are written by the automation, not by the dashboard';
  end if;

  -- Once an email has gone out, the drafts are history.
  if old.status in ('sent', 'won') and (
       new.ai_proposal is distinct from old.ai_proposal
       or new.ai_email_subject is distinct from old.ai_email_subject
       or new.ai_email_body is distinct from old.ai_email_body) then
    raise exception 'This proposal has already been sent';
  end if;

  -- Only the send-proposal function (service role) may request a send or mark one sent.
  if new.send_requested_at is distinct from old.send_requested_at then
    raise exception 'Use Approve & Send to send a proposal';
  end if;
  if new.status = 'sent' and old.status is distinct from 'sent' and old.sent_at is null then
    raise exception 'Use Approve & Send to send a proposal';
  end if;
  return new;
end;
$$;

drop trigger if exists qv_leads_guard on public.qv_leads;
create trigger qv_leads_guard
  before update on public.qv_leads
  for each row execute function public.qv_guard_lead_update();

-- ── 3. Row Level Security ─────────────────────────────────────
alter table public.qv_admins enable row level security;
alter table public.qv_leads  enable row level security;

drop policy if exists "qv_admins: read own row" on public.qv_admins;
create policy "qv_admins: read own row" on public.qv_admins
  for select to authenticated using (user_id = auth.uid());

-- Public quote form: insert only, and only a clean 'new' lead.
drop policy if exists "qv_leads: public can submit" on public.qv_leads;
create policy "qv_leads: public can submit" on public.qv_leads
  for insert to anon, authenticated
  with check (
    status = 'new'
    and ai_score is null and ai_tag is null and ai_summary is null
    and ai_proposal is null and ai_email_subject is null and ai_email_body is null
    and proposal_doc_url is null and sent_at is null and send_requested_at is null
  );

drop policy if exists "qv_leads: admin read" on public.qv_leads;
create policy "qv_leads: admin read" on public.qv_leads
  for select to authenticated using (public.qv_is_admin());

drop policy if exists "qv_leads: admin update" on public.qv_leads;
create policy "qv_leads: admin update" on public.qv_leads
  for update to authenticated using (public.qv_is_admin()) with check (public.qv_is_admin());

drop policy if exists "qv_leads: admin delete" on public.qv_leads;
create policy "qv_leads: admin delete" on public.qv_leads
  for delete to authenticated using (public.qv_is_admin());

-- Anonymous visitors insert with `Prefer: return=minimal` (no SELECT needed).
grant insert on public.qv_leads to anon;
grant select, insert, update, delete on public.qv_leads to authenticated;
grant select on public.qv_admins to authenticated;

-- ── 4. Realtime — the dashboard updates live when the AI finishes ─────
do $$
begin
  alter publication supabase_realtime add table public.qv_leads;
exception when duplicate_object then null;
end $$;

-- ── 5. Trigger Activepieces Flow 1 on every new lead ──────────
-- Option A (recommended, no SQL): Dashboard → Database → Webhooks → Create:
--   Table qv_leads · Events: Insert · Type: HTTP Request · Method POST
--   URL = your Activepieces Flow 1 "Catch Webhook" URL.
--
-- Option B (SQL): replace the URL below, then uncomment and run.
--
-- create trigger qv_new_lead_webhook
--   after insert on public.qv_leads
--   for each row execute function supabase_functions.http_request(
--     'https://cloud.activepieces.com/api/v1/webhooks/YOUR_FLOW_1_WEBHOOK_ID',
--     'POST',
--     '{"Content-Type":"application/json","x-qv-secret":"YOUR_SHARED_SECRET"}',
--     '{}',
--     '5000'
--   );

-- ── 6. Make yourself an admin ─────────────────────────────────
-- 1) Supabase → Authentication → Users → Add user (email + password, auto-confirm).
-- 2) Then run (with your email):
--
-- insert into public.qv_admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
