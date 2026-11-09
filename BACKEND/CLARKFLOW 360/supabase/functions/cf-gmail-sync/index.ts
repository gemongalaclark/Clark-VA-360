// ClarkFlow 360 — pull new unread email from Gmail into cf_emails.
//
// One call = one small batch, so it always finishes fast: list the newest unread
// inbox messages, skip the ones already stored, fetch up to BATCH new ones in full,
// parse them, match each sender to a client, and insert with
// ON CONFLICT (user_id, gmail_message_id) DO NOTHING. Returns { more: true } when
// new messages are left over; the browser simply calls again.
// Gmail is read-only here: messages stay unread in Gmail.
//
// Deploy: see ../../config.toml (verify_jwt = true)
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY (for token refresh)

import { corsHeaders, json, mapLimit } from '../_shared/http.ts';
import { adminClient, requireMember } from '../_shared/auth.ts';
import { getValidGmailClient, GmailNotConnectedError } from '../_shared/gmail.ts';
import { matchClient, toEmailRow, type ClientMatchInfo, type GmailMessage } from '../_shared/mime.ts';

// Unread inbox mail from the last 14 days, minus bulk tabs and your own messages.
const QUERY = 'in:inbox is:unread -from:me -category:promotions -category:social newer_than:14d';
const SCAN = 100;        // newest unread messages looked at per call
const BATCH = 25;        // new messages fetched in full per call
const PARALLEL = 5;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = await requireMember(req);
  if ('response' in auth) return auth.response;
  const { userId } = auth;

  try {
    const gmail = await getValidGmailClient(userId);
    const admin = adminClient();

    // 1. Newest unread message ids.
    const listRes = await gmail.fetch(`messages?${new URLSearchParams({ q: QUERY, maxResults: String(SCAN) })}`);
    if (listRes.status === 401) throw new GmailNotConnectedError('Gmail rejected the saved access. Reconnect Gmail.');
    if (!listRes.ok) throw new Error(`Gmail list failed (${listRes.status}): ${(await listRes.text()).slice(0, 300)}`);
    const ids: string[] = ((await listRes.json()).messages ?? []).map((m: { id: string }) => m.id);
    if (ids.length === 0) return json({ scanned: 0, added: 0, matched: 0, more: false });

    // 2. Skip what's already stored.
    const { data: existing, error: existErr } = await admin
      .from('cf_emails').select('gmail_message_id').eq('user_id', userId).in('gmail_message_id', ids);
    if (existErr) throw new Error(`Reading stored emails failed: ${existErr.message}`);
    const known = new Set((existing ?? []).map((r: { gmail_message_id: string }) => r.gmail_message_id));
    const fresh = ids.filter((id) => !known.has(id));
    const batch = fresh.slice(0, BATCH);

    // 3. Fetch in full. A message deleted meanwhile (404) is just skipped.
    const messages = await mapLimit(batch, PARALLEL, async (id): Promise<GmailMessage | null> => {
      const res = await gmail.fetch(`messages/${id}?format=full`);
      if (!res.ok) {
        console.error('Gmail get failed', id, res.status);
        return null;
      }
      return await res.json();
    });

    // 4. Parse + match to clients.
    const { data: clients, error: clientErr } = await admin
      .from('cf_clients').select('id, contact_email, domain_whitelist').eq('user_id', userId).eq('is_active', true);
    if (clientErr) throw new Error(`Reading clients failed: ${clientErr.message}`);

    const rows = [];
    for (const msg of messages) {
      if (!msg) continue;
      try {
        const row = toEmailRow(msg);
        rows.push({ ...row, user_id: userId, client_id: matchClient(row.sender_email, (clients ?? []) as ClientMatchInfo[]) });
      } catch (err) {
        console.error('Could not parse Gmail message', msg.id, err);
      }
    }

    // 5. Insert; a parallel sync that got there first is ignored.
    if (rows.length > 0) {
      const { error } = await admin.from('cf_emails')
        .upsert(rows, { onConflict: 'user_id,gmail_message_id', ignoreDuplicates: true });
      if (error) throw new Error(`Saving emails failed: ${error.message}`);
    }

    return json({
      scanned: ids.length,
      added: rows.length,
      matched: rows.filter((r) => r.client_id).length,
      more: fresh.length > batch.length,
    });
  } catch (err) {
    if (err instanceof GmailNotConnectedError) {
      return json({ error: err.message, code: 'gmail_not_connected' }, 409);
    }
    console.error('cf-gmail-sync failed', err);
    return json({ error: err instanceof Error ? err.message : 'Sync failed.' }, 500);
  }
});
