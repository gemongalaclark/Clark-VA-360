// ClarkFlow 360 — Gemini triage for a small batch of pending emails.
//
// Takes up to BATCH 'pending' emails (newest first), asks Gemini for priority, summary
// and a draft in the client's tone (cf_clients.custom_context), and saves them as
// 'triaged'. Batches stay small and time-boxed so a call never runs long; the browser
// calls again while { remaining > 0 }. Each email gets MAX_ATTEMPTS tries; the last
// error is kept in triage_error.
//
// Only problems with the email itself (unreadable answer, timeout) use up a try.
//   • Every model rate-limited (429) or overloaded (5xx): stop, { rate_limited: true,
//     retry_after_s } where retry_after_s is Google's wait (hours = a daily cap).
//   • Gemini rejects the request itself (400/401/403/404: bad key, model gone):
//     stop and answer 502 with Google's message. Retrying other emails can't help.
// Body { retry_failed: true } first gives emails that ran out of tries a fresh start.
//
// Deploy: see ../../config.toml (verify_jwt = true)
// Secrets: GEMINI_API_KEY (optional GEMINI_MODEL)

import { corsHeaders, json, mapLimit } from '../_shared/http.ts';
import { adminClient, requireMember } from '../_shared/auth.ts';
import { GeminiError, triageEmail } from '../_shared/gemini.ts';
import { htmlToText } from '../_shared/mime.ts';

const BATCH = 6;
const PARALLEL = 2;
const TIME_BUDGET_MS = 90_000;   // stop starting new emails after this
const MAX_ATTEMPTS = 3;

interface PendingEmail {
  id: string;
  client_id: string | null;
  sender_name: string | null;
  sender_email: string;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  triage_attempts: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = await requireMember(req);
  if ('response' in auth) return auth.response;
  const { userId } = auth;
  if (!Deno.env.get('GEMINI_API_KEY')) return json({ error: 'AI is not configured yet (missing GEMINI_API_KEY secret).' }, 500);

  const admin = adminClient();
  const countRemaining = async () => {
    const { count } = await admin.from('cf_emails').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('triage_status', 'pending').lt('triage_attempts', MAX_ATTEMPTS);
    return count ?? 0;
  };

  let body: { retry_failed?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  try {
    if (body.retry_failed) {
      const { error: resetErr } = await admin.from('cf_emails').update({ triage_attempts: 0, triage_error: null })
        .eq('user_id', userId).eq('triage_status', 'pending').gte('triage_attempts', MAX_ATTEMPTS);
      if (resetErr) throw new Error(`Resetting failed emails failed: ${resetErr.message}`);
    }

    const { data: pending, error } = await admin.from('cf_emails')
      .select('id, client_id, sender_name, sender_email, subject, snippet, body_text, body_html, received_at, triage_attempts')
      .eq('user_id', userId).eq('triage_status', 'pending').lt('triage_attempts', MAX_ATTEMPTS)
      .order('received_at', { ascending: false }).limit(BATCH);
    if (error) throw new Error(`Reading pending emails failed: ${error.message}`);
    if (!pending?.length) return json({ triaged: 0, failed: 0, remaining: 0, rate_limited: false, retry_after_s: 0 });

    const clientIds = [...new Set(pending.map((e: PendingEmail) => e.client_id).filter(Boolean))];
    const { data: clients } = clientIds.length
      ? await admin.from('cf_clients').select('id, company_name, custom_context').eq('user_id', userId).in('id', clientIds)
      : { data: [] };
    const clientById = new Map((clients ?? []).map((c: { id: string }) => [c.id, c]));

    const started = Date.now();
    let rateLimited = false;
    let retryAfterSec = 0;
    let blocked: string | null = null;   // Gemini refused the request itself

    const outcomes = await mapLimit(pending as PendingEmail[], PARALLEL, async (email) => {
      if (rateLimited || blocked || Date.now() - started > TIME_BUDGET_MS) return 'skipped';
      try {
        const result = await triageEmail({
          senderName: email.sender_name,
          senderEmail: email.sender_email,
          subject: email.subject,
          receivedAt: email.received_at,
          body: email.body_text ?? (email.body_html ? htmlToText(email.body_html) : email.snippet ?? ''),
          // deno-lint-ignore no-explicit-any
          client: (email.client_id ? clientById.get(email.client_id) as any : null) ?? null,
        });
        // Only overwrite if it's still pending (you may have edited it meanwhile).
        const { error: saveErr } = await admin.from('cf_emails').update({
          triage_status: 'triaged',
          priority_level: result.priority_level,
          ai_summary: result.ai_summary,
          ai_generated_draft: result.ai_generated_draft,
          triage_attempts: email.triage_attempts + 1,
          triage_error: null,
        }).eq('id', email.id).eq('user_id', userId).eq('triage_status', 'pending');
        if (saveErr) throw new Error(`Saving triage failed: ${saveErr.message}`);
        return 'triaged';
      } catch (err) {
        if (err instanceof GeminiError && (err.status === 429 || err.status >= 500)) {
          rateLimited = true;
          retryAfterSec = Math.max(retryAfterSec, err.retryAfterSec);
          return 'skipped';
        }
        if (err instanceof GeminiError && [400, 401, 403, 404].includes(err.status)) {
          blocked = err.message;
          return 'skipped';
        }
        console.error('Triage failed', email.id, err);
        await admin.from('cf_emails').update({
          triage_attempts: email.triage_attempts + 1,
          triage_error: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        }).eq('id', email.id).eq('user_id', userId);
        return 'failed';
      }
    });

    if (blocked) {
      return json({ error: `Gemini rejected the request, so nothing was triaged: ${blocked}`, code: 'gemini_rejected' }, 502);
    }

    return json({
      triaged: outcomes.filter((o) => o === 'triaged').length,
      failed: outcomes.filter((o) => o === 'failed').length,
      remaining: await countRemaining(),
      rate_limited: rateLimited,
      retry_after_s: Math.round(retryAfterSec),
    });
  } catch (err) {
    console.error('cf-triage-analyze failed', err);
    return json({ error: err instanceof Error ? err.message : 'Triage failed.' }, 500);
  }
});
