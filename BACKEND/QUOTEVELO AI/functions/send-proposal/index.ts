// @ts-nocheck — runs on Deno (Supabase Edge Functions); VS Code's Node TS service can't resolve `Deno` or URL imports.
//
// QuoteVelo AI — "Approve & Send Proposal".
//
// Called from the Admin dashboard when the owner clicks the button. Verifies the
// caller is a QuoteVelo admin, loads the lead (including any edits the owner made
// to the email draft), then triggers Activepieces Flow 2, which sends the Gmail
// message and moves the lead to "sent".
//
// Why a function instead of calling Activepieces from the browser?
//   * The Flow 2 webhook URL stays secret (a public URL could be abused to send mail).
//   * The send is authorised by a real Supabase session, not by a guessable link.
//
// Deploy:  supabase functions deploy send-proposal
// Secrets: supabase secrets set ACTIVEPIECES_SEND_WEBHOOK_URL=https://cloud.activepieces.com/api/v1/webhooks/XXXX
//          supabase secrets set QV_SHARED_SECRET=<long random string>   (Flow 2 checks the x-qv-secret header)
//          SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const hook = Deno.env.get('ACTIVEPIECES_SEND_WEBHOOK_URL');
  if (!hook) return json({ error: 'ACTIVEPIECES_SEND_WEBHOOK_URL is not set' }, 500);

  // 1. Who is calling? Use their JWT, not the service role.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401);

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 2. Are they an admin?
  const { data: adminRow } = await db.from('qv_admins').select('user_id').eq('user_id', userData.user.id).maybeSingle();
  if (!adminRow) return json({ error: 'Admins only' }, 403);

  // 3. Load the lead as it stands now (so the owner's edits are what gets sent).
  let leadId: string | undefined;
  try { leadId = (await req.json())?.leadId; } catch { /* handled below */ }
  if (!leadId) return json({ error: 'leadId is required' }, 400);

  const { data: lead, error: leadErr } = await db.from('qv_leads').select('*').eq('id', leadId).maybeSingle();
  if (leadErr || !lead) return json({ error: 'Lead not found' }, 404);
  if (lead.status !== 'scored') return json({ error: `Lead is "${lead.status}", only scored leads can be sent` }, 409);
  if (!lead.ai_email_subject || !lead.ai_email_body) return json({ error: 'The email draft is empty' }, 422);

  // 4. Mark the request (also guards against a double-click firing two emails).
  const { data: claimed } = await db.from('qv_leads')
    .update({ send_requested_at: new Date().toISOString() })
    .eq('id', leadId).eq('status', 'scored').is('send_requested_at', null)
    .select('id');
  if (!claimed?.length) return json({ error: 'A send is already in progress for this lead' }, 409);

  // 5. Hand off to Activepieces Flow 2.
  const res = await fetch(hook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-qv-secret': Deno.env.get('QV_SHARED_SECRET') ?? '' },
    body: JSON.stringify({
      lead_id: lead.id,
      to_email: lead.email,
      to_name: lead.full_name,
      company: lead.company,
      subject: lead.ai_email_subject,
      body: lead.ai_email_body,
      proposal_doc_url: lead.proposal_doc_url,
    }),
  });

  if (!res.ok) {
    // Release the claim so the owner can retry.
    await db.from('qv_leads').update({ send_requested_at: null }).eq('id', leadId);
    return json({ error: `Activepieces responded ${res.status}` }, 502);
  }
  return json({ ok: true });
});
