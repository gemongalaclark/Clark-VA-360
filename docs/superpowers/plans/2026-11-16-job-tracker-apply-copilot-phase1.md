# Job Tracker Apply Copilot — Phase 1 (OnlineJobs.ph) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On an OnlineJobs.ph (OLJ) apply page, a Chrome extension writes a tailored Subject + Message from Clark's Job Tracker profile (via Gemini). Clark reviews it and clicks Send himself, and the application is logged to the Job Tracker.

**Architecture:** New `jt_` tables and token-checked RPCs in the Job Tracker schema. A Supabase Edge Function `jt-copilot` calls those RPCs with the user's own token and then Gemini. A new "Copilot" tab in the Job Tracker edits the profile and answer bank. A plain-JS MV3 extension (popup + background worker + OLJ content script with a Shadow-DOM panel) calls the RPCs and the function.

**Tech Stack:** Postgres/PL-pgSQL (Supabase), Deno Edge Function (TypeScript + one `.mjs` core module), React 18 + Vite (existing), Chrome MV3 plain JavaScript. Tests: `node --test` (Node 20, built in), SQL `assert` scripts, and Edge headless `--dump-dom` for DOM tests. **No new packages.**

**Spec:** `docs/superpowers/specs/2026-11-16-job-tracker-apply-copilot-design.md` (Phase 1 = §6.2–§6.7). Read it first.

## Global Constraints

