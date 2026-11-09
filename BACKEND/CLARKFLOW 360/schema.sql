-- ============================================================
-- ClarkFlow 360 — AI Email Triage Dashboard (Phase 1: database)
-- Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Tables are prefixed `cf_` because this Supabase project is shared with
-- TeamSync, OnboardBase, BuhayVA Copilot, BALANSE, the Job Tracker and the
-- Auto Scheduler.
--
--   cf_members       allowlist: who may use ClarkFlow (and spend Gmail/Gemini quota)
--   cf_clients       the VA's clients: who they are, which sender domains are theirs,
--                    and the tone/SOP notes Gemini must follow when drafting replies
--   cf_emails        Gmail messages pulled in by cf-gmail-sync, plus Gemini's triage
--   cf_oauth_tokens  the user's Gmail OAuth tokens, AES-256-GCM encrypted by the
--                    edge functions (functions/_shared/crypto.ts) before they get here
--   cf_oauth_states  one-time CSRF `state` values for the Google consent flow
--
-- Security model
--   • Users sign in with Supabase Auth; every row carries user_id = auth.uid().
--   • Only members (cf_members) get anything. The project's other apps share
--     auth.users, so being signed in is not enough. Every policy below and every
--     edge function checks cf_is_member(). Add yourself once (section 7).
--   • cf_clients:  the owner has full CRUD through RLS.
--   • cf_emails:   the owner can read their emails and edit only the triage fields
--                  (draft, status, priority, client). Rows are inserted by the
--                  cf-gmail-sync edge function using the service role.
--   • cf_oauth_tokens / cf_oauth_states: RLS on with NO policies and all grants
--                  revoked, so only the edge functions (service role) can touch
--                  them. The browser learns "is Gmail connected?" from
--                  cf_gmail_status(), which never returns a token.
-- ============================================================


-- ── 1. Enums ──────────────────────────────────────────────────
do $$ begin
  create type public.cf_triage_status as enum ('pending', 'triaged', 'reviewed', 'replied', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cf_priority_level as enum ('high', 'medium', 'low');
exception when duplicate_object then null; end $$;


-- ── 2. Shared trigger functions ───────────────────────────────
create or replace function public.cf_touch_updated_at()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Keeps client matching reliable: emails and domains are stored lowercase, trimmed,
-- without a leading "@", without blanks and without duplicates.
create or replace function public.cf_normalize_client()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.contact_email := nullif(lower(trim(new.contact_email)), '');
  new.domain_whitelist := coalesce((
    select array_agg(distinct d order by d)
      from (select ltrim(lower(trim(x)), '@') as d from unnest(new.domain_whitelist) as x) s
     where d <> ''
  ), '{}');
  return new;
end;
$$;


-- ── 3. Tables ─────────────────────────────────────────────────
create table if not exists public.cf_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies and edge functions can check membership without exposing cf_members.
create or replace function public.cf_is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.cf_members where user_id = auth.uid());
$$;

