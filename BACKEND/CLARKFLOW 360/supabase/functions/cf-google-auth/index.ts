// ClarkFlow 360 — step 1 of "Connect Gmail".
//
// Called by the signed-in browser (POST, Supabase JWT). Creates a one-time CSRF `state`
// and a PKCE verifier, stores them in cf_oauth_states (state is stored hashed, expires in
// 10 minutes), and returns the Google consent URL. The browser then navigates there.
//
// Deploy: see ../../config.toml (verify_jwt = true)
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI

import { corsHeaders, json } from '../_shared/http.ts';
import { adminClient, requireMember } from '../_shared/auth.ts';
import { buildConsentUrl, pkceChallenge, randomUrlSafe, sha256Hex } from '../_shared/google.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = await requireMember(req);
  if ('response' in auth) return auth.response;

  try {
    const state = randomUrlSafe(32);
    const codeVerifier = randomUrlSafe(32);   // 43 chars, within PKCE's 43–128
    const consentUrl = buildConsentUrl(state, await pkceChallenge(codeVerifier));

    const admin = adminClient();
    // Housekeeping: abandoned attempts (closed tab, never came back).
    await admin.from('cf_oauth_states').delete().lt('expires_at', new Date().toISOString());

    const { error } = await admin.from('cf_oauth_states').insert({
      state_hash: await sha256Hex(state),
      user_id: auth.userId,
      code_verifier: codeVerifier,
    });
    if (error) throw new Error(`Could not save the sign-in attempt: ${error.message}`);

    return json({ url: consentUrl });
  } catch (err) {
    // Members only reach this point, so the reason (e.g. a missing secret) is safe to show.
    console.error('cf-google-auth failed', err);
    return json({ error: err instanceof Error ? err.message : 'Could not start the Gmail connection.' }, 500);
  }
});
