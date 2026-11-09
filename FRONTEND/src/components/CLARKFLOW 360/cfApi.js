import { supabase } from '../../lib/supabase';

/* ClarkFlow 360 talks to Supabase as the signed-in user, so RLS (BACKEND/CLARKFLOW 360/schema.sql)
   scopes everything to them. Gmail tokens never reach the browser: the edge functions in
   BACKEND/CLARKFLOW 360/supabase/functions hold them, encrypted.

   Sync & triage: cf-gmail-sync pulls new unread mail in batches, then cf-triage-analyze
   has Gemini set priority, summary and a draft in batches. syncAndTriage() loops both.
   Reply: the browser edits drafts / statuses directly (RLS + column grants allow only
   those fields); sending goes through cf-gmail-send.

   Connect Gmail:
     1. connectGmail() asks cf-google-auth for a Google consent URL (one-time state + PKCE).
     2. The browser goes to Google, then Google redirects to cf-google-callback.
     3. The callback saves the encrypted tokens and sends the browser back to
        /clarkflow?gmail=connected  (or ?gmail=error&reason=…). */

export const APP_PATH = '/clarkflow';
const must = ({ data, error }) => { if (error) throw error; return data; };

/* functions.invoke hides the JSON error body on non-2xx; dig it out for a useful message.
   err.code === 'gmail_not_connected' means the Gmail connection is gone: show Connect again. */
async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    let code;
    try { const res = await error.context.json(); msg = res.error || msg; code = res.code; } catch { /* keep default */ }
    if (/failed to send|not found/i.test(msg)) msg = `ClarkFlow’s ${name} function isn’t deployed yet.`;
    throw Object.assign(new Error(msg), { code });
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const EMAIL_COLUMNS = 'id, client_id, sender_name, sender_email, subject, snippet, received_at, triage_status, '
  + 'priority_level, ai_summary, ai_generated_draft, triage_error, triage_attempts';
const SYNC_ROUNDS = 4;      // × 25 new emails per round
const TRIAGE_ROUNDS = 20;   // × 6 emails per round
/* Gemini's free tier allows only a few requests a minute. On "slow down", wait as long
   as Google asks (usually under a minute) and carry on, up to RATE_LIMIT_PAUSES times.
   A longer wait means a daily cap: stop and say when it resets. */
const RATE_LIMIT_WAIT_S = 40;
const RATE_LIMIT_PAUSES = 6;
const LONGEST_WAIT_S = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const isConfigured = !!supabase;

