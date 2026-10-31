import { supabase } from '../../lib/supabase';

/* BALANSE talks to Supabase only through the bl_* RPCs (BACKEND/BALANSE/schema.sql).
   Accounts are username + password, so Supabase Auth isn't used: sign-in returns an
   opaque session token that we keep in localStorage and pass to every call. */

const TOKEN_KEY = 'balanse-session';

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } };

export class SessionExpiredError extends Error {}

async function rpc(fn, args) {
  if (!supabase) throw new Error('BALANSE can’t reach its database (Supabase is not configured).');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === '28000') { setToken(null); throw new SessionExpiredError(error.message); }
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) {
      throw new Error('BALANSE’s database isn’t set up yet. Run BACKEND/BALANSE/schema.sql in Supabase.');
    }
    throw new Error(error.message);
  }
  return data;
}

const authed = (fn, args = {}) => rpc(fn, { p_token: getToken(), ...args });

export const api = {
  async signUp(username, password) {
    const res = await rpc('bl_sign_up', { p_username: username, p_password: password });
    setToken(res.token);
    return res.username;
  },
  async signIn(username, password) {
    const res = await rpc('bl_sign_in', { p_username: username, p_password: password });
    setToken(res.token);
    return res.username;
  },
  async signOut() {
    const token = getToken();
    setToken(null);
    if (token) await rpc('bl_sign_out', { p_token: token }).catch(() => {});
  },
  async me() {
    return (await authed('bl_me'))?.username ?? null;
  },
  load: () => authed('bl_load'),
  saveDebt: (debt) => authed('bl_save_debt', { p_debt: debt }),
  deleteDebt: (id) => authed('bl_delete_debt', { p_id: id }),
  saveGoal: (goal) => authed('bl_save_goal', { p_goal: goal }),
  deleteGoal: (id) => authed('bl_delete_goal', { p_id: id }),
  saveSubscription: (sub) => authed('bl_save_subscription', { p_sub: sub }),
  deleteSubscription: (id) => authed('bl_delete_subscription', { p_id: id }),
};
