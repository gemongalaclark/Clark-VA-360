// Job Tracker Apply Copilot — writes one OnlineJobs.ph application (subject + message, fit score,
// code word, red flags) from the user's Copilot profile. The extension fills the form; the user
// reviews it and clicks Send. Spec: docs/superpowers/specs/2026-11-16-job-tracker-apply-copilot-design.md
//
// POST { token, mode: 'olj', job: { title, url, site, text } }
//   200 { job_title, fit_score, fit_reason, attention_check, red_flags, subject, message, model, used_today, daily_cap }
//   4xx/5xx { code, error, retry_after_sec? }: bad_request | no_profile | signed_out | daily_cap | ai_busy | ai_failed | error
//
// Who is calling comes from the Job Tracker session token: jt_copilot_take checks it, needs a
// profile, counts the write and enforces the daily cap — all with the anon key, never a service key.
// Deploy: see ../../config.toml.  Secrets: GEMINI_API_KEY (shared); optional JT_COPILOT_MODEL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireEnv } from '../_shared/http.ts';
import {
  DEFAULT_MODELS, OLJ_SCHEMA, OLJ_SYSTEM_PROMPT, buildOljPrompt, callGemini, cleanOljResult,
  geminiErrorBody, rpcErrorBody, validateJob,
} from '../_shared/copilot.mjs';

const fail = ({ status, body }: { status: number; body: unknown }) => json(body, status);
const bad = (error: string) => json({ code: 'bad_request', error }, 400);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return bad('Use POST.');

  let body: { token?: unknown; mode?: unknown; job?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('The request body must be JSON.');
  }
  if (body.mode !== 'olj') return bad('Unknown mode.');
  const checked = validateJob(body.job);
  if (!checked.ok) return bad(checked.error);

  try {
    const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: state, error } = await db.rpc('jt_copilot_take', { p_token: String(body.token ?? '') });
    if (error) {
      if (!['28000', 'JTNOP', 'JTCAP', '22023'].includes(error.code)) console.error('jt_copilot_take failed', error);
      return fail(rpcErrorBody(error));
    }

    const models = [...new Set([Deno.env.get('JT_COPILOT_MODEL'), ...DEFAULT_MODELS].filter(Boolean))] as string[];
    try {
      const { data, model } = await callGemini({
        apiKey: requireEnv('GEMINI_API_KEY'),
        models,
        system: OLJ_SYSTEM_PROMPT,
        prompt: buildOljPrompt({ profile: state.profile, answers: state.answers, job: checked.job }),
        schema: OLJ_SCHEMA,
      });
      return json({ ...cleanOljResult(data), model, used_today: state.used_today, daily_cap: state.daily_cap });
    } catch (err) {
      console.error('Gemini failed', err);
      return fail(geminiErrorBody(err));
    }
  } catch (err) {
    console.error('jt-copilot failed', err);
    return json({ code: 'error', error: 'Something went wrong.' }, 500);
  }
});
