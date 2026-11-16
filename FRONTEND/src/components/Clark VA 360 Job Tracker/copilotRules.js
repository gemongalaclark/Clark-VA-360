/* Apply Copilot answer bank: the fields, their defaults, and the cleaning rule.
   No imports, so Node can test it (copilotRules.test.js).
   cleanAnswers must match jt_copilot_clean_answers in BACKEND/JOB TRACKER/schema.sql. */

export const PROFILE_MAX = 12000;
export const CUSTOM_MAX = 30;
const Q_MAX = 300;
const A_MAX = 1000;

export const ANSWER_FIELDS = [
  { key: 'first_name', label: 'First name', hint: 'Used to sign off each application.', max: 40 },
  { key: 'portfolio_url', label: 'Portfolio link', hint: 'Added under your name.', max: 500 },
  { key: 'resume_url', label: 'Résumé link', hint: 'OnlineJobs.ph can’t attach files, so the pitch links it.', max: 500 },
  { key: 'rate', label: 'Rate', hint: 'e.g. $5/hr or ₱35,000/month. Only used when a post asks.', max: 500 },
  { key: 'hours_per_week', label: 'Hours per week', hint: 'e.g. 40 (full time)', max: 500 },
  { key: 'schedule', label: 'Schedule and time zone', hint: 'e.g. US hours, Philippine night shift is fine', max: 500 },
  { key: 'start', label: 'Can start', hint: 'e.g. Immediately, or 1 week notice', max: 500 },
  { key: 'internet', label: 'Internet', hint: 'Speed and your backup', max: 500 },
  { key: 'equipment', label: 'Equipment', hint: 'Computer, headset, quiet workspace', max: 500 },
  { key: 'va_experience', label: 'VA experience', hint: 'One honest line, e.g. VA training at The VA Bar; no paid VA client yet', max: 500 },
];

export const DEFAULT_ANSWERS = {
  portfolio_url: 'https://www.clarkva360.site',
  resume_url: 'https://www.clarkva360.site/files/Gemongala_Resume.pdf',
};

/* Fills only the keys that are empty. */
export function withDefaults(answers = {}) {
  const out = { ...answers };
  for (const [key, value] of Object.entries(DEFAULT_ANSWERS)) {
    if (!String(out[key] ?? '').trim()) out[key] = value;
  }
  return out;
}

const trimmed = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

/* Known fields only, trimmed, empties dropped; custom rows need both a question and an answer.
   Too-long values are cut here (the database would reject them). */
export function cleanAnswers(answers = {}) {
  const out = {};
  for (const { key, max } of ANSWER_FIELDS) {
    const value = trimmed(answers[key]).slice(0, max);
    if (value) out[key] = value;
  }
  const custom = (Array.isArray(answers.custom) ? answers.custom : [])
    .map(qa => ({ question: trimmed(qa?.question).slice(0, Q_MAX), answer: trimmed(qa?.answer).slice(0, A_MAX) }))
    .filter(qa => qa.question && qa.answer)
    .slice(0, CUSTOM_MAX);
  if (custom.length) out.custom = custom;
  return out;
}
