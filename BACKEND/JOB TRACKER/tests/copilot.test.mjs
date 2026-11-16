// Apply Copilot core (supabase/functions/_shared/copilot.mjs).
// Run: node --test "BACKEND/JOB TRACKER/tests/copilot.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, OLJ_SYSTEM_PROMPT, validateJob, buildOljPrompt, cleanOljResult, callGemini,
  GeminiError, geminiErrorBody, rpcErrorBody } from '../supabase/functions/_shared/copilot.mjs';

const ok = (obj) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const limited = (delay) => new Response(JSON.stringify({ error: { details: [{ retryDelay: delay }] } }), { status: 429 });

test('system prompt carries the honesty, cliché and untrusted-data rules', () => {
  for (const s of ['paid VA client', '120–220 words', 'untrusted', 'delve', 'thrilled', 'testament', 'seamless',
    'leverage', 'passionate', 'I hope this message finds you well', 'I am excited to apply']) assert.ok(OLJ_SYSTEM_PROMPT.includes(s), s);
});

test('fit_reason speaks to the VA as "you" (it is shown to them in the panel)', () => {
  assert.match(OLJ_SYSTEM_PROMPT, /fit_reason: one plain sentence written to the VA as "you"/);
});

test('validateJob needs real job text', () => {
  assert.equal(validateJob(null).ok, false);
  assert.equal(validateJob({ text: '   short   ' }).ok, false);
  assert.equal(validateJob({ text: 'y'.repeat(LIMITS.JOB_TEXT_MIN) }).ok, true);
});

test('buildOljPrompt fences and trims the job, lists only filled answers, uses Manila date', () => {
  const p = buildOljPrompt({ profile: 'PROFILE TEXT', answers: { rate: '$5/hr', equipment: '' },
    job: { title: 'Admin VA', url: 'https://x', text: 'J'.repeat(LIMITS.JOB_TEXT_MAX + 50) }, now: new Date('2026-11-16T20:00:00Z') });
  assert.match(p, /<<<JOB[\s\S]*JOB>>>/);
  assert.ok(!p.includes('J'.repeat(LIMITS.JOB_TEXT_MAX + 1)));
  assert.ok(p.includes('PROFILE TEXT') && p.includes('$5/hr'));
  assert.ok(!/equipment/i.test(p.split('<<<JOB')[0]));
  assert.ok(p.includes('November 17, 2026'));
});

test('cleanOljResult clamps everything', () => {
  const r = cleanOljResult({ fit_score: 140.6, red_flags: ['a', '', 'b', 'c', 'd', 'e', 'f'], subject: 'x'.repeat(200), message: '  hi  ' });
  assert.equal(r.fit_score, 100);
  assert.deepEqual(r.red_flags, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(r.subject.length, LIMITS.SUBJECT_MAX);
  assert.equal(r.message, 'hi');
  assert.equal(cleanOljResult({ fit_score: 'abc' }).fit_score, 0);
  assert.equal(cleanOljResult({}).attention_check, '');
});

test('callGemini moves to the next model on 429', async () => {
  const seen = [];
  const fetchImpl = async (url) => { seen.push(url); return seen.length === 1 ? limited('60s') : ok({ subject: 'S' }); };
  const r = await callGemini({ apiKey: 'k', models: ['m1', 'm2'], system: 's', prompt: 'p', schema: {}, fetchImpl });
  assert.equal(r.model, 'm2');
  assert.equal(r.data.subject, 'S');
});

test('callGemini: every model limited → GeminiError 429 with Google’s wait', async () => {
  const fetchImpl = async () => limited('3600s');
  await assert.rejects(callGemini({ apiKey: 'k', models: ['m1', 'm2'], system: 's', prompt: 'p', schema: {}, fetchImpl }),
    (e) => e instanceof GeminiError && e.status === 429 && e.retryAfterSec === 3600);
  const b = geminiErrorBody(new GeminiError('x', 429, 3600));
  assert.deepEqual([b.status, b.body.code, b.body.retry_after_sec], [503, 'ai_busy', 3600]);
});

test('rpcErrorBody maps database codes', () => {
  assert.deepEqual([rpcErrorBody({ code: '28000' }).status, rpcErrorBody({ code: '28000' }).body.code], [401, 'signed_out']);
  assert.equal(rpcErrorBody({ code: 'JTNOP' }).body.code, 'no_profile');
  assert.deepEqual([rpcErrorBody({ code: 'JTCAP' }).status, rpcErrorBody({ code: 'JTCAP' }).body.code], [429, 'daily_cap']);
  assert.equal(rpcErrorBody({ code: 'XX000' }).status, 500);
});
