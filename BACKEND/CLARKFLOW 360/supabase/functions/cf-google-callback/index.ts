// ClarkFlow 360 — step 2 of "Connect Gmail": Google's redirect lands here.
//
// No Supabase session arrives with this request, so the one-time `state` is what ties it
// to the user who started the flow. The state row is deleted as it is read, so a state can
// never be used twice. Then: exchange the code (with the PKCE verifier), require BOTH Gmail
// scopes, look up which mailbox was connected, encrypt both tokens, and upsert
// cf_oauth_tokens. Always ends by redirecting back to the app:
//   <CLARKFLOW_APP_URL>?gmail=connected
//   <CLARKFLOW_APP_URL>?gmail=error&reason=<access_denied|missing_scopes|invalid_state|…>
//
// Deploy: see ../../config.toml (verify_jwt = false: Google can't send a Supabase JWT)
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
//          TOKEN_ENCRYPTION_KEY, CLARKFLOW_APP_URL

import { adminClient } from '../_shared/auth.ts';
import { exchangeCode, missingScopes, revokeToken, sha256Hex, type GoogleTokens } from '../_shared/google.ts';
import { expiryFrom, sealAccessToken, sealRefreshToken } from '../_shared/gmail.ts';

function backToApp(params: Record<string, string>): Response {
  const appUrl = Deno.env.get('CLARKFLOW_APP_URL');
  if (!appUrl) {
    return new Response('ClarkFlow is missing its CLARKFLOW_APP_URL secret.', { status: 500 });
  }
  const url = new URL(appUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 303, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
}

const fail = (reason: string) => backToApp({ gmail: 'error', reason });

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const params = new URL(req.url).searchParams;
  const state = params.get('state');
  const code = params.get('code');
  const googleError = params.get('error');

  if (!state) return fail('invalid_state');

  // 1. Consume the state (delete + return in one statement).
  const admin = adminClient();
  const { data: attempt, error: stateErr } = await admin
    .from('cf_oauth_states')
    .delete()
    .eq('state_hash', await sha256Hex(state))
    .select('user_id, code_verifier, expires_at')
    .maybeSingle();
  if (stateErr) {
    console.error('Reading OAuth state failed', stateErr);
    return fail('server_error');
  }
  if (!attempt || new Date(attempt.expires_at).getTime() < Date.now()) return fail('invalid_state');

  // 2. The user pressed Cancel / "Back to safety", or Google refused.
  if (googleError) return fail(googleError === 'access_denied' ? 'access_denied' : 'google_error');
  if (!code) return fail('google_error');

  const userId: string = attempt.user_id;

  // 3. Code → tokens.
  let tokens: GoogleTokens;
  try {
    tokens = await exchangeCode(code, attempt.code_verifier);
  } catch (err) {
    console.error('Code exchange failed', err);
    return fail('exchange_failed');
  }

  // 4. Granular consent lets users untick scopes. Without both, ClarkFlow can't work:
  //    give back what was granted and explain.
  if (missingScopes(tokens.scope).length > 0) {
    await revokeToken(tokens.refresh_token ?? tokens.access_token);
    return fail('missing_scopes');
  }
  // prompt=consent always yields one; guard anyway, since sync can't run without it.
  if (!tokens.refresh_token) return fail('no_refresh_token');

  // 5. Which mailbox was connected (gmail.readonly covers this; no extra profile scope).
  let googleEmail: string;
  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Gmail profile ${res.status}: ${await res.text()}`);
    googleEmail = String((await res.json()).emailAddress ?? '').toLowerCase();
    if (!googleEmail) throw new Error('Gmail profile had no emailAddress');
  } catch (err) {
    console.error('Gmail profile lookup failed', err);
    return fail('profile_failed');
  }

  // 6. Encrypt and save. Reconnecting replaces the previous connection.
  try {
    const { error } = await admin.from('cf_oauth_tokens').upsert({
      user_id: userId,
      google_email: googleEmail,
      ...(await sealAccessToken(userId, tokens.access_token)),
      ...(await sealRefreshToken(userId, tokens.refresh_token)),
      token_expiry: expiryFrom(tokens.expires_in),
      scopes: (tokens.scope ?? '').split(/\s+/).filter(Boolean),
    }, { onConflict: 'user_id' });
    if (error) throw error;
  } catch (err) {
    console.error('Saving Gmail tokens failed', err);
    return fail('server_error');
  }

  return backToApp({ gmail: 'connected' });
});
