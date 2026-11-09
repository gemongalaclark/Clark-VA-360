// ClarkFlow 360 — send the sign-in code through Resend, branded as ClarkFlow.
//
// The Supabase project is shared with other apps, so its built-in auth email says
// "TeamSync Workspace". Here Supabase still makes the code (admin generateLink, which
// creates the code without emailing it) and the browser still checks it with
// supabase.auth.verifyOtp; only the delivery changes, to a ClarkFlow email via Resend.
//
// Codes go only to ClarkFlow members (cf_start_signin in schema.sql, section 9), at most
// once a minute per address. Any other address gets the same "if it has an account"
// answer and no email, so the form can't be used to spam people or probe membership.
//
// Deploy: see ../../config.toml (verify_jwt = true; the anon key is enough)
// Secrets: RESEND_API_KEY, RESEND_FROM (e.g. "ClarkFlow 360 <signin@your-verified-domain>"),
//          CLARKFLOW_APP_URL (where the one-click sign-in link lands)

import { corsHeaders, json, requireEnv } from '../_shared/http.ts';
import { adminClient } from '../_shared/auth.ts';

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const SENT = { sent: true };   // same answer whether or not the address is a member

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function emailBodies(code: string, link: string) {
  const text = `Your ClarkFlow 360 sign-in code is ${code}.\n\nOr sign in with one click: ${link}\n\n`
    + 'The code expires in 1 hour and works once. If you didn’t try to sign in to ClarkFlow 360, ignore this email.';
  const html = `<!doctype html><html><body style="margin:0;background:#f7f6f8;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1a1a2e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #ebe9ee;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#cb2525,#ea4343 55%,#da7979);padding:22px 28px;color:#ffffff">
<div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Clark VA 360</div>
<div style="font-size:22px;font-weight:800;margin-top:4px">ClarkFlow 360</div></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 6px;font-size:16px;font-weight:700">Your sign-in code</p>
<p style="margin:0 0 18px;font-size:14px;color:#6b6b85">Enter this code on the ClarkFlow sign-in screen:</p>
<p style="margin:0 0 22px;font-size:32px;font-weight:800;letter-spacing:8px;color:#cb2525">${escapeHtml(code)}</p>
<p style="margin:0 0 22px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#cb2525;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px">Sign in with one click</a></p>
<p style="margin:0;font-size:12.5px;color:#6b6b85">The code expires in 1 hour and works once. If you didn’t try to sign in to ClarkFlow 360, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { text, html };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: { email?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const email = (payload.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400);

  try {
    const admin = adminClient();
    const { data: verdict, error: gateErr } = await admin.rpc('cf_start_signin', { p_email: email });
    if (gateErr) throw new Error(`Sign-in check failed: ${gateErr.message}`);
    if (verdict === 'unknown') return json(SENT);
    if (verdict === 'cooldown') return json({ error: 'A code was just sent. Wait a minute before asking for another.' }, 429);

    // Supabase makes the code (and a one-click link) without sending its own email.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: requireEnv('CLARKFLOW_APP_URL') },
    });
    const code = link?.properties?.email_otp;
    const actionLink = link?.properties?.action_link;
    if (linkErr || !code || !actionLink) throw new Error(`Could not create a sign-in code: ${linkErr?.message ?? 'no code returned'}`);

    const { text, html } = emailBodies(code, actionLink);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${requireEnv('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: requireEnv('RESEND_FROM'),
        to: [email],
        subject: `${code} is your ClarkFlow 360 sign-in code`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`Resend failed (${res.status}): ${await res.text()}`);
      return json({ error: 'We couldn’t send the email. Try again in a minute.' }, 502);
    }
    return json(SENT);
  } catch (err) {
    console.error('cf-signin-code failed', err);
    return json({ error: 'Sign-in is unavailable right now. Try again in a minute.' }, 500);
  }
});