- No new npm/Deno packages; reuse what the repo already has. The extension has no build step.
- New tables/functions are prefixed `jt_`. RLS on with **no policies**. Browser-callable RPCs are `SECURITY DEFINER`, take `p_token text`, start with `jt_user_from_token(p_token)`, and are granted to `anon, authenticated`. Internal helpers are revoked from `public, anon, authenticated`.
- The Gemini key exists only as the Supabase secret `GEMINI_API_KEY`. It never appears in the extension, the website or git.
- Model order: env `JT_COPILOT_MODEL` (optional) → `gemini-3.6-flash` → `gemini-3.5-flash-lite`.
- Daily cap: **25** AI writes per user per day. "Day" = the `Asia/Manila` date. Each attempt counts.
- The extension fills **Subject and Message only**. It never touches Contact Info or Apply Points, and never clicks Send Email, Next or Submit.
- Pitches never claim paid VA clients, years, tools or results not in the profile. Unknowns become `[square-bracket placeholders]`.
- Job post text is untrusted data in every prompt.
- Project ref `cdlvlgtemdlhbvhihvle`. **Any remote SQL run, function deploy or secret change needs Clark's go-ahead in the chat first.** CLI writes to the hosted DB may need `--yes`.
- Git: Clark commits himself unless he says otherwise. "Checkpoint" steps = run `git status` and commit **only if Clark has said to**. Don't push.
- Copy: plain, friendly English, no jargon (match the Job Tracker's existing toasts).

## Review Focus

1. **Clark sends the same job twice, or reloads and sends again** → exactly one Job Tracker row, "Already in your Job Tracker." (Task 1 SQL URL-variant test; Task 5 `normalizeJobUrl` test using the same variants.)
2. **Session token expired or signed out elsewhere** → panel says to sign in again and the stored token is cleared. No silent failure. (Task 5 `errorCode` test.)
3. **Gemini allowance used up (every model 429)** → "AI limit reached. Try again in about Xh." Fields untouched. (Task 2 `callGemini` all-429 test + `geminiErrorBody` test.)
4. **Apply page opened without the job post captured** (direct link, browser restarted) → asks to open the post or highlight the text. No AI call made. (Task 5 `pickJobText` test.)
5. **OLJ changes its markup** → Subject/Message not found → Copy-buttons mode, never writes into Contact Info or Apply Points. (Task 6 harness tests.)

## Prerequisites (Clark)

- [ ] **P1.** Clark saves one OLJ **job post page** and its **apply page** with *Ctrl+S → Webpage, complete* into `EXTENSION/JOB TRACKER COPILOT/test/fixtures/real/` (gitignored in Task 5). Task 6 can't start without them. Don't guess OLJ's markup.
- [ ] **P2.** Clark gives the go-ahead to run `BACKEND/JOB TRACKER/schema.sql` on the live DB. This also applies the pending sign-up REVOKE from 2026-11-16.

---

### Task 1: Database — Copilot tables and RPCs

**Files:**
- Modify: `BACKEND/JOB TRACKER/schema.sql`. Append section `-- ── 7. Apply Copilot ──`. Add the new grants/revokes to section 6, and the new tables to the header comment.
- Create: `BACKEND/JOB TRACKER/tests/copilot_test.sql`

**Interfaces:**
- Produces (SQL):
  - `jt_copilot_profiles(user_id uuid pk → jt_users on delete cascade, profile text not null default '' check (char_length(profile) <= 12000), answers jsonb not null default '{}', updated_at timestamptz not null default now())`
  - `jt_copilot_usage(user_id uuid → jt_users on delete cascade, day date, count int not null default 0, primary key (user_id, day))`
  - internal: `jt_copilot_daily_cap() returns int` → `25`; `jt_norm_url(p_url text) returns text` (immutable): lower-case, drop `#…` and `?…`, strip trailing `/`; `jt_copilot_clean_answers(p_answers jsonb) returns jsonb`.
  - `jt_copilot_load(p_token text) returns json` → `{ profile: text ('' if none), answers: object ({} if none), used_today: int, daily_cap: int }`
  - `jt_copilot_save(p_token text, p_profile text, p_answers jsonb) returns json` → the same shape as load.
  - `jt_copilot_take(p_token text) returns json` → the same shape. `used_today` is after this call's increment.
  - `jt_find_application(p_token text, p_url text) returns uuid` (or null)
- Error codes (SQLSTATE): `28000` signed out (existing); `22023` validation; `JTNOP` profile empty ("Set up your Copilot profile in the Job Tracker first."); `JTCAP` cap reached ("You've used all 25 AI writes for today. They reset at midnight, Philippine time.").
- Answer rules (`jt_copilot_clean_answers`; must match Task 3's `cleanAnswers`):
  - Keep only these string keys, trimmed: `first_name` (≤ 40), `portfolio_url`, `resume_url`, `rate`, `hours_per_week`, `schedule`, `start`, `internet`, `equipment`, `va_experience` (each ≤ 500). Drop empty strings.
  - `custom`: an array, at most 30 items. Each is `{question ≤ 300, answer ≤ 1000}`, trimmed; drop items whose question or answer is empty.
  - Too-long values raise `22023`. A non-object `p_answers` raises `22023` "Answers must be an object."

- [ ] **Step 1: Write the failing test** `BACKEND/JOB TRACKER/tests/copilot_test.sql`

```sql
-- Run: npx supabase db query --remote=cdlvlgtemdlhbvhihvle -f "BACKEND/JOB TRACKER/tests/copilot_test.sql"
-- Everything is rolled back. Success = no ERROR (and NOTICE 'ALL PASS' if notices are shown).
begin;
do $$
declare v_tok text; v_res jsonb; v_app jt_applications;
begin
  v_tok := public.jt_sign_up('jtc_t_' || substr(md5(random()::text), 1, 8), 'testpass123')->>'token';

  v_res := public.jt_copilot_load(v_tok)::jsonb;
  assert v_res->>'profile' = '' and v_res->'answers' = '{}'::jsonb, 'load: empty';
  assert (v_res->>'used_today')::int = 0 and (v_res->>'daily_cap')::int = 25, 'load: 0 of 25';

  begin perform public.jt_copilot_take(v_tok); raise exception 'take without profile must fail';
  exception when sqlstate 'JTNOP' then null; end;

  v_res := public.jt_copilot_save(v_tok, 'Clark profile',
    '{"first_name":"  Clark ","bogus":"x","custom":[{"question":"Q1","answer":"A1"},{"question":"","answer":"gone"}]}')::jsonb;
  assert v_res->'answers'->>'first_name' = 'Clark', 'save: trims';
  assert not (v_res->'answers' ? 'bogus'), 'save: drops unknown keys';
  assert jsonb_array_length(v_res->'answers'->'custom') = 1, 'save: drops empty custom rows';

  begin perform public.jt_copilot_save(v_tok, repeat('x', 12001), '{}'); raise exception 'long profile must fail';
  exception when sqlstate '22023' then null; end;
  begin perform public.jt_copilot_save(v_tok, 'p', '[]'); raise exception 'array answers must fail';
  exception when sqlstate '22023' then null; end;

  v_res := public.jt_copilot_take(v_tok)::jsonb;
  assert (v_res->>'used_today')::int = 1 and v_res->>'profile' = 'Clark profile', 'take: counts, returns profile';

  update jt_copilot_usage set count = 25 where user_id = public.jt_user_from_token(v_tok);
  begin perform public.jt_copilot_take(v_tok); raise exception 'take past cap must fail';
  exception when sqlstate 'JTCAP' then null; end;
  assert (public.jt_copilot_load(v_tok)::jsonb->>'used_today')::int = 25, 'cap: failed take does not count past 25';

  v_app := public.jt_save_application(v_tok, '{"title":"VA","url":"https://www.onlinejobs.ph/jobseekers/job/Some-VA-123/?utm=x#top","applied_on":"2026-11-16","source":"onlinejobsph"}');
  assert public.jt_find_application(v_tok, 'https://www.onlinejobs.ph/jobseekers/job/some-va-123') = v_app.id, 'find: same job, other spelling';
  assert public.jt_find_application(v_tok, 'https://www.onlinejobs.ph/jobseekers/job/other-9') is null, 'find: other job';

  begin perform public.jt_copilot_load('nope'); raise exception 'bad token must fail';
  exception when sqlstate '28000' then null; end;

  raise notice 'ALL PASS';
end $$;
rollback;
```

- [ ] **Step 2: Run it to verify it fails** (Clark's go-ahead, P2)

Run: `npx supabase db query --remote=cdlvlgtemdlhbvhihvle -f "BACKEND/JOB TRACKER/tests/copilot_test.sql"`
Expected: ERROR `function public.jt_copilot_load(text) does not exist`

- [ ] **Step 3: Implement section 7 in `schema.sql`** with the tables, helpers and RPCs from Interfaces. Usage day = `(now() at time zone 'Asia/Manila')::date`. In `jt_copilot_take`: check the profile is non-empty, then upsert-increment, then raise `JTCAP` when the new count > cap (the raise rolls back the increment). Keep the whole file safe to re-run (`if not exists`, `create or replace`).

- [ ] **Step 4: Apply the schema and run the test** (Clark's go-ahead)

Run: `npx supabase db query --remote=cdlvlgtemdlhbvhihvle -f "BACKEND/JOB TRACKER/schema.sql"`, then the Step 2 command.
Expected: no ERROR; NOTICE `ALL PASS` if notices are printed.

- [ ] **Step 5: Checkpoint**

---

### Task 2: Copilot core module (prompt, schema, cleaning, Gemini call)

**Files:**
- Create: `BACKEND/JOB TRACKER/supabase/functions/_shared/copilot.mjs` (no Deno globals, so Node can test it)
- Create: `BACKEND/JOB TRACKER/tests/copilot.test.mjs`

**Interfaces:**
- Produces (ES module exports):
  - `LIMITS = { JOB_TEXT_MIN: 80, JOB_TEXT_MAX: 15000, TITLE_MAX: 120, SUBJECT_MAX: 120, MESSAGE_MAX: 3000, FIT_REASON_MAX: 300, FLAG_MAX: 140, FLAGS_MAX: 5, ATTENTION_MAX: 200 }`
  - `DEFAULT_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite']`
  - `OLJ_SYSTEM_PROMPT: string`. It covers spec §6.5's prompt rules 1–7. It must contain the literal strings `paid VA client`, `120–220 words`, `untrusted`, and each banned phrase (`delve`, `thrilled`, `testament`, `seamless`, `leverage`, `passionate`, `I hope this message finds you well`, `I am excited to apply`).
  - `OLJ_SCHEMA`: Gemini `responseSchema` with required `job_title, fit_score (INTEGER), fit_reason, attention_check, red_flags (ARRAY of STRING), subject, message`.
  - `validateJob(job) → { ok: true, job: { title, url, site, text } } | { ok: false, error: string }`. Text is trimmed and must be ≥ `JOB_TEXT_MIN` characters; title/url/site are optional strings.
  - `buildOljPrompt({ profile, answers, job, now = new Date() }) → string`:
    - a `TODAY:` line (weekday + date in Asia/Manila);
    - a `PROFILE` block;
    - `ANSWER BANK` lines for non-empty answers only, as `Label: value`;
    - the job title/url;
    - the job text cut to `JOB_TEXT_MAX`, between `<<<JOB` and `JOB>>>`.
  - `cleanOljResult(raw) → { job_title, fit_score, fit_reason, attention_check, red_flags, subject, message }`:
    - strings trimmed and cut to `LIMITS`;
    - `fit_score` is a rounded integer clamped 0–100, and non-numbers become 0;
    - `red_flags` keeps at most `FLAGS_MAX` non-empty strings;
    - missing strings become `''`.
  - `class GeminiError extends Error`, constructed as `new GeminiError(message, status = 0, retryAfterSec = 0)` (same as ClarkFlow)
  - `callGemini({ apiKey, models, system, prompt, schema, fetchImpl = fetch, timeoutMs = 45000 }) → Promise<{ data: object, model: string }>`. It uses the same fallback rules as `BACKEND/CLARKFLOW 360/supabase/functions/_shared/gemini.ts` `triageEmail`:
    - 429/404/5xx/timeout/empty or unreadable answer → try the next model;
    - a 400 mentioning "thinking" → retry once without `thinkingConfig`;
    - any other 4xx → throw;
    - all failed → throw the last `GeminiError`;
    - when Google sends `retryDelay`, parse it into `retryAfterSec`.
    - Request: `temperature 0.4`, `responseMimeType 'application/json'`, `maxOutputTokens 4096`, `thinkingConfig { thinkingLevel: 'low' }`.
  - `geminiErrorBody(err) → { status, body }`: a 429 → `{ status: 503, body: { code: 'ai_busy', error: 'AI limit reached.', retry_after_sec } }`; anything else → `{ status: 502, body: { code: 'ai_failed', error: err.message } }`.
  - `rpcErrorBody({ code, message }) → { status, body }`: `28000` → 401 `signed_out`; `JTNOP` → 400 `no_profile`; `JTCAP` → 429 `daily_cap`; `22023` → 400 `bad_request`; else 500 `error`. The body is `{ code, error: message }`.

- [ ] **Step 1: Write the failing tests** `BACKEND/JOB TRACKER/tests/copilot.test.mjs`

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test "BACKEND/JOB TRACKER/tests/copilot.test.mjs"`
Expected: FAIL, `Cannot find module …copilot.mjs`

- [ ] **Step 3: Implement `copilot.mjs`** per Interfaces. Port the fallback loop from ClarkFlow's `gemini.ts`, taking `apiKey`, `models` and `fetchImpl` as parameters instead of `Deno.env`/global `fetch`.

- [ ] **Step 4: Run to verify it passes.** Same command. Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: Checkpoint**

---

### Task 3: Job Tracker "Copilot" tab

**Files:**
- Create: `FRONTEND/src/components/Clark VA 360 Job Tracker/copilotRules.js` (**no imports**, so Node can test it)
- Create: `FRONTEND/src/components/Clark VA 360 Job Tracker/copilotRules.test.js`
- Create: `FRONTEND/src/components/Clark VA 360 Job Tracker/Copilot.jsx`
- Modify: `jtApi.js` (two calls), `JobTracker.jsx` (TABS + render), `JobTracker.module.css` (Copilot styles, reusing `card`/`cardHead`/`muted` patterns)

**Interfaces:**
- Consumes: Task 1 RPCs `jt_copilot_load`, `jt_copilot_save`.
- Produces:
  - `api.copilotLoad() → Promise<{ profile, answers, used_today, daily_cap }>` and `api.copilotSave(profile, answers) → same`. Both go through `authed()`, so expiry throws `SessionExpiredError`.
  - `copilotRules.js`:
    - `PROFILE_MAX = 12000`, `CUSTOM_MAX = 30`;
    - `ANSWER_FIELDS: Array<{ key, label, hint, max }>` in this order: `first_name, portfolio_url, resume_url, rate, hours_per_week, schedule, start, internet, equipment, va_experience`;
    - `DEFAULT_ANSWERS = { portfolio_url: 'https://www.clarkva360.site', resume_url: 'https://www.clarkva360.site/files/Gemongala_Resume.pdf' }`;
    - `withDefaults(answers) → answers` fills only empty keys;
    - `cleanAnswers(answers) → answers` is the same rule as Task 1's `jt_copilot_clean_answers`.
  - `<Copilot notify={notify} fail={fail} />`: loads on mount and renders four cards: "Your profile" (textarea + `n / 12,000` count + Save), "Answer bank" (ANSWER_FIELDS + custom Q&A add/edit/delete), "Today" ("3 of 25 AI writes used"), and "Install the extension" (the 4 steps from spec §6.6).
  - New tab `{ id: 'copilot', label: 'Copilot', icon: Sparkles }`, placed after Bookmarks.

- [ ] **Step 1: Write the failing test** `copilotRules.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_FIELDS, CUSTOM_MAX, withDefaults, cleanAnswers } from './copilotRules.js';

test('answer fields, in order', () => {
  assert.deepEqual(ANSWER_FIELDS.map(f => f.key), ['first_name', 'portfolio_url', 'resume_url', 'rate', 'hours_per_week',
    'schedule', 'start', 'internet', 'equipment', 'va_experience']);
});
test('defaults fill only empty links', () => {
  assert.equal(withDefaults({ portfolio_url: '' }).portfolio_url, 'https://www.clarkva360.site');
  assert.equal(withDefaults({ resume_url: 'https://x.test/cv.pdf' }).resume_url, 'https://x.test/cv.pdf');
});
test('cleanAnswers mirrors the database rules', () => {
  const a = cleanAnswers({ first_name: '  Clark ', bogus: 1, custom: [{ question: 'Q', answer: 'A' }, { question: '', answer: 'x' }] });
  assert.equal(a.first_name, 'Clark');
  assert.equal('bogus' in a, false);
  assert.equal(a.custom.length, 1);
  const many = Array.from({ length: 40 }, (_, i) => ({ question: `q${i}`, answer: 'a' }));
  assert.equal(cleanAnswers({ custom: many }).custom.length, CUSTOM_MAX);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test "FRONTEND/src/components/Clark VA 360 Job Tracker/copilotRules.test.js"`
Expected: FAIL, module not found

- [ ] **Step 3: Implement `copilotRules.js`**, then `jtApi.js` calls, `Copilot.jsx`, the tab and CSS. Save sends `cleanAnswers(answers)`, then replaces state with the RPC's returned shape and calls `notify('ok', 'Copilot profile saved.')`. Errors go to `fail(err)`.

- [ ] **Step 4: Verify**
  - Run the Step 2 command → `# fail 0`.
  - Run `npx vite build` (in `FRONTEND`) → `✓ built`.
  - Manual (`npm run dev`, signed in as Clark, needs Task 1 live): save a profile + rate + 1 custom Q&A, reload the page, and confirm everything is still there. "Today" shows `0 of 25`.

- [ ] **Step 5: Hand-off for Clark: draft his profile text** (spec §6.4, one page, no phone number, says "no paid VA client yet") from the résumé PDF + `CLARK_VA_360_PORTFOLIO_SUMMARY.txt`. Give it to Clark in the chat to paste and save. **Don't commit it anywhere.**

- [ ] **Step 6: Checkpoint**

---

### Task 4: Edge Function `jt-copilot`

**Files:**
- Create: `BACKEND/JOB TRACKER/supabase/config.toml` (`project_id = "job-tracker"`, `[functions.jt-copilot] verify_jwt = true`, plus deploy notes copied in style from ClarkFlow's)
- Create: `BACKEND/JOB TRACKER/supabase/functions/jt-copilot/index.ts`
- Create: `BACKEND/JOB TRACKER/supabase/functions/_shared/http.ts` (copy `corsHeaders`, `json`, `requireEnv` from ClarkFlow's `_shared/http.ts`)
- Create: `BACKEND/JOB TRACKER/supabase/functions/deno-env.d.ts`, `tsconfig.json` (copy from ClarkFlow, for the editor)

**Interfaces:**
- Consumes: Task 1 `jt_copilot_take`; Task 2 `validateJob`, `buildOljPrompt`, `OLJ_SYSTEM_PROMPT`, `OLJ_SCHEMA`, `cleanOljResult`, `callGemini`, `DEFAULT_MODELS`, `geminiErrorBody`, `rpcErrorBody`.
- Produces HTTP API (used by Task 5):
  - `POST {SUPABASE_URL}/functions/v1/jt-copilot`, headers `apikey` + `Authorization: Bearer <anon key>`, body `{ token, mode: 'olj', job: { title, url, site, text } }`.
  - `200 { job_title, fit_score, fit_reason, attention_check, red_flags, subject, message, model, used_today, daily_cap }`
  - Errors `{ code, error, retry_after_sec? }`:
    - 400 `bad_request` (bad JSON, `mode` ≠ `'olj'`, `validateJob` failure)
    - 400 `no_profile`
    - 401 `signed_out`
    - 429 `daily_cap`
    - 503 `ai_busy`
    - 502 `ai_failed`
    - 500 `error`
  - `OPTIONS` → 204 with CORS.
- Flow:
  1. Create an anon-key client (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) and call `rpc('jt_copilot_take', { p_token: token })`. **No service-role key.**
  2. Models = `[Deno.env JT_COPILOT_MODEL, ...DEFAULT_MODELS]` de-duplicated.
  3. Call Gemini.
  4. Return `{ ...cleanOljResult(data), model, used_today, daily_cap }`.

- [ ] **Step 1: Implement `index.ts`, `config.toml` and the copied files.** There's no local Deno, so the wiring is tested live in Step 3 and the logic is already covered by Task 2. Re-run `node --test "BACKEND/JOB TRACKER/tests/copilot.test.mjs"` → `# fail 0`.

- [ ] **Step 2: Deploy** (Clark's go-ahead)

Run: `npx supabase functions deploy jt-copilot --workdir "BACKEND/JOB TRACKER" --project-ref cdlvlgtemdlhbvhihvle --use-api`
Expected: `Deployed Functions … jt-copilot`. If the bundler rejects the `.mjs` import, rename it to `copilot.js` and update the imports in both the function and the test.

- [ ] **Step 3: Live checks with curl.** Set `URL=https://cdlvlgtemdlhbvhihvle.supabase.co/functions/v1/jt-copilot` and `ANON` = `VITE_SUPABASE_ANON_KEY` from `FRONTEND/.env` (read it, don't print it).
  - `curl -s -X POST $URL -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -d '{"token":"nope","mode":"olj","job":{"text":"'"$(printf 'x%.0s' {1..100})"'"}}'` → `{"code":"signed_out",…}`, HTTP 401
  - The same with `"mode":"x"` → 400 `bad_request`
  - With Clark's real token (from the Job Tracker tab's `localStorage['jobtracker-session']`, which Clark copies) and a real OLJ job text → 200. Check:
    - `fit_score` is an integer 0–100;
    - `subject` is non-empty;
    - `message` contains `clarkva360.site`;
    - `used_today` went up by 1.

  This uses 1 of Clark's 25 writes and 1 Gemini request.

- [ ] **Step 4: Checkpoint**

---

### Task 5: Extension core — manifest, background worker, popup, helpers

**Files (all under `EXTENSION/JOB TRACKER COPILOT/`):**
- Create: `manifest.json`. MV3, name "Clark VA 360 Copilot".
  - `background.service_worker: "background.js"` (classic, **not** `type: module`)
  - `action.default_popup: "popup.html"`
  - `permissions: ["storage"]`
  - `host_permissions: ["https://*.onlinejobs.ph/*", "https://*.supabase.co/*"]`
  - no `content_scripts` yet (Task 6 adds them; listing missing files would stop Chrome from loading the extension)
- Create: `config.example.js` (`self.JTC_CONFIG = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '', JOB_TRACKER_URL: 'https://www.clarkva360.site/job-tracker' }`)
- Create: `config.js` (local copy with real values; gitignored)
- Create: `lib.js` (classic script; attaches `globalThis.JTC` and also sets `module.exports` when `module` exists)
- Create: `background.js` (`importScripts('config.js', 'lib.js')`)
- Create: `popup.html`, `popup.js`, `popup.css`
- Create: `test/lib.test.cjs`
- Modify: root `.gitignore`. Add `EXTENSION/JOB TRACKER COPILOT/config.js` and `EXTENSION/JOB TRACKER COPILOT/test/fixtures/real/`.

**Interfaces:**
- Produces `lib.js` (`JTC.*`):
  - `normalizeJobUrl(url) → string`: the **same rule as SQL `jt_norm_url`**.
  - `manilaToday(date = new Date()) → 'YYYY-MM-DD'`
  - `hasPlaceholder(text) → boolean` (matches `[…]` of 1–80 characters, no newline)
  - `pickJobText(captured, selection) → string | null`: the captured `.text` if ≥ 80 trimmed characters, otherwise the selection if ≥ 80, otherwise null.
  - `errorCode(httpStatus, body) → 'signed_out' | 'no_profile' | 'daily_cap' | 'ai_busy' | 'error'`: uses `body.code`, so both database codes (`28000`, `JTNOP`, `JTCAP`) and function codes (`signed_out`, `no_profile`, `daily_cap`, `ai_busy`) map.
  - `retryText(sec) → string`: "about 2h" for ≥ 3600 (hours rounded up), "about 5 min" otherwise.
- Produces background messages (`chrome.runtime.sendMessage`). All replies are `{ ok: true, … } | { ok: false, code, error, retryAfterSec? }`:
  - `{ type: 'signIn', username, password }` → `{ ok, username }`. It calls RPC `jt_sign_in` and stores `jtc_token` and `jtc_user` in `chrome.storage.local`.
  - `{ type: 'signOut' }` → calls `jt_sign_out` and clears storage.
  - `{ type: 'status' }` → `{ ok, signedIn, username, used_today, daily_cap }` (from `jt_copilot_load`)
  - `{ type: 'saveJob', job: { id, title, url, text } }` / `{ type: 'getJob', id }` → stored in `chrome.storage.session` under `job:<id>`.
  - `{ type: 'write', job }` → `{ ok, result }`, where `result` is the Task 4 200 body.
  - `{ type: 'log', title, url, source }` → `{ ok, id, duplicate }`. It calls `jt_find_application`; if nothing is found, it calls `jt_save_application` with `applied_on: manilaToday()`.
  - `{ type: 'unlog', id }` → calls `jt_delete_application`.
  - On `signed_out`, the worker clears the stored token before replying.
  - RPCs go through `POST {SUPABASE_URL}/rest/v1/rpc/<fn>` with `apikey` + `Authorization: Bearer <anon>`.

- [ ] **Step 1: Write the failing test** `test/lib.test.cjs`

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../lib.js');

test('normalizeJobUrl = SQL jt_norm_url (Review Focus 1)', () => {
  assert.equal(L.normalizeJobUrl('https://www.onlinejobs.ph/jobseekers/job/Some-VA-123/?utm=x#top'),
    'https://www.onlinejobs.ph/jobseekers/job/some-va-123');
});
test('manilaToday uses Philippine time', () => assert.equal(L.manilaToday(new Date('2026-11-16T17:30:00Z')), '2026-11-17'));
test('hasPlaceholder', () => {
  assert.equal(L.hasPlaceholder('I can start [confirm start date].'), true);
  assert.equal(L.hasPlaceholder('No brackets here.'), false);
});
test('pickJobText (Review Focus 4)', () => {
  const long = 'x'.repeat(80);
  assert.equal(L.pickJobText({ text: long }, ''), long);
  assert.equal(L.pickJobText(null, long), long);
  assert.equal(L.pickJobText({ text: 'short' }, 'also short'), null);
});
test('errorCode (Review Focus 2)', () => {
  assert.equal(L.errorCode(401, { code: 'signed_out' }), 'signed_out');
  assert.equal(L.errorCode(403, { code: '28000' }), 'signed_out');
  assert.equal(L.errorCode(400, { code: 'JTNOP' }), 'no_profile');
  assert.equal(L.errorCode(429, { code: 'daily_cap' }), 'daily_cap');
  assert.equal(L.errorCode(503, { code: 'ai_busy' }), 'ai_busy');
  assert.equal(L.errorCode(500, {}), 'error');
});
test('retryText', () => {
  assert.equal(L.retryText(3601), 'about 2h');
  assert.equal(L.retryText(240), 'about 4 min');
});
```

- [ ] **Step 2: Run to verify it fails.** Run: `node --test "EXTENSION/JOB TRACKER COPILOT/test/lib.test.cjs"`. Expected: FAIL, cannot find `../lib.js`.

- [ ] **Step 3: Implement** `lib.js`, then `background.js`, the popup, `manifest.json`, `config.example.js`/`config.js` and `.gitignore`. Popup states:
  - **signed out:** username + password form. Errors show the RPC message.
  - **signed in:** "Signed in as clark", "3 of 25 AI writes used today", an "Open Copilot settings" link (`JOB_TRACKER_URL`), and Sign out.

- [ ] **Step 4: Verify**
  - Step 2 command → `# fail 0`.
  - `git check-ignore "EXTENSION/JOB TRACKER COPILOT/config.js"` prints the path.
  - Manual (Clark): `chrome://extensions` → Developer mode → Load unpacked → no errors. Popup sign-in with his Job Tracker account shows the usage line, and Sign out returns to the form.

- [ ] **Step 5: Checkpoint**

---

### Task 6: OLJ content script, field finder and panel

**Precondition:** P1 (saved real pages). Read them first and note:
- the job-page and apply-page URL patterns;
- how the apply page refers to its job (to match the captured post);
- the label/field markup for Subject, Message, Contact Info, Apply Points and Send Email.

**Files (under `EXTENSION/JOB TRACKER COPILOT/`):**
- Create: `content/oljFields.js` (classic; `JTC.olj`; **no `chrome.*`**, so the harness can load it)
- Create: `content/panel.js`, `content/panel.css` (Shadow DOM; the CSS is loaded into the shadow root via `chrome.runtime.getURL` and listed in `web_accessible_resources`)
- Create: `content/olj.js` (wiring; the only file using `chrome.*`)
- Create: `test/harness.html`, `test/harness.js`
- Modify: `manifest.json`. Add `content_scripts` (`matches ["https://*.onlinejobs.ph/*"]`, `js ["lib.js", "content/oljFields.js", "content/panel.js", "content/olj.js"]`) and `web_accessible_resources` for `content/panel.css`.

**Interfaces:**
- Consumes: Task 5 `JTC.*` helpers and background messages.
- Produces `JTC.olj`:
  - `pageKind(loc: Location | URL) → 'job' | 'apply' | null`
  - `jobIdFrom(loc) → string | null`: the same id on the job page and its apply page.
  - `captureJobPost(root: ParentNode, loc) → { id, title, url, text } | null`
  - `findApplyForm(root: ParentNode) → { subject: HTMLInputElement | null, message: HTMLTextAreaElement | null, send: HTMLElement | null }`. It matches by **visible label text** (`SUBJECT`, `MESSAGE`, `SEND EMAIL`, case-insensitive) and never returns the Contact Info textarea or the Apply Points input.
  - `fillField(el, value)`: sets the value through the native value setter, then dispatches bubbling `input` and `change` events.
- Produces `JTC.panel.mount({ onWrite, onLogToggle }) → { set(state) }`. The states, with their exact copy:
  - `idle`: a **Write my application** button.
  - `working`: "Writing…"
  - `filled`, `{ result }`:
    - `Fit: 82/100` plus `fit_reason`;
    - `⚠ Code word: …` if `attention_check`;
    - `⚠ Red flag: …` for each red flag;
    - "✓ Subject and Message filled";
    - "You choose points, you click Send";
    - a log toggle "Log to Job Tracker", checked by default.
  - `copy`, `{ result }`: "Couldn't find the Subject/Message boxes. Copy the text below instead." plus both texts with Copy buttons.
  - `needText`: "Open the job post first, or highlight the job description and click again."
  - `error`, `{ code, error, retryAfterSec }`. Copy per code:
    - `signed_out` → "Sign in to the Copilot first (click the extension icon)."
    - `no_profile` → "Set up your Copilot profile in the Job Tracker first." plus a link to `JOB_TRACKER_URL`
    - `daily_cap` → the server message
    - `ai_busy` → "AI limit reached. Try again in " + `retryText(sec)` + "."
    - otherwise → "Something went wrong. Try again."
  - `toast`, `{ text, undo? }`: "Logged to Job Tracker." with **Undo**, or "Already in your Job Tracker."
- `olj.js` behaviour:
  - On a `job` page: `saveJob(captureJobPost(...))`.
  - On an `apply` page: mount the panel.
    1. On Write: `getJob(jobIdFrom)` → `pickJobText(captured, window.getSelection())`. If null → `needText` (no AI call). Otherwise `write` → fill both fields when found, else `copy`.
    2. Add a capture-phase click listener on `send`. If `hasPlaceholder(message.value)`, ask `confirm("There's still a [placeholder] in your message. Send anyway?")`, and cancel the click on No.
    3. If the toggle is on and both fields are non-empty → `log` with `source: 'onlinejobsph'`, title = the captured title or `result.job_title`, and URL = the job post URL. Show the toast; Undo → `unlog`. This logs on the Send click because OLJ's after-send page isn't in the saved pages. Task 7 checks whether a successful send can be detected instead (spec §6.7 prefers that).

- [ ] **Step 1: Write the failing harness.**
  - `test/harness.html` loads `../lib.js`, `../content/oljFields.js` and `harness.js`. It contains three `<template>`s whose markup is **copied from the saved real pages with personal data replaced by "Test User"**:
    - `apply`: the apply form, with Subject, Message, Contact Info, Apply Points and Send Email;
    - `apply-nolabels`: the same form with the label texts changed;
    - `job`: the job post.
  - `harness.js` clones each template into a div, runs the assertions below, and writes `<pre id="result">ALL PASS (n)</pre>`, or `FAIL: <name>` on the first failure.
  - Assertions (Review Focus 5):
    - `findApplyForm(apply)` → subject is an `INPUT`, message is a `TEXTAREA`, send is found;
    - the returned message is **not** the Contact Info textarea;
    - no field returned is the Apply Points input;
    - `findApplyForm(apply-nolabels)` → `subject === null && message === null`;
    - `fillField(message, 'Hello')` → value is `'Hello'` and an `input` listener fired once;
    - `captureJobPost(job, <saved job URL>)` → title non-empty, `text.length >= 80`;
    - `pageKind` returns `'job'` / `'apply'` / `null` for the two saved URLs and `https://www.onlinejobs.ph/`;
    - `jobIdFrom` matches across the two saved URLs.

- [ ] **Step 2: Run to verify it fails**

Run: `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --allow-file-access-from-files --user-data-dir="<scratchpad>/edge-test" --dump-dom "file:///C:/Users/clark/Downloads/WORK_VA/DIGITAL%20PORTFOLIO/Clark-VA-360/EXTENSION/JOB%20TRACKER%20COPILOT/test/harness.html" | grep -o 'ALL PASS ([0-9]*)\|FAIL:[^<]*'`
Expected: `FAIL: …` (or no result, because `JTC.olj` is undefined)

- [ ] **Step 3: Implement** `oljFields.js`, then `panel.js`/`panel.css`, `olj.js` and the manifest change. The panel is fixed to the bottom-right, sits above the page (z-index), and can be collapsed. All text goes in with `textContent`.

- [ ] **Step 4: Run the harness** → `ALL PASS (n)`. Also re-run Task 5's `node --test` → `# fail 0`.

- [ ] **Step 5: Checkpoint**

---

### Task 7: Live end-to-end on OLJ + documentation

**Files:**
- Modify: `CLARK_VA_360_PORTFOLIO_SUMMARY.txt`:
  - 5.7: a new "APPLY COPILOT" block;
  - §6 "IN-APP / BROWSER AUTOMATIONS": the Copilot line;
  - §7 Gemini table: a row `Job Tracker Apply Copilot | Edge fn jt-copilot | gemini-3.6-flash → 3.5-flash-lite`;
  - §8: add `jt-copilot` to the Edge Functions list, and add the extension under BACKEND as "Chrome extension (unpacked)".
- Modify: memory `job-tracker-apply-copilot.md` (status: Phase 1 shipped)

- [ ] **Step 1: Live checklist with Clark** (spec §7). On two real OLJ posts, with the extension reloaded:
  1. Open the job post, then the apply page → panel shows. Write → Subject and Message filled, with the code word in place if the post asks for one.
  2. Contact Info and Apply Points are unchanged; nothing was sent.
  3. Leave a `[placeholder]` in, click Send Email → the confirm dialog appears; No cancels the send.
  4. Send for real → toast "Logged to Job Tracker." The Job Tracker shows one new row (OnlineJobs.ph, today), and the daily-goal toast count moved.
  5. Re-open the same apply page and send again (or press Write + Send on a duplicate) → "Already in your Job Tracker.", no second row.
  6. Undo on a test send removes the row.
  7. Sign out in the popup → Write shows the sign-in message.
  8. The Copilot tab "Today" count matches the number of writes.
- [ ] **Step 2: Update the summary and memory** per Files. If Step 1 showed that OLJ's success page/message can be detected, note it as a follow-up (it would replace log-on-click + Undo).
- [ ] **Step 3: Final checks.** All three `node --test` files report `# fail 0`; the Task 6 harness reports `ALL PASS`; `npx vite build` passes.
- [ ] **Step 4: Checkpoint**, then ask Clark whether to start the Phase 2 ("Write here") spec → plan.
