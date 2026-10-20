// TeamSync — "✨ Auto-Write Brief with AI" on the Create Task page.
//
// Turns a rushed one-line task title (plus any notes the owner already typed)
// into a clear brief: goal, deliverables, step-by-step checklist, tone, ideas.
// Verifies the caller is an OWNER of the room, so the Gemini key can't be
// abused by anyone else, and the key never reaches the browser.
//
// Deploy:  Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
//          (name it exactly  teamsync-ai-brief) — or: supabase functions deploy teamsync-ai-brief
// Secrets: GEMINI_API_KEY (required, from aistudio.google.com/apikey)
//          GEMINI_MODEL   (optional, defaults to gemini-2.5-flash)
//          SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

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

const DESC_MAX = 1500; // matches the Create Task description limit

const SYSTEM_PROMPT = `You write task briefs for a small agency's task tool. The owner gives you a short task title and maybe a few notes; you expand it into a brief an employee or virtual assistant can follow without asking questions.

Write PLAIN TEXT only (no markdown, no asterisks, no # headings). Use exactly these sections, each label on its own line followed by a colon:
Goal:
Deliverables:
Step-by-step checklist:
Tone & style:
Reference ideas:
Suggested deadline:

Use "• " for bullets and "1. 2. 3." for the checklist. Keep every line short and concrete. Respect any numbers, dates, platforms or names in the title/notes exactly. If something is unknown, make a sensible assumption instead of asking. Suggested deadline is a duration like "3 working days". Stay under 1,300 characters in total.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured yet (missing GEMINI_API_KEY secret).' }, 500);

  // 1. Who is calling? Use their JWT, not the service role.
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401);

  // 2. Validate input.
  let payload: { roomId?: string; title?: string; notes?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const title = payload.title?.trim().slice(0, 120);
  const notes = payload.notes?.trim().slice(0, DESC_MAX) ?? '';
  if (!payload.roomId) return json({ error: 'Missing room' }, 400);
  if (!title) return json({ error: 'Type a task title first.' }, 400);

  // 3. Owners only.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: membership } = await admin
    .from('room_members').select('role')
    .eq('room_id', payload.roomId).eq('user_id', userData.user.id).maybeSingle();
  if (membership?.role !== 'owner') return json({ error: 'Only room owners can use this.' }, 403);

  // 4. Ask Gemini.
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [{ text: `Task title: ${title}\nOwner's notes: ${notes || '(none)'}` }],
      }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('Gemini error', res.status, detail);
    return json({ error: res.status === 429 ? 'AI is busy (rate limit). Try again in a minute.' : 'AI request failed.' }, 502);
  }

  const data = await res.json();
  const text: string = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '').join('').trim()
    .replace(/\*\*/g, '')            // strip stray markdown bold
    .replace(/^#+\s*/gm, '');
  if (!text) return json({ error: 'AI returned an empty brief. Try again.' }, 502);

  return json({ brief: text.slice(0, DESC_MAX) });
});
