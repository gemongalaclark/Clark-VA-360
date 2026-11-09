import { supabase } from '../../lib/supabase';

/* ClarkFlow 360 talks to Supabase as the signed-in user, so RLS (BACKEND/CLARKFLOW 360/schema.sql)
   scopes everything to them. Gmail tokens never reach the browser: the edge functions in
   BACKEND/CLARKFLOW 360/supabase/functions hold them, encrypted.

   Connect Gmail:
     1. connectGmail() asks cf-google-auth for a Google consent URL (one-time state + PKCE).
     2. The browser goes to Google, then Google redirects to cf-google-callback.
     3. The callback saves the encrypted tokens and sends the browser back to
        /clarkflow?gmail=connected  (or ?gmail=error&reason=…). */

export const APP_PATH = '/clarkflow';
const must = ({ data, error }) => { if (error) throw error; return data; };

/* functions.invoke hides the JSON error body on non-2xx; dig it out for a useful message. */
async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
    if (/failed to send|not found/i.test(msg)) msg = `ClarkFlow’s ${name} function isn’t deployed yet.`;
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

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
