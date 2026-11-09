// ClarkFlow 360 — "Disconnect Gmail".
//
// Revokes ClarkFlow's access at Google (so it disappears from the user's Google
// Account → Third-party connections), then deletes the stored encrypted tokens and
// any unfinished connect attempts. Emails already synced into ClarkFlow are kept.
// The local tokens are deleted even if Google can't be reached; { revoked: false }
// then tells the user to remove access in their Google Account themselves.
//
// Deploy: see ../../config.toml (verify_jwt = true)
// Secrets: TOKEN_ENCRYPTION_KEY

import { corsHeaders, json } from '../_shared/http.ts';
import { adminClient, requireMember } from '../_shared/auth.ts';
import { decryptToken, tokenContext } from '../_shared/crypto.ts';
import { revokeToken } from '../_shared/google.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = await requireMember(req);
  if ('response' in auth) return auth.response;
  const { userId } = auth;

  const admin = adminClient();
  const { data: row, error } = await admin.from('cf_oauth_tokens')
    .select('encrypted_refresh_token, refresh_token_iv, refresh_token_tag').eq('user_id', userId).maybeSingle();
  if (error) return json({ error: `Reading the Gmail connection failed: ${error.message}` }, 500);
  if (!row) return json({ disconnected: true, revoked: false, was_connected: false });

  let revoked = false;
  try {
    const refreshToken = await decryptToken(
      { ciphertext: row.encrypted_refresh_token, iv: row.refresh_token_iv, tag: row.refresh_token_tag },
      tokenContext(userId, 'refresh_token'),
    );
    revoked = await revokeToken(refreshToken);
  } catch (err) {
    console.error('Could not decrypt the token to revoke it', err);   // still delete below
  }

  const { error: delErr } = await admin.from('cf_oauth_tokens').delete().eq('user_id', userId);
  if (delErr) return json({ error: `Removing the Gmail connection failed: ${delErr.message}` }, 500);
  await admin.from('cf_oauth_states').delete().eq('user_id', userId);

  return json({ disconnected: true, revoked, was_connected: true });
});