create table if not exists public.cf_clients (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  company_name     text not null check (char_length(trim(company_name)) between 1 and 120),
  contact_email    text check (contact_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  domain_whitelist text[] not null default '{}',
  custom_context   text check (char_length(custom_context) <= 8000),  -- tone, SOPs, boundaries
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Lets cf_emails reference (client, user) together, so an email can never be
  -- linked to another user's client.
  constraint cf_clients_id_user_key unique (id, user_id)
);
create unique index if not exists cf_clients_contact_email_key
  on public.cf_clients (user_id, contact_email) where contact_email is not null;
create index if not exists cf_clients_user_idx
  on public.cf_clients (user_id, is_active, company_name);
-- Sender-domain lookups during sync:  domain_whitelist @> array['acme.com']
create index if not exists cf_clients_domains_idx
  on public.cf_clients using gin (domain_whitelist);

create table if not exists public.cf_emails (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  client_id          uuid,
  gmail_message_id   text not null,
  gmail_thread_id    text not null,
  message_id_header  text,           -- RFC 2822 Message-ID, becomes In-Reply-To on our reply
  references_header  text,           -- RFC 2822 References, extended on our reply
  sender_name        text,
  sender_email       text not null,
  subject            text,
  snippet            text,
  body_text          text,
  body_html          text,
  received_at        timestamptz not null,
  triage_status      public.cf_triage_status not null default 'pending',
  priority_level     public.cf_priority_level,         -- null until Gemini triages it
  ai_summary         text,
  ai_generated_draft text,
  replied_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Gmail ids are unique per mailbox, so uniqueness is per user.
  -- Sync upserts with  ON CONFLICT (user_id, gmail_message_id) DO NOTHING.
  constraint cf_emails_gmail_message_key unique (user_id, gmail_message_id),
  -- Deleting a client keeps its emails and only clears client_id.
  constraint cf_emails_client_fkey foreign key (client_id, user_id)
    references public.cf_clients (id, user_id) on delete set null (client_id)
);
-- Left-hand queue: filter by status / priority, newest first
create index if not exists cf_emails_queue_idx
  on public.cf_emails (user_id, triage_status, priority_level, received_at desc);
-- Queue filtered by client
create index if not exists cf_emails_client_idx
  on public.cf_emails (user_id, client_id, received_at desc);
-- Thread viewer
create index if not exists cf_emails_thread_idx
  on public.cf_emails (user_id, gmail_thread_id, received_at);
create index if not exists cf_emails_sender_idx
  on public.cf_emails (user_id, sender_email);
create index if not exists cf_emails_gmail_message_idx
  on public.cf_emails (gmail_message_id);
-- Triage worker: the next batch of untriaged emails
create index if not exists cf_emails_pending_idx
  on public.cf_emails (user_id, received_at) where triage_status = 'pending';

create table if not exists public.cf_oauth_tokens (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  google_email            text not null,
  encrypted_access_token  text not null,
  access_token_iv         text not null,
  access_token_tag        text not null,
  encrypted_refresh_token text not null,
  refresh_token_iv        text not null,
  refresh_token_tag       text not null,
  token_expiry            timestamptz not null,
  scopes                  text[] not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- The consent flow starts from a signed-in fetch and finishes on a Google redirect that
-- carries no Supabase session, so `state` is kept here (hashed, one-time, 10 minutes)
-- to prove the callback belongs to the user who started it.
create table if not exists public.cf_oauth_states (
  state_hash    text primary key,          -- sha256 hex of the random state sent to Google
  user_id       uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,             -- PKCE verifier for this attempt
  expires_at    timestamptz not null default now() + interval '10 minutes',
  created_at    timestamptz not null default now()
);
create index if not exists cf_oauth_states_expiry_idx on public.cf_oauth_states (expires_at);


-- ── 4. Triggers ───────────────────────────────────────────────
drop trigger if exists cf_clients_normalize on public.cf_clients;
create trigger cf_clients_normalize before insert or update on public.cf_clients
  for each row execute function public.cf_normalize_client();

drop trigger if exists cf_clients_touch on public.cf_clients;
create trigger cf_clients_touch before update on public.cf_clients
  for each row execute function public.cf_touch_updated_at();

drop trigger if exists cf_emails_touch on public.cf_emails;
create trigger cf_emails_touch before update on public.cf_emails
  for each row execute function public.cf_touch_updated_at();

drop trigger if exists cf_oauth_tokens_touch on public.cf_oauth_tokens;
create trigger cf_oauth_tokens_touch before update on public.cf_oauth_tokens
  for each row execute function public.cf_touch_updated_at();


-- ── 5. Row Level Security ─────────────────────────────────────
alter table public.cf_members      enable row level security;
alter table public.cf_clients      enable row level security;
alter table public.cf_emails       enable row level security;
alter table public.cf_oauth_tokens enable row level security;
alter table public.cf_oauth_states enable row level security;

-- Nobody signed out touches anything.
revoke all on public.cf_members, public.cf_clients, public.cf_emails, public.cf_oauth_tokens, public.cf_oauth_states from anon;
-- Members list, tokens and states: SQL editor / edge functions (service role) only.
revoke all on public.cf_members, public.cf_oauth_tokens, public.cf_oauth_states from authenticated;

-- cf_clients: full CRUD on your own rows (members only)
drop policy if exists cf_clients_select_own on public.cf_clients;
create policy cf_clients_select_own on public.cf_clients for select to authenticated
  using (user_id = (select auth.uid()) and (select public.cf_is_member()));

drop policy if exists cf_clients_insert_own on public.cf_clients;
create policy cf_clients_insert_own on public.cf_clients for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.cf_is_member()));

drop policy if exists cf_clients_update_own on public.cf_clients;
create policy cf_clients_update_own on public.cf_clients for update to authenticated
  using (user_id = (select auth.uid()) and (select public.cf_is_member()))
  with check (user_id = (select auth.uid()) and (select public.cf_is_member()));

drop policy if exists cf_clients_delete_own on public.cf_clients;
create policy cf_clients_delete_own on public.cf_clients for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.cf_is_member()));

-- cf_emails: read your own; update only the triage fields (column grants below).
-- No insert/delete policies: sync writes with the service role, and "archived" is a status.
drop policy if exists cf_emails_select_own on public.cf_emails;
create policy cf_emails_select_own on public.cf_emails for select to authenticated
  using (user_id = (select auth.uid()) and (select public.cf_is_member()));

drop policy if exists cf_emails_update_own on public.cf_emails;
create policy cf_emails_update_own on public.cf_emails for update to authenticated
  using (user_id = (select auth.uid()) and (select public.cf_is_member()))
  with check (user_id = (select auth.uid()) and (select public.cf_is_member()));

