import { supabase } from '../../lib/supabase';
import { demoApi } from './bvDemo';
import { WEBHOOK_URL } from './bvData';

/* Supabase-backed API. Every call runs as the signed-in user, so RLS scopes rows to them.
   Demo mode exposes the same interface (bvDemo.js), so the UI never branches on it.

   Analysis flow (see BACKEND/BUHAYVA COPILOT/SETUP.md):
     1. createJob inserts a `pending` row with the raw description.
     2. analyzeJob posts { job_id, access_token } to the Make.com webhook. Make verifies the token
        with Supabase, pulls the resume + job through RLS, asks Gemini, and saves the result.
     3. Make's Webhook Response returns the finished row. If that reply is lost (timeout, CORS),
        we poll the row until Make has written it. */

const must = ({ data, error }) => { if (error) throw error; return data; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const WEBHOOK_TIMEOUT = 150_000;
const POLL_EVERY = 3_000;
const POLL_FOR = 60_000;

async function getJob(id) {
  return must(await supabase.from('bv_job_applications').select('*').eq('id', id).single());
}

async function markFailed(id, message) {
  return must(await supabase.from('bv_job_applications')
    .update({ analysis_state: 'failed', analysis_error: message }).eq('id', id).select().single());
}

const liveApi = {
  async isMember() {
    return must(await supabase.rpc('bv_is_member')) === true;
  },

  async getProfile() {
    return must(await supabase.from('bv_user_profile').select('*').maybeSingle());
  },

  async saveProfile(fields) {
    const { data: { user } } = await supabase.auth.getUser();
    return must(await supabase.from('bv_user_profile')
      .upsert({ ...fields, user_id: user.id }, { onConflict: 'user_id' }).select().single());
  },

  async listJobs() {
    return must(await supabase.from('bv_job_applications').select('*').order('created_at', { ascending: false }));
  },

  async createJob(fields) {
    return must(await supabase.from('bv_job_applications').insert(fields).select().single());
  },

  async analyzeJob(job) {
    if (!WEBHOOK_URL) return markFailed(job.id, 'Make.com webhook URL is not configured (VITE_BV_MAKE_WEBHOOK_URL).');

    if (job.analysis_state !== 'pending') {
      must(await supabase.from('bv_job_applications')
        .update({ analysis_state: 'pending', analysis_error: null }).eq('id', job.id));
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Your session expired. Sign in again.');

    /* Form encoding keeps this a CORS "simple request" (no preflight), which Make webhooks accept. */
    const body = new URLSearchParams({ job_id: job.id, access_token: session.access_token });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WEBHOOK_TIMEOUT);
    try {
      const res = await fetch(WEBHOOK_URL, { method: 'POST', body, signal: ctrl.signal });
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try { msg = JSON.parse(text).error || text; } catch { /* plain text */ }
        if (res.status === 410 || /no scenario listening/i.test(text)) msg = 'The Make.com scenario is switched off.';
        return markFailed(job.id, `Make.com returned ${res.status}: ${String(msg).slice(0, 200)}`);
      }
      try {
        const row = JSON.parse(text);
        if (row?.id === job.id && row.analysis_state !== 'pending') return row;
      } catch { /* "Accepted" or other non-JSON reply: fall through to polling */ }
    } catch {
      /* Network error, timeout, or an unreadable (CORS) reply. Make may still have done the work. */
    } finally {
      clearTimeout(timer);
    }

    for (let waited = 0; waited < POLL_FOR; waited += POLL_EVERY) {
      const row = await getJob(job.id);
      if (row.analysis_state !== 'pending') return row;
      await sleep(POLL_EVERY);
    }
    return markFailed(job.id, 'Timed out waiting for Make.com. Check the scenario history in Make, then retry.');
  },

  async updateJob(id, patch) {
    return must(await supabase.from('bv_job_applications').update(patch).eq('id', id).select().single());
  },

  async deleteJob(id) {
    must(await supabase.from('bv_job_applications').delete().eq('id', id));
  },
};

export const isLiveAvailable = !!supabase;
export const getApi = (mode) => (mode === 'demo' ? demoApi : liveApi);
