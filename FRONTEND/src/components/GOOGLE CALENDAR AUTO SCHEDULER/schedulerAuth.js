import { supabase } from '../../lib/supabase';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_STORAGE_KEY = 'clark_google_cal_token';

export function cacheCalendarToken(token) {
  if (!token) return;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore quota / private mode
  }
}

export function readCachedCalendarToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearCachedCalendarToken() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function mapSessionToSchedulerUser(session) {
  if (!session?.user) return null;
  const meta = session.user.user_metadata || {};
  if (session.provider_token) cacheCalendarToken(session.provider_token);
  return {
    id: session.user.id,
    name: meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Google User',
    email: session.user.email,
    picture: meta.avatar_url || meta.picture || null,
    accessToken: session.provider_token || readCachedCalendarToken() || null,
    isDemo: false,
    provider: session.user.app_metadata?.provider || 'google'
  };
}

/**
 * Upsert the signed-in Google user into public.scheduler_users.
 * Trigger in supabase_schema.sql also auto-inserts on first auth.users row.
 */
export async function registerSchedulerUser(session) {
  if (!supabase || !session?.user) return { error: null };

  const meta = session.user.user_metadata || {};
  const row = {
    id: session.user.id,
    email: session.user.email,
    full_name: meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Google User',
    avatar_url: meta.avatar_url || meta.picture || null,
    provider: session.user.app_metadata?.provider || 'google',
    last_sign_in_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('scheduler_users')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('Failed to register scheduler user in Supabase:', error);
  }

  return { error };
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const redirectTo = `${window.location.origin}/auto-scheduler`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: `openid email profile ${CALENDAR_SCOPE}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true'
      }
    }
  });

  if (error) throw error;
}

export async function signOutScheduler() {
  clearCachedCalendarToken();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