export const api = {
  /* Email sign-in code. shouldCreateUser:false keeps strangers from creating accounts on this
     shared Supabase project; ClarkFlow access is further gated by cf_members. */
  async sendSignInCode(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${APP_PATH}` },
    });
    if (error && !/signups not allowed|user not found/i.test(error.message)) throw error;
  },
  async verifySignInCode(email, token) {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw new Error('That code is invalid or has expired. Check it and try again.');
  },
  signOut: () => supabase.auth.signOut(),

  isMember: async () => must(await supabase.rpc('cf_is_member')) === true,

  /* null when Gmail isn't connected: { google_email, scopes, connected_at, updated_at } otherwise. */
  gmailStatus: async () => must(await supabase.rpc('cf_gmail_status')),

  /* Leaves the page: Google's consent screen, then back to /clarkflow. */
  async connectGmail() {
    const { url } = await invoke('cf-google-auth', {});
    window.location.assign(url);
  },

  /* Revokes ClarkFlow's Google access and deletes the stored tokens. Synced emails stay.
     → { revoked }: false means Google couldn't confirm; remove access in the Google Account. */
  disconnectGmail: () => invoke('cf-gmail-disconnect', {}),

  /* Newest 200 emails, without bodies (the queue doesn't need them). */
  listEmails: async () => must(await supabase.from('cf_emails').select(EMAIL_COLUMNS)
    .order('received_at', { ascending: false }).limit(200)),

  /* One email with its bodies, for the reading pane. */
  getEmail: async (id) => must(await supabase.from('cf_emails').select('*').eq('id', id).single()),

  /* Every synced email in the same Gmail thread, oldest first. */
  getThread: async (threadId) => must(await supabase.from('cf_emails').select(`${EMAIL_COLUMNS}, gmail_thread_id, replied_at`)
    .eq('gmail_thread_id', threadId).order('received_at')),

  /* Saving your own draft counts as reviewing the email, and stops a pending triage
     from overwriting it (triage only writes to 'pending' emails). */
  async saveDraft(email, text) {
    const patch = { ai_generated_draft: text };
    if (email.triage_status === 'pending' || email.triage_status === 'triaged') patch.triage_status = 'reviewed';
    return must(await supabase.from('cf_emails').update(patch).eq('id', email.id).select(EMAIL_COLUMNS).single());
  },

  /* 'reviewed' | 'archived' | 'triaged' (back to the inbox). Sending sets 'replied' server-side. */
  setStatus: async (id, status) => must(await supabase.from('cf_emails').update({ triage_status: status })
    .eq('id', id).select(EMAIL_COLUMNS).single()),

  setPriority: async (id, priority) => must(await supabase.from('cf_emails').update({ priority_level: priority })
    .eq('id', id).select(EMAIL_COLUMNS).single()),

  /* Sends from the connected Gmail, in the original thread. Throws with err.code
     'already_replied' or 'gmail_not_connected' when relevant. */
  sendReply: (emailId, body) => invoke('cf-gmail-send', { email_id: emailId, body }),

  listClients: async () => must(await supabase.from('cf_clients').select('*').order('company_name')),

  /* Insert when there's no id. Saving also links earlier emails from this client (DB trigger). */
  async saveClient({ id, company_name, contact_email, domain_whitelist, custom_context, is_active }) {
    const row = {
      company_name: company_name.trim(),
      contact_email: contact_email.trim() || null,
      domain_whitelist,
      custom_context: custom_context.trim() || null,
      is_active,
    };
    let query;
    if (id) {
      query = supabase.from('cf_clients').update(row).eq('id', id);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      query = supabase.from('cf_clients').insert({ ...row, user_id: session.user.id });
    }
    const { data, error } = await query.select().single();
    if (error) {
      if (error.code === '23505') throw new Error('Another client already uses that contact email.');
      if (error.code === '23514') throw new Error('Check the company name and contact email.');
      throw error;
    }
    return data;
  },

  deleteClient: async (id) => must(await supabase.from('cf_clients').delete().eq('id', id)),

  /* Sync (Gmail → cf_emails) then triage (Gemini), each in small server-side batches.
     onProgress({ stage: 'sync' | 'triage' | 'waiting', added, triaged, remaining, seconds })
     after every batch, and every second while waiting out a rate limit.
     retryFailed: give emails that used up their triage tries a fresh start first. */
  async syncAndTriage(onProgress = () => {}, { retryFailed = false } = {}) {
    let added = 0, matched = 0;
    for (let i = 0; i < SYNC_ROUNDS; i++) {
      const res = await invoke('cf-gmail-sync', {});
      added += res.added;
      matched += res.matched;
      onProgress({ stage: 'sync', added });
      if (!res.more) break;
    }

    let triaged = 0, failed = 0, remaining = 0, rateLimited = false, pauses = 0, retryAfterSec = 0;
    for (let i = 0; i < TRIAGE_ROUNDS; i++) {
      const res = await invoke('cf-triage-analyze', i === 0 && retryFailed ? { retry_failed: true } : {});
      triaged += res.triaged;
      failed += res.failed;
      remaining = res.remaining;
      rateLimited = res.rate_limited;
      onProgress({ stage: 'triage', added, triaged, remaining });
      retryAfterSec = rateLimited ? res.retry_after_s ?? 0 : 0;
      if (rateLimited && remaining > 0 && pauses < RATE_LIMIT_PAUSES && retryAfterSec <= LONGEST_WAIT_S) {
        pauses += 1;
        for (let s = Math.max(RATE_LIMIT_WAIT_S, Math.ceil(retryAfterSec)); s > 0; s--) {
          onProgress({ stage: 'waiting', added, triaged, remaining, seconds: s });
          await sleep(1000);
        }
        continue;
      }
      /* A batch with no successes means something is wrong right now: stop instead of
         burning every email's tries. */
      if (rateLimited || remaining === 0 || res.triaged === 0) break;
    }
    return { added, matched, triaged, failed, remaining, rateLimited, retryAfterSec };
  },
};

/* What cf-google-callback's ?gmail=error&reason=… means, in plain words. */
export const CONNECT_ERRORS = {
  access_denied: 'You cancelled on Google’s screen, so Gmail wasn’t connected.',
  missing_scopes: 'ClarkFlow needs both permissions: reading and sending email. Connect again and leave both boxes ticked.',
  invalid_state: 'That connection attempt expired or was already used. Click Connect Gmail to start again.',
  no_refresh_token: 'Google didn’t grant offline access. Remove ClarkFlow at myaccount.google.com/permissions, then connect again.',
  exchange_failed: 'Google didn’t accept the connection. Try again.',
  profile_failed: 'Connected, but Gmail didn’t say which mailbox it was. Try again.',
  google_error: 'Google returned an error. Try again.',
  server_error: 'Something went wrong saving the connection. Try again.',
};
