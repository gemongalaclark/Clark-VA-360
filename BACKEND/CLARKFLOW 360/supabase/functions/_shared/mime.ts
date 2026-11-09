// ClarkFlow 360 — turn a Gmail API message (format=full) into a cf_emails row,
// and match its sender to a client.
//
// Gmail returns each MIME part's body as base64url bytes in the part's own charset.
// We keep the first non-attachment text/plain and text/html parts; when an email is
// HTML-only, body_text is derived from the HTML so Gemini always has plain text.

const MAX_TEXT = 50_000;
const MAX_HTML = 200_000;

export interface GmailHeader { name: string; value: string }
export interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
}
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
}

export interface ClientMatchInfo { id: string; contact_email: string | null; domain_whitelist: string[] }

// ── Decoding ──────────────────────────────────────────────────
const toBytes = (binary: string) => Uint8Array.from(binary, (c) => c.charCodeAt(0));

function decodeBytes(bytes: Uint8Array, charset = 'utf-8'): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);   // unknown charset label → UTF-8
  }
}

export function decodeBase64Url(data: string, charset?: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return decodeBytes(toBytes(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))), charset);
}

// RFC 2047 encoded words, e.g. "=?UTF-8?B?w7Fh?=". Left as-is if malformed.
export function decodeMimeWords(value: string): string {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=(\s+(?==\?))?/g, (whole, charset, enc, text) => {
    try {
      const binary = enc.toUpperCase() === 'B'
        ? atob(text)
        : text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)));
      return decodeBytes(toBytes(binary), charset);
    } catch {
      return whole;
    }
  });
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (m, n) => { const c = Number(n); return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m; })
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => { const c = parseInt(h, 16); return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m; })
    .replace(/&amp;/gi, '&');   // last, so "&amp;lt;" stays "&lt;"
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(style|script|head|title)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Headers & addresses ───────────────────────────────────────
export const header = (part: GmailPart | undefined, name: string) =>
  part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;

export function parseAddress(raw: string): { name: string | null; email: string } {
  const value = decodeMimeWords(raw).trim();
  const angled = value.match(/^(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/);
  if (angled) {
    const name = angled[1].trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"').trim();
    return { name: name || null, email: angled[2].toLowerCase() };
  }
  const bare = value.match(/[^\s<>"]+@[^\s<>"]+/);
  return { name: null, email: (bare?.[0] ?? value).toLowerCase() };
}

// ── Bodies ────────────────────────────────────────────────────
function collectBodies(part: GmailPart, out: { text?: string; html?: string }) {
  const type = (part.mimeType ?? '').toLowerCase();
  const isAttachment = !!part.filename || /^\s*attachment/i.test(header(part, 'Content-Disposition') ?? '');
  if (!isAttachment && part.body?.data) {
    const charset = header(part, 'Content-Type')?.match(/charset="?([^";\s]+)/i)?.[1];
    if (type === 'text/plain' && out.text === undefined) out.text = decodeBase64Url(part.body.data, charset);
    else if (type === 'text/html' && out.html === undefined) out.html = decodeBase64Url(part.body.data, charset);
  }
  for (const child of part.parts ?? []) collectBodies(child, out);
}

export function toEmailRow(msg: GmailMessage) {
  const payload = msg.payload ?? {};
  const from = parseAddress(header(payload, 'From') ?? '');
  const bodies: { text?: string; html?: string } = {};
  collectBodies(payload, bodies);
  const text = (bodies.text ?? (bodies.html ? htmlToText(bodies.html) : '')).trim();
  const subject = decodeMimeWords(header(payload, 'Subject') ?? '').trim();

  return {
    gmail_message_id: msg.id,
    gmail_thread_id: msg.threadId,
    message_id_header: header(payload, 'Message-ID'),
    references_header: header(payload, 'References'),
    sender_name: from.name,
    sender_email: from.email || '(unknown sender)',
    subject: subject || null,
    snippet: msg.snippet ? decodeEntities(msg.snippet) : null,
    body_text: text ? text.slice(0, MAX_TEXT) : null,
    body_html: bodies.html ? bodies.html.slice(0, MAX_HTML) : null,
    received_at: new Date(Number(msg.internalDate) || Date.now()).toISOString(),
  };
}

// ── Building a reply (RFC 2822 / 2047) ───────────────────────
const utf8 = new TextEncoder();

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// Header values can never contain line breaks (header injection).
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

// Non-ASCII text → RFC 2047 encoded words of ≤ 45 bytes each (≤ 75 chars once encoded),
// folded onto continuation lines.
export function encodeHeaderText(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const words: string[] = [];
  let chunk = '';
  for (const ch of text) {
    if (utf8.encode(chunk + ch).length > 45) { words.push(chunk); chunk = ''; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${base64(utf8.encode(w))}?=`).join('\r\n ');
}

export function formatAddress(name: string | null, email: string): string {
  const n = oneLine(name ?? '');
  if (!n) return email;
  if (/^[\x20-\x7e]*$/.test(n)) return `"${n.replace(/["\\]/g, '\\$&')}" <${email}>`;
  return `${encodeHeaderText(n)} <${email}>`;
}

export const replySubject = (subject: string | null) => {
  const s = oneLine(subject ?? '');
  return /^re:/i.test(s) ? s : `Re: ${s}`.trim();
};

export interface ReplyInput {
  from: string;                    // the connected mailbox
  to: { name: string | null; email: string };
  subject: string | null;          // original subject
  inReplyTo: string | null;        // original Message-ID
  references: string | null;       // original References
  body: string;                    // plain text
}

// Returns the full message as base64url, ready for users.messages.send { raw }.
export function buildReply(input: ReplyInput): string {
  const ids = [...(input.references ?? '').split(/\s+/), input.inReplyTo ?? '']
    .map(oneLine).filter((id) => /^<[^<>\s]+>$/.test(id));
  const references = [...new Set(ids)];

  const headers = [
    `From: ${oneLine(input.from)}`,
    `To: ${formatAddress(input.to.name, oneLine(input.to.email))}`,
    `Subject: ${encodeHeaderText(replySubject(input.subject))}`,
    ...(input.inReplyTo && /^<[^<>\s]+>$/.test(oneLine(input.inReplyTo)) ? [`In-Reply-To: ${oneLine(input.inReplyTo)}`] : []),
    ...(references.length ? [`References: ${references.join('\r\n ')}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ];
  const body = base64(utf8.encode(input.body.replace(/\r?\n/g, '\r\n'))).replace(/.{76}/g, '$&\r\n');
  const message = `${headers.join('\r\n')}\r\n\r\n${body}`;
  return base64(utf8.encode(message)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Client matching (same rule as public.cf_sender_matches in schema.sql) ──
// Exact contact email wins; otherwise the most specific matching domain
// (mail.acme.com matches "acme.com", and "mail.acme.com" beats "acme.com").
export function matchClient(senderEmail: string, clients: ClientMatchInfo[]): string | null {
  const exact = clients.find((c) => c.contact_email === senderEmail);
  if (exact) return exact.id;

  const domain = senderEmail.split('@')[1] ?? '';
  let best: { id: string; length: number } | null = null;
  for (const c of clients) {
    for (const d of c.domain_whitelist) {
      if ((domain === d || domain.endsWith('.' + d)) && (!best || d.length > best.length)) {
        best = { id: c.id, length: d.length };
      }
    }
  }
  return best?.id ?? null;
}
