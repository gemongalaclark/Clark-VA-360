// ClarkFlow 360 — Google OAuth 2.0 (authorization code + PKCE) for Gmail.
//
// Scopes are the minimum the app needs: read mail for sync/triage, send for replies.
// Both are requested together; the callback refuses a partial grant.
//
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
// (the redirect URI must exactly match one listed on the OAuth client in Google Cloud).

import { requireEnv } from './http.ts';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const TIMEOUT = 15_000;

export interface GoogleTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

// `code` is Google's error code, e.g. "invalid_grant" (refresh token revoked or expired).
export class GoogleOAuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// ── Random values & hashing (state, PKCE) ─────────────────────
const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const randomUrlSafe = (byteLength = 32) => base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));

const sha256 = async (text: string) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

export const sha256Hex = async (text: string) =>
  Array.from(await sha256(text), (b) => b.toString(16).padStart(2, '0')).join('');

export const pkceChallenge = async (verifier: string) => base64Url(await sha256(verifier));

// ── OAuth endpoints ───────────────────────────────────────────
export function buildConsentUrl(state: string, codeChallenge: string): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',            // issue a refresh_token
    prompt: 'consent',                 // ...every time, even on reconnect
    include_granted_scopes: 'true',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

async function tokenRequest(params: Record<string, string>): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      ...params,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new GoogleOAuthError(data.error ?? `http_${res.status}`, data.error_description ?? 'Google token request failed.');
  }
  return data as GoogleTokens;
}

export const exchangeCode = (code: string, codeVerifier: string) =>
  tokenRequest({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: requireEnv('GOOGLE_REDIRECT_URI'),
  });

export const refreshAccessToken = (refreshToken: string) =>
  tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });

// Best effort: a failed revoke must never block the user-facing flow. Returns whether
// Google confirmed it. (Revoking ends this app's whole grant for that Google account.)
export async function revokeToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) console.error('Google token revoke refused', res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error('Google token revoke failed', err);
    return false;
  }
}

export const missingScopes = (granted: string | undefined) => {
  const have = new Set((granted ?? '').split(/\s+/));
  return GMAIL_SCOPES.filter((s) => !have.has(s));
};
