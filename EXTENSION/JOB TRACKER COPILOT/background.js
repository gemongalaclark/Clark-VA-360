/* Clark VA 360 Copilot — background service worker. The only place that talks to the network:
   Job Tracker RPCs (PostgREST) and the jt-copilot Edge Function, with the public anon key and the
   user's Job Tracker session token. Content scripts and the popup ask it through messages:
     signIn, signOut, status, saveJob, getJob, write, log, unlog
   Every reply is { ok: true, ... } or { ok: false, code, error, retryAfterSec? }. */
importScripts('config.js', 'lib.js');

const { SUPABASE_URL, SUPABASE_ANON_KEY } = self.JTC_CONFIG;

class CallError extends Error {
  constructor(code, message, retryAfterSec) {
    super(message);
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

const clearSession = () => chrome.storage.local.remove(['jtc_token', 'jtc_user']);
const getSession = () => chrome.storage.local.get(['jtc_token', 'jtc_user']);

async function post(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CallError('error', 'Couldn’t reach the Job Tracker. Check your internet connection.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = JTC.errorCode(res.status, data);
    if (code === 'signed_out') await clearSession();
    throw new CallError(code, data?.error || data?.message || 'Something went wrong. Try again.', data?.retry_after_sec);
  }
  return data;
}

const rpc = (fn, params) => post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, params);

async function token() {
  const { jtc_token } = await getSession();
  if (!jtc_token) throw new CallError('signed_out', 'Sign in to the Copilot first (click the extension icon).');
  return jtc_token;
}

const handlers = {
  async signIn({ username, password }) {
    const r = await rpc('jt_sign_in', { p_username: username, p_password: password });
    await chrome.storage.local.set({ jtc_token: r.token, jtc_user: r.username });
    return { username: r.username };
  },

  async signOut() {
    const { jtc_token } = await getSession();
    await clearSession();
    if (jtc_token) await rpc('jt_sign_out', { p_token: jtc_token }).catch(() => {});
    return {};
  },

  async status() {
    const { jtc_token, jtc_user } = await getSession();
    if (!jtc_token) return { signedIn: false };
    const s = await rpc('jt_copilot_load', { p_token: jtc_token });
    return { signedIn: true, username: jtc_user, used_today: s.used_today, daily_cap: s.daily_cap };
  },

  /* The job post's text, kept for this browser session so the apply page can use it. */
  async saveJob({ job }) {
    if (job?.id) await chrome.storage.session.set({ [`job:${job.id}`]: job });
    return {};
  },

  async getJob({ id }) {
    const key = `job:${id}`;
    const stored = await chrome.storage.session.get(key);
    return { job: stored[key] ?? null };
  },

  async write({ job }) {
    const result = await post(`${SUPABASE_URL}/functions/v1/jt-copilot`, { token: await token(), mode: 'olj', job });
    return { result };
  },

  /* Logs the application once per job link (Review Focus 1). */
  async log({ title, url, source }) {
    const t = await token();
    const existing = await rpc('jt_find_application', { p_token: t, p_url: url });
    if (existing) return { id: existing, duplicate: true };
    const row = await rpc('jt_save_application', {
      p_token: t,
      p_job: { title: String(title || 'Job application').trim().slice(0, 120), url, applied_on: JTC.manilaToday(), source },
    });
    return { id: row.id, duplicate: false };
  },

  async unlog({ id }) {
    await rpc('jt_delete_application', { p_token: await token(), p_id: id });
    return {};
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  const handler = handlers[msg?.type];
  if (!handler) return false;
  handler(msg).then(
    (r) => reply({ ok: true, ...r }),
    (err) => reply({ ok: false, code: err.code || 'error', error: err.message, retryAfterSec: err.retryAfterSec }),
  );
  return true;   // the reply comes later
});