revoke insert, update, delete on public.cf_emails from authenticated;
grant select on public.cf_emails to authenticated;
grant update (client_id, triage_status, priority_level, ai_generated_draft) on public.cf_emails to authenticated;


-- ── 6. Browser-safe Gmail connection status ───────────────────
-- Returns null when Gmail isn't connected. Never returns token material.
create or replace function public.cf_gmail_status()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'google_email', google_email,
    'scopes',       scopes,
    'connected_at', created_at,
    'updated_at',   updated_at
  )
  from cf_oauth_tokens
  where user_id = auth.uid() and public.cf_is_member();
$$;

revoke all on function public.cf_gmail_status() from public, anon;
grant execute on function public.cf_gmail_status() to authenticated;
revoke all on function public.cf_is_member() from public, anon;
grant execute on function public.cf_is_member() to authenticated;
revoke all on function public.cf_touch_updated_at() from public, anon, authenticated;
revoke all on function public.cf_normalize_client() from public, anon, authenticated;


-- ── 7. Give yourself access (run once, after your first ClarkFlow sign-in) ──
-- Members are added here only: there is no sign-up path into cf_members.
--
--   insert into public.cf_members (user_id)
--   select id from auth.users where lower(email) = 'gemongalaclark.official@gmail.com'
--   on conflict (user_id) do nothing;
--
-- Check:   select u.email from public.cf_members m join auth.users u on u.id = m.user_id;


-- ── 8. Phase 3: triage retries + linking emails to clients added later ──
-- (Safe to re-run. Added after Phase 2 went live, so these are ALTERs / OR REPLACE.)

-- cf-triage-analyze gives each email up to 3 tries, so one bad email can't block the queue.
alter table public.cf_emails add column if not exists triage_attempts smallint not null default 0;
alter table public.cf_emails add column if not exists triage_error text;

-- Same rule as cf-gmail-sync: a sender belongs to a client when their address is the
-- client's contact_email, or their domain is (or is a subdomain of) a whitelisted domain.
create or replace function public.cf_sender_matches(p_sender text, p_contact text, p_domains text[])
returns boolean
language sql immutable set search_path = public
as $$
  select p_sender = p_contact
      or exists (
           select 1 from unnest(p_domains) d
            where split_part(p_sender, '@', 2) = d
               or right(split_part(p_sender, '@', 2), char_length(d) + 1) = '.' || d
         );
$$;

-- When a client is added or edited, link that user's unassigned emails from them.
-- Emails Gemini already triaged without this client's context go back to 'pending',
-- so the next "Sync & triage" redrafts them in the client's tone. Emails you've
-- reviewed or replied to are linked but left alone.
create or replace function public.cf_link_client_emails()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.is_active then
    update cf_emails e set
      client_id       = new.id,
      triage_status   = case when e.triage_status = 'triaged' then 'pending' else e.triage_status end,
      triage_attempts = case when e.triage_status = 'triaged' then 0 else e.triage_attempts end
    where e.user_id = new.user_id
      and e.client_id is null
      and public.cf_sender_matches(e.sender_email, new.contact_email, new.domain_whitelist);
  end if;
  return new;
end;
$$;

drop trigger if exists cf_clients_link_emails on public.cf_clients;
create trigger cf_clients_link_emails after insert or update on public.cf_clients
  for each row execute function public.cf_link_client_emails();

revoke all on function public.cf_link_client_emails() from public, anon, authenticated;


-- ── 9. Sign-in codes sent through Resend (cf-signin-code) ─────
-- (Safe to re-run. ClarkFlow emails its own branded sign-in code instead of the
-- project-wide Supabase email, which other apps share.)
-- Codes are only ever sent to ClarkFlow members, at most once a minute per address.

create table if not exists public.cf_signin_throttle (
  email        text primary key,
  last_sent_at timestamptz not null
);
alter table public.cf_signin_throttle enable row level security;
revoke all on public.cf_signin_throttle from anon, authenticated;

-- 'send' (member, not in cooldown: the send is recorded), 'cooldown', or 'unknown'
-- (no member with that email: nothing is sent, and the caller isn't told).
create or replace function public.cf_start_signin(p_email text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not exists (
    select 1 from auth.users u join public.cf_members m on m.user_id = u.id
     where lower(u.email) = v_email
  ) then
    return 'unknown';
  end if;

  insert into cf_signin_throttle as t (email, last_sent_at) values (v_email, now())
  on conflict (email) do update set last_sent_at = now()
  where t.last_sent_at < now() - interval '60 seconds';
  if not found then return 'cooldown'; end if;

  return 'send';
end;
$$;

revoke all on function public.cf_start_signin(text) from public, anon, authenticated;
grant execute on function public.cf_start_signin(text) to service_role;
