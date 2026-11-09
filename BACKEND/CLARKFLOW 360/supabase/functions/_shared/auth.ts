// ClarkFlow 360 — who is calling, and are they allowed to use ClarkFlow?

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json } from './http.ts';

// Service-role client: bypasses RLS. Only for cf_oauth_tokens / cf_oauth_states and
// sync writes, always filtered by a user id this code has already verified.
export const adminClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Resolves the caller from their Supabase JWT and requires a cf_members row.
// Returns { userId } or a ready-made error Response.
export async function requireMember(req: Request): Promise<{ userId: string } | { response: Response }> {
  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData?.user) return { response: json({ error: 'Not signed in' }, 401) };

  const { data: isMember, error: memberErr } = await caller.rpc('cf_is_member');
  if (memberErr) {
    console.error('cf_is_member failed', memberErr);
    return { response: json({ error: 'Could not check ClarkFlow access. Has schema.sql been run?' }, 500) };
  }
  if (isMember !== true) return { response: json({ error: 'ClarkFlow is not enabled for this account.' }, 403) };

  return { userId: userData.user.id as string };
}
