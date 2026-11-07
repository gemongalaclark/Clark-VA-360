import { supabase } from '../../lib/supabase';

/* The Job Tracker talks to Supabase only through the jt_* RPCs (BACKEND/JOB TRACKER/schema.sql).
   Accounts are username + password, so Supabase Auth isn't used: sign-in returns an
   opaque session token that we keep in localStorage and pass to every call. */

const TOKEN_KEY = 'jobtracker-session';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };

export class SessionExpiredError extends Error {}

async function rpc(fn, args) {
  if (!supabase) throw new Error('The Job Tracker can’t reach its database (Supabase is not configured).');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === '28000') { setToken(null); throw new SessionExpiredError(error.message); }
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) {
      throw new Error('The Job Tracker’s database isn’t set up yet. Run BACKEND/JOB TRACKER/schema.sql in Supabase.');
    }
    throw new Error(error.message);
  }
  return data;
}

const authed = (fn, args = {}) => rpc(fn, { p_token: getToken(), ...args });

export const api = {
  async signUp(username, password) {
    const res = await rpc('jt_sign_up', { p_username: username, p_password: password });
    setToken(res.token);
    return res.username;
  },
  async signIn(username, password) {
    const res = await rpc('jt_sign_in', { p_username: username, p_password: password });
    setToken(res.token);
    return res.username;
  },
  async signOut() {
    const token = getToken();
    setToken(null);
    if (token) await rpc('jt_sign_out', { p_token: token }).catch(() => {});
  },
  async me() {
    return (await authed('jt_me'))?.username ?? null;
  },
  load: () => authed('jt_load'),
  saveApplication: (job) => authed('jt_save_application', { p_job: job }),
  deleteApplication: (id) => authed('jt_delete_application', { p_id: id }),
  saveBookmark: (job) => authed('jt_save_bookmark', { p_job: job }),
  deleteBookmark: (id) => authed('jt_delete_bookmark', { p_id: id }),
  /* mode: 'enable' | 'reset' | 'disable' → the share slug (null when off) */
  setShare: async (mode) => (await authed('jt_set_share', { p_mode: mode }))?.share_slug ?? null,
  /* Public, no sign-in: { username, applications: [{ title, url, applied_on }] } */
  showcase: (slug) => rpc('jt_public_showcase', { p_slug: slug }),
};

export const shareUrl = (slug) => `${window.location.origin}/job-tracker/s/${slug}`;
