// ClarkFlow 360 — Gmail access with automatic token refresh.
//
// getValidGmailClient(userId) is the only way the sync/triage/send functions reach Gmail.
// It decrypts the stored tokens, refreshes the access token when it expires within
// 5 minutes, saves the new (encrypted) token, and returns a fetch bound to the mailbox.
// If Google rejects the refresh token (revoked in Google settings, or the user changed
// their password) the stored connection is deleted and GmailNotConnectedError is
// thrown. Callers should answer 409 { code: 'gmail_not_connected' } so the UI asks
// the user to reconnect.

import { adminClient } from './auth.ts';
import { decryptToken, encryptToken, tokenContext } from './crypto.ts';
import { GoogleOAuthError, refreshAccessToken } from './google.ts';

const REFRESH_BUFFER_MS = 5 * 60_000;
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/';

export class GmailNotConnectedError extends Error {}

export interface GmailClient {
  googleEmail: string;
  /** fetch() against https://gmail.googleapis.com/gmail/v1/users/me/<path> with the Bearer token set. */
  fetch(path: string, init?: RequestInit): Promise<Response>;
}

// ── Column helpers (shared with cf-google-callback) ───────────
export async function sealAccessToken(userId: string, token: string) {
  const e = await encryptToken(token, tokenContext(userId, 'access_token'));
  return { encrypted_access_token: e.ciphertext, access_token_iv: e.iv, access_token_tag: e.tag };
}

export async function sealRefreshToken(userId: string, token: string) {
  const e = await encryptToken(token, tokenContext(userId, 'refresh_token'));
  return { encrypted_refresh_token: e.ciphertext, refresh_token_iv: e.iv, refresh_token_tag: e.tag };
}

export const expiryFrom = (expiresInSeconds: number) =>
  new Date(Date.now() + expiresInSeconds * 1000).toISOString();

// ── The client ────────────────────────────────────────────────
export async function getValidGmailClient(userId: string): Promise<GmailClient> {
  const admin = adminClient();
  const { data: row, error } = await admin
    .from('cf_oauth_tokens').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Could not load the Gmail connection: ${error.message}`);
  if (!row) throw new GmailNotConnectedError('Gmail is not connected.');

  let accessToken: string;
  try {
    if (new Date(row.token_expiry).getTime() - Date.now() > REFRESH_BUFFER_MS) {
      accessToken = await decryptToken(
        { ciphertext: row.encrypted_access_token, iv: row.access_token_iv, tag: row.access_token_tag },
        tokenContext(userId, 'access_token'),
      );
    } else {
      accessToken = await refresh(admin, userId, row);
    }
  } catch (err) {
    if (err instanceof GmailNotConnectedError) throw err;
    // Unreadable stored token (e.g. TOKEN_ENCRYPTION_KEY changed): only a reconnect fixes it.
    if (err instanceof Error && err.message.startsWith('Could not decrypt')) {
      throw new GmailNotConnectedError(err.message);
    }
    throw err;
  }

  return {
    googleEmail: row.google_email,
    fetch: (path, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      return fetch(GMAIL_API + path.replace(/^\//, ''), { ...init, headers });
    },
  };
}

// deno-lint-ignore no-explicit-any
async function refresh(admin: any, userId: string, row: any): Promise<string> {
  const refreshToken = await decryptToken(
    { ciphertext: row.encrypted_refresh_token, iv: row.refresh_token_iv, tag: row.refresh_token_tag },
    tokenContext(userId, 'refresh_token'),
  );

  let fresh;
  try {
    fresh = await refreshAccessToken(refreshToken);
  } catch (err) {
    if (err instanceof GoogleOAuthError && err.code === 'invalid_grant') {
      await admin.from('cf_oauth_tokens').delete().eq('user_id', userId);
      throw new GmailNotConnectedError('Gmail access was revoked or has expired. Reconnect Gmail.');
    }
    throw err;
  }

  const update = {
    ...(await sealAccessToken(userId, fresh.access_token)),
    // Google rarely rotates refresh tokens, but keep the new one if it does.
    ...(fresh.refresh_token ? await sealRefreshToken(userId, fresh.refresh_token) : {}),
    token_expiry: expiryFrom(fresh.expires_in),
    ...(fresh.scope ? { scopes: fresh.scope.split(/\s+/) } : {}),
  };
  const { error } = await admin.from('cf_oauth_tokens').update(update).eq('user_id', userId);
  // The new token still works for this request; the next call simply refreshes again.
  if (error) console.error('Saving refreshed Gmail token failed', error);

  return fresh.access_token;
}
