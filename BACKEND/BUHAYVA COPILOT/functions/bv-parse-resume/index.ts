// BuhayVA Copilot — "Import from resume" in the Master profile.
//
// Takes an uploaded resume (PDF or image, sent as base64, or text the browser already
// pulled out of a .docx/.txt) and asks Gemini to fill in the profile form: name, target
// niches, portfolio links and a clean plain-text resume. Nothing is saved here; the user
// reviews the filled form and presses Save. Verifies the caller is a bv_members user,
// so the Gemini key can't be spent by anyone else, and the key never reaches the browser.
//
// Deploy:  Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
//          (name it exactly  bv-parse-resume) — or: supabase functions deploy bv-parse-resume
// Secrets: GEMINI_API_KEY (required; already set if TeamSync's AI brief works)
//          GEMINI_MODEL   (optional, defaults to gemini-flash-latest)
//          SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.

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

const FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_B64 = 7_000_000;   // ≈ 5 MB file once base64-encoded
const MAX_TEXT = 30_000;
const RESUME_MAX = 12_000;        // matches bv_user_profile.resume_text check

const SYSTEM_PROMPT = `You turn a freelancer's resume into profile fields for a job-application assistant that will later compare the resume against Upwork and OnlineJobs.ph job posts.

Rules:
- Use ONLY facts in the resume. Never invent employers, dates, numbers, tools, links or skills.
- resume_text: the full resume rewritten as clean plain text. Keep every role, project, certification, education entry, skill and measurable result. Use simple section headings in capitals and "• " bullets. Remove decorative symbols, page numbers, and the phone number and street address (keep city/country and email). No markdown.
- full_name: the person's name in normal capitalization.
- target_niches: 2–4 comma-separated freelance niches this person is best positioned for, based on their experience (e.g. "Tech Virtual Assistant, Web Developer").
- portfolio_links: every portfolio, website, GitHub, LinkedIn or project URL in the resume, one per line, with https://. Empty string if none.
- hourly_rate_min: only if the resume states an hourly rate or rate expectation in USD; otherwise null.
- If the document is not a resume, return empty strings and set not_a_resume to true.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    full_name: { type: 'STRING' },
    target_niches: { type: 'STRING' },
    portfolio_links: { type: 'STRING' },
    resume_text: { type: 'STRING' },
    hourly_rate_min: { type: 'NUMBER', nullable: true },
    not_a_resume: { type: 'BOOLEAN' },
  },
  required: ['full_name', 'target_niches', 'portfolio_links', 'resume_text', 'not_a_resume'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured yet (missing GEMINI_API_KEY secret).' }, 500);

  // 1. Who is calling? Use their JWT, and require a BuhayVA Copilot membership.
  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401);
  const { data: isMember } = await caller.rpc('bv_is_member');
  if (isMember !== true) return json({ error: 'Live mode is not enabled for this account.' }, 403);

  // 2. Validate input: either a file (PDF/image) or text extracted in the browser.
  let payload: { file?: { data?: string; mime_type?: string }; text?: string; file_name?: string };
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  let part: Record<string, unknown>;
  if (payload.file) {
    const { data, mime_type } = payload.file;
    if (!data || !mime_type || !FILE_TYPES.includes(mime_type)) return json({ error: 'Unsupported file type.' }, 400);
    if (data.length > MAX_FILE_B64) return json({ error: 'That file is over 5 MB.' }, 413);
    part = { inlineData: { mimeType: mime_type, data } };
  } else {
    const text = payload.text?.trim();
    if (!text) return json({ error: 'The file looks empty.' }, 400);
    part = { text: `RESUME (extracted from ${payload.file_name ?? 'a document'}):\n\n${text.slice(0, MAX_TEXT)}` };
  }

  // 3. Ask Gemini for structured JSON. If this key can't use a model (404) try the next one,
  //    and if a model rejects the thinking setting (400) retry without it.
  const models = [Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest', 'gemini-flash-lite-latest'];
  const signal = AbortSignal.timeout(55_000);
  const ask = (model: string, thinking: boolean) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [part, { text: 'Fill in the profile fields from this resume.' }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          maxOutputTokens: 16384,  // thinking tokens count toward this, and a resume is long
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
      if (res.status !== 404) break;
    }
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    console.error('Gemini fetch failed', err);
    return json({ error: timedOut ? 'AI took too long to read the resume. Try again.' : 'Could not reach the AI service.' }, 504);
  }
  if (!res.ok) {
    if (res.status === 429) return json({ error: 'AI is busy (rate limit). Try again in a minute.' }, 502);
    let reason = '';
    try { reason = JSON.parse(detail).error?.message ?? ''; } catch { /* not JSON */ }
    return json({ error: `AI request failed (${res.status}${reason ? `: ${reason}` : ''})` }, 502);
  }

  const data = await res.json();
  const raw: string = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? '').join('').trim();
  let out: Record<string, unknown>;
  try {
    out = JSON.parse(raw.replace(/^```(json)?\s*|\s*```$/g, ''));
  } catch {
    console.error('Gemini non-JSON reply', raw.slice(0, 1000));
    return json({ error: `AI returned an unreadable answer (${data.candidates?.[0]?.finishReason ?? 'unknown'}). Try again.` }, 502);
  }
  if (out.not_a_resume) return json({ error: "That file doesn't look like a resume." }, 422);

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const rate = typeof out.hourly_rate_min === 'number' && out.hourly_rate_min > 0 ? out.hourly_rate_min : null;
  return json({
    full_name: str(out.full_name, 120),
    target_niches: str(out.target_niches, 300),
    portfolio_links: str(out.portfolio_links, 1000),
    resume_text: str(out.resume_text, RESUME_MAX),
    hourly_rate_min: rate,
  });
});
