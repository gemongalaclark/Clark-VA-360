// ClarkFlow 360 — send a reply from the connected Gmail, in the original thread.
//
// POST { email_id, body }. Builds an RFC 2822 reply (Re: subject, In-Reply-To,
// References, UTF-8 plain text), sends it with threadId so Gmail keeps the
// conversation together, and marks the email 'replied' with the text that was sent.
// Replies go to the original Reply-To address when the sender set one.
//
// Sending twice is impossible: replied_at is claimed atomically before sending and
// released again if Gmail refuses.
//
// Deploy: see ../../config.toml (verify_jwt = true)
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY (for token refresh)

import { corsHeaders, json } from '../_shared/http.ts';
import { adminClient, requireMember } from '../_shared/auth.ts';
import { getValidGmailClient, GmailNotConnectedError } from '../_shared/gmail.ts';
import { buildReply, header, parseAddress, type GmailMessage } from '../_shared/mime.ts';

const BODY_MAX = 20_000;
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = await requireMember(req);
  if ('response' in auth) return auth.response;
  const { userId } = auth;

  let payload: { email_id?: string; body?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const body = (payload.body ?? '').trim();
  if (!payload.email_id) return json({ error: 'Missing email_id' }, 400);
  if (!body) return json({ error: 'Write a reply first.' }, 400);
  if (body.length > BODY_MAX) return json({ error: `Replies are limited to ${BODY_MAX.toLocaleString()} characters.` }, 400);

  const admin = adminClient();
  const { data: email, error: readErr } = await admin.from('cf_emails')
    .select('id, gmail_message_id, gmail_thread_id, message_id_header, references_header, sender_name, sender_email, subject, replied_at')
    .eq('id', payload.email_id).eq('user_id', userId).maybeSingle();
  if (readErr) return json({ error: `Reading the email failed: ${readErr.message}` }, 500);
  if (!email) return json({ error: 'Email not found.' }, 404);
  if (email.replied_at) return json({ error: 'You already replied to this email.', code: 'already_replied' }, 409);

  // Claim it, so a double-click or a second tab can't send the same reply twice.
  const claimedAt = new Date().toISOString();
  const { data: claimed } = await admin.from('cf_emails')
    .update({ replied_at: claimedAt }).eq('id', email.id).eq('user_id', userId).is('replied_at', null).select('id');
  if (!claimed?.length) return json({ error: 'You already replied to this email.', code: 'already_replied' }, 409);
  const release = () => admin.from('cf_emails').update({ replied_at: null }).eq('id', email.id).eq('replied_at', claimedAt);

  try {
    const gmail = await getValidGmailClient(userId);

    // Reply to Reply-To when the sender set one (newsletters, ticket systems, assistants).
    let to = { name: email.sender_name as string | null, email: email.sender_email as string };
    const meta = await gmail.fetch(`messages/${email.gmail_message_id}?format=metadata&metadataHeaders=Reply-To`);
    if (meta.ok) {
      const replyTo = header((await meta.json() as GmailMessage).payload, 'Reply-To');
      if (replyTo) {
        const parsed = parseAddress(replyTo.split(',')[0]);
        if (EMAIL_RE.test(parsed.email)) to = parsed;
      }
    }
    if (!EMAIL_RE.test(to.email)) {
      await release();
      return json({ error: `Can't reply: "${to.email}" isn't a valid address.` }, 400);
    }

    const raw = buildReply({
      from: gmail.googleEmail,
      to,
      subject: email.subject,
      inReplyTo: email.message_id_header,
      references: email.references_header,
      body,
    });

    const sent = await gmail.fetch('messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, threadId: email.gmail_thread_id }),
    });
    if (!sent.ok) {
      const detail = await sent.text();
      console.error('Gmail send failed', sent.status, detail);
      await release();
      if (sent.status === 401) throw new GmailNotConnectedError('Gmail rejected the saved access. Reconnect Gmail.');
      if (sent.status === 403) {
        return json({ error: 'Gmail didn’t allow sending. Reconnect Gmail and leave “Send email” ticked.' }, 403);
      }
      let reason = '';
      try { reason = JSON.parse(detail).error?.message ?? ''; } catch { /* not JSON */ }
      return json({ error: `Gmail couldn’t send the reply (${sent.status}${reason ? `: ${reason}` : ''}).` }, 502);
    }
    // Sent. From here on nothing may release the claim, or the reply could go out twice.
    const sentMessage = await sent.json().catch(() => ({}));

    const { error: saveErr } = await admin.from('cf_emails').update({
      triage_status: 'replied',
      ai_generated_draft: body,      // keep exactly what was sent
      replied_at: claimedAt,
    }).eq('id', email.id).eq('user_id', userId);
    // The email is already sent; a failed status save must not look like a failed send.
    if (saveErr) console.error('Marking replied failed', email.id, saveErr);

    return json({ sent: true, to: to.email, gmail_message_id: sentMessage.id, replied_at: claimedAt });
  } catch (err) {
    await release();
    if (err instanceof GmailNotConnectedError) {
      return json({ error: err.message, code: 'gmail_not_connected' }, 409);
    }
    console.error('cf-gmail-send failed', err);
    return json({ error: err instanceof Error ? err.message : 'Sending failed.' }, 500);
  }
});
