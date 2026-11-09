// ClarkFlow 360 — application-layer encryption for Gmail OAuth tokens.
//
// Every access/refresh token is sealed with AES-256-GCM before it is written to
// public.cf_oauth_tokens, so a database dump or leaked service key alone never
// exposes a usable Google token. Each value is stored as three base64 columns:
//   encrypted_<x>_token   ciphertext
//   <x>_token_iv          12-byte random nonce (new for every encryption)
//   <x>_token_tag         16-byte GCM authentication tag
//
// `context` is bound to the ciphertext as GCM additional authenticated data (AAD).
// Use tokenContext(userId, kind): a token copied onto another user's row, or an
// access token swapped into the refresh-token columns, then fails to decrypt
// instead of silently working.
//
// Uses Web Crypto (built into Supabase Edge / Deno), so nothing extra is installed.
// Shared code: deploy the functions with the Supabase CLI so _shared/ is bundled.
//
// Secret: TOKEN_ENCRYPTION_KEY = 32 random bytes, base64-encoded. Generate one with
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// and set it with  supabase secrets set TOKEN_ENCRYPTION_KEY=...
// Changing it makes every stored token unreadable (users just reconnect Gmail).

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type TokenKind = 'access_token' | 'refresh_token';

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
  tag: string;
}

export const tokenContext = (userId: string, kind: TokenKind) => `clarkflow:${userId}:${kind}`;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string, label: string) {
  try {
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  } catch {
    throw new Error(`${label} is not valid base64.`);
  }
}

// Imported once per edge-function instance.
let keyPromise: Promise<CryptoKey> | undefined;

function getKey(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const raw = Deno.env.get('TOKEN_ENCRYPTION_KEY')?.trim();
    if (!raw) throw new Error('Missing TOKEN_ENCRYPTION_KEY secret.');
    const bytes = fromBase64(raw, 'TOKEN_ENCRYPTION_KEY');
    if (bytes.length !== KEY_BYTES) {
      throw new Error(`TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${bytes.length}).`);
    }
    return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  })();
  return keyPromise;
}

export async function encryptToken(plaintext: string, context: string): Promise<EncryptedValue> {
  if (!plaintext) throw new Error('Refusing to encrypt an empty token.');
  if (!context) throw new Error('An encryption context is required.');

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(context), tagLength: TAG_BYTES * 8 },
      await getKey(),
      encoder.encode(plaintext),
    ),
  );

  // Web Crypto appends the tag to the ciphertext; split it out for the _tag column.
  return {
    ciphertext: toBase64(sealed.subarray(0, sealed.length - TAG_BYTES)),
    iv: toBase64(iv),
    tag: toBase64(sealed.subarray(sealed.length - TAG_BYTES)),
  };
}

export async function decryptToken(value: EncryptedValue, context: string): Promise<string> {
  if (!context) throw new Error('An encryption context is required.');

  const ciphertext = fromBase64(value.ciphertext, 'ciphertext');
  const iv = fromBase64(value.iv, 'iv');
  const tag = fromBase64(value.tag, 'tag');
  // A shortened tag would weaken GCM's integrity check, so only full-length values are accepted.
  if (iv.length !== IV_BYTES) throw new Error(`iv must be ${IV_BYTES} bytes.`);
  if (tag.length !== TAG_BYTES) throw new Error(`tag must be ${TAG_BYTES} bytes.`);

  const sealed = new Uint8Array(ciphertext.length + TAG_BYTES);
  sealed.set(ciphertext);
  sealed.set(tag, ciphertext.length);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(context), tagLength: TAG_BYTES * 8 },
      await getKey(),
      sealed,
    );
    return decoder.decode(plain);
  } catch {
    // Wrong key, wrong context, or the stored value was altered. Never echo token data.
    throw new Error('Could not decrypt the stored Gmail token. Reconnect Gmail.');
  }
}
