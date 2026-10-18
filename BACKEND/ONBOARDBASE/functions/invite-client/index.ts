// OnboardBase — "New Client" provisioning.
//
// Called from the Admin dashboard. Verifies the caller is an OnboardBase admin,
// emails the client a magic-link invite, and creates their project. The
// ob_projects insert trigger then generates the standard onboarding steps.
//
// Deploy:  supabase functions deploy invite-client
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
//          injected automatically. Optionally set  ONBOARDBASE_SITE_URL
//          (e.g. https://your-site.com/onboardbase) for the magic-link redirect.

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
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1. Who is calling? Use their JWT, not the service role.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: callerProfile } = await admin
    .from('ob_profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (callerProfile?.role !== 'admin') return json({ error: 'Admins only' }, 403);

  // 2. Validate input.
  let payload: { email?: string; fullName?: string; companyName?: string; projectTitle?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const email = payload.email?.trim().toLowerCase();
  const companyName = payload.companyName?.trim();
  const fullName = payload.fullName?.trim() || null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required' }, 400);
  if (!companyName) return json({ error: 'Company name is required' }, 400);

  // 3. Invite (sends the magic-link email). The ob_handle_new_user trigger builds the profile.
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: Deno.env.get('ONBOARDBASE_SITE_URL') ?? undefined,
    data: { ob_invited: true, full_name: fullName, company_name: companyName },
  });
  if (inviteErr || !invited.user) return json({ error: inviteErr?.message ?? 'Invite failed' }, 400);

  // 4. Create the engagement. The DB trigger seeds its onboarding steps.
  const { data: project, error: projectErr } = await admin
    .from('ob_projects')
    .insert({
      client_id: invited.user.id,
      title: payload.projectTitle?.trim() || `${companyName} — Onboarding`,
      contact_name: userData.user.user_metadata?.full_name ?? null,
      contact_email: userData.user.email ?? null,
    })
    .select('id')
    .single();
  if (projectErr) return json({ error: projectErr.message }, 400);

  return json({ ok: true, clientId: invited.user.id, projectId: project.id });
});
