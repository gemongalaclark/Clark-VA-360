/* Clark VA 360 Copilot — small helpers shared by the background worker and the content scripts.
   A classic script: in the extension it sets globalThis.JTC; under Node (tests) it's a CommonJS module.
   Test: node --test "EXTENSION/JOB TRACKER COPILOT/test/lib.test.cjs" */
(function (root) {
  const JOB_TEXT_MIN = 80;

  /* The same job link however it's spelled. Must match jt_norm_url in BACKEND/JOB TRACKER/schema.sql. */
  const normalizeJobUrl = (url) =>
    String(url ?? '').trim().toLowerCase().split('#')[0].split('?')[0].replace(/\/+$/, '');

  /* Today's date in the Philippines, 'YYYY-MM-DD' (the Job Tracker's applied_on). */
  const manilaToday = (date = new Date()) =>
    date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' });

  /* A [square-bracket placeholder] the AI left for the user to fill in. */
  const hasPlaceholder = (text) => /\[[^\]\n]{1,80}\]/.test(String(text ?? ''));

  /* The job text to send: what was captured from the job post, else the highlighted text. */
  function pickJobText(captured, selection) {
    const fromPost = String(captured?.text ?? '').trim();
    if (fromPost.length >= JOB_TEXT_MIN) return fromPost;
    const picked = String(selection ?? '').trim();
    return picked.length >= JOB_TEXT_MIN ? picked : null;
  }

  /* One name per thing the panel tells the user, from a database or Edge Function error body. */
  const CODES = {
    '28000': 'signed_out', signed_out: 'signed_out',
    JTNOP: 'no_profile', no_profile: 'no_profile',
    JTCAP: 'daily_cap', daily_cap: 'daily_cap',
    ai_busy: 'ai_busy',
  };
  const errorCode = (httpStatus, body) => CODES[body?.code] ?? 'error';

  /* "about 2h" / "about 4 min" for Gemini's retry wait. */
  function retryText(sec) {
    const s = Math.max(1, Number(sec) || 60);
    return s >= 3600 ? `about ${Math.ceil(s / 3600)}h` : `about ${Math.ceil(s / 60)} min`;
  }

  const api = { JOB_TEXT_MIN, normalizeJobUrl, manilaToday, hasPlaceholder, pickJobText, errorCode, retryText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JTC = Object.assign(root.JTC || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : self);
