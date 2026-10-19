import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Add them in your .env or hosting environment variables.');
}

/* "Remember me": the session lives in localStorage (survives closing the browser) when remembered,
   otherwise in sessionStorage (ends with the tab/browser). Defaults to remembered. */
const REMEMBER_KEY = 'ts-auth-remember';
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

export const setRememberMe = (remember) => safe(() => localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0'));
export const getRememberMe = () => safe(() => localStorage.getItem(REMEMBER_KEY) !== '0', true);

const authStorage = {
  getItem: (k) => safe(() => localStorage.getItem(k)) ?? safe(() => sessionStorage.getItem(k)),
  setItem: (k, v) => {
    const [keep, drop] = getRememberMe() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    safe(() => keep.setItem(k, v));
    safe(() => drop.removeItem(k));
  },
  removeItem: (k) => { safe(() => localStorage.removeItem(k)); safe(() => sessionStorage.removeItem(k)); },
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storage: authStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

