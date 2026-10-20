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
//          GEMINI_MODEL   (optional, defaults to gemini-flash-lite-latest, falling back to gemini-flash-latest)
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

  // 4. Ask Gemini. Flash-Lite first (a brief needs speed, not deep reasoning); if this key can't use a
  //    model (404) try the next one, and if a model rejects the thinking setting (400) retry without it.
  const models = [Deno.env.get('GEMINI_MODEL') || 'gemini-flash-lite-latest', 'gemini-flash-latest'];
  const signal = AbortSignal.timeout(45_000);  // one budget for all attempts, so the button never spins forever
  const ask = (model: string, thinking: boolean) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [{ text: `Task title: ${title}\nOwner's notes: ${notes || '(none)'}` }],
        }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 8192,  // thinking tokens count toward this, so leave room
          ...(thinking && { thinkingConfig: { thinkingLevel: 'low' } }),
        },
      }),
    });

  let res!: Response;
  let detail = '';
  try {
    for (const model of models) {
      res = await ask(model, true);
      if (res.ok) break;
      detail = await res.text();
      if (res.status === 400 && /thinking/i.test(detail)) {
        res = await ask(model, false);
        if (res.ok) break;
        detail = await res.text();
      }
      console.error('Gemini error', model, res.status, detail);
      if (res.status !== 404) break;  // only "model not available" is worth trying the next model for
    }
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    console.error('Gemini fetch failed', err);
    return json({ error: timedOut ? 'AI took too long to answer. Try again.' : 'Could not reach the AI service.' }, 504);
  }
  if (!res.ok) {
    if (res.status === 429) return json({ error: 'AI is busy (rate limit). Try again in a minute.' }, 502);
    // Owners only reach this point, so Google's own message is safe to show and makes setup issues obvious
    let reason = '';
    try { reason = JSON.parse(detail).error?.message ?? ''; } catch { /* not JSON */ }
    return json({ error: `AI request failed (${res.status}${reason ? `: ${reason}` : ''})` }, 502);
  }

  const data = await res.json();
  const text: string = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '').join('').trim()
    .replace(/\*\*/g, '')            // strip stray markdown bold
    .replace(/^#+\s*/gm, '');
  if (!text) {
    console.error('Gemini empty reply', JSON.stringify(data).slice(0, 1000));
    return json({ error: `AI returned an empty brief (${data.candidates?.[0]?.finishReason ?? 'no reason given'}). Try again.` }, 502);
  }

  return json({ brief: text.slice(0, DESC_MAX) });
});
