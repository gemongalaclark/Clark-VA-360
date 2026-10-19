/* QuoteVelo AI: shared constants and pure helpers (no React, no network). */

export const STAGES = [
  { key: 'new', title: 'New Lead', hint: 'AI is reading the inquiry' },
  { key: 'scored', title: 'AI Scored & Drafted', hint: 'Waiting for your approval' },
  { key: 'sent', title: 'Proposal Sent', hint: 'Waiting on the client' },
  { key: 'won', title: 'Won', hint: 'Deal closed' },
];

export const SERVICES = [
  'Inbox & calendar management',
  'Social media management',
  'CRM setup & management',
  'Lead generation & outreach',
  'Workflow automation',
  'Website or landing page',
  'Something else',
];

/* `value` is a midpoint used only by the demo scorer. */
export const BUDGETS = [
  { label: 'Under $500', value: 250 },
  { label: '$500 – $1,500', value: 1000 },
  { label: '$1,500 – $5,000', value: 3250 },
  { label: '$5,000 – $15,000', value: 10000 },
  { label: '$15,000+', value: 20000 },
];

export const TIMELINES = [
  'ASAP (within 2 weeks)',
  'This month',
  '1 – 3 months',
  'Just exploring',
];

export const DECISION_OPTIONS = [
  'I make the final decision',
  'I need to run it by someone',
  'Gathering quotes for someone else',
];

export const LIMITS = { name: 120, email: 254, company: 160, scopeMin: 10, scope: 4000 };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const TAGS = ['High Priority', 'Standard', 'Low Budget'];

export const tagKey = (tag) => (tag === 'High Priority' ? 'hot' : tag === 'Standard' ? 'std' : 'low');

export const scoreTone = (score) => (score >= 70 ? 'good' : score >= 40 ? 'mid' : 'low');

export const initials = (s = '') =>
  s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

export const firstName = (s = '') => s.trim().split(/\s+/)[0] || 'there';

export function timeAgo(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function fmtDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return '–';
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

/* AI is still working when a lead is "new" and nothing has come back yet. */
export const isTriaging = (lead) => lead.status === 'new' && !lead.ai_error;

/* A lead the automation should have scored by now but hasn't (live mode safety net). */
export const isStuck = (lead, now = Date.now(), graceMs = 10 * 60 * 1000) =>
  lead.status === 'new' && !lead.ai_error && now - new Date(lead.created_at).getTime() > graceMs;

/* ── Demo-only: a transparent, rule-based stand-in for Gemini ─────────────
   Mirrors the scoring rubric in BACKEND/QUOTEVELO AI/activepieces/gemini-prompt.md so
   portfolio visitors can see the full pipeline without any API keys. */

const CORE = new Set(SERVICES.slice(0, 6));

const DELIVERABLES = {
  'Inbox & calendar management': ['Inbox triage with labels, filters and templated replies', 'Calendar management and meeting scheduling', 'Weekly summary of what needs your attention'],
  'Social media management': ['Content calendar and post scheduling', 'Branded graphics and captions', 'Monthly engagement and growth report'],
  'CRM setup & management': ['CRM build-out: pipeline stages, fields and tags', 'Contact import and de-duplication', 'Follow-up reminders and weekly pipeline hygiene'],
  'Lead generation & outreach': ['Ideal-customer list building and verification', 'Personalised outreach sequences', 'Reply handling and meeting booking'],
  'Workflow automation': ['Process mapping and automation plan', 'Build and test of the agreed workflows', 'Handover documentation and a walkthrough'],
  'Website or landing page': ['Page structure and copy review', 'Responsive build with a lead-capture form', 'Launch checklist and basic analytics'],
  'Something else': ['Discovery call to define the exact scope', 'A written plan with milestones', 'Delivery and a check-in after launch'],
};

const INVESTMENT = [
  'a focused starter engagement, roughly $250 – $500',
  'roughly $500 – $1,500, depending on final scope',
  'roughly $1,500 – $5,000, billed in milestones',
  'roughly $5,000 – $15,000, with a phased plan',
  'a custom retainer, scoped after a discovery call',
];

const wordCount = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function demoTriage(lead) {
  const budgetIdx = Math.max(0, BUDGETS.findIndex(b => b.label === lead.budget_range));
  const timelineIdx = Math.max(0, TIMELINES.indexOf(lead.timeline));

  const budgetPts = [6, 16, 28, 36, 40][budgetIdx];
  const scopePts = Math.min(25, Math.round(wordCount(lead.project_scope) * 0.7));
  const urgencyPts = Math.min(20, [17, 14, 9, 3][timelineIdx] + (lead.extra?.decision_maker === DECISION_OPTIONS[0] ? 3 : 0));
  const fitPts = CORE.has(lead.service_type) ? 15 : 8;

  const score = Math.max(1, Math.min(100, budgetPts + scopePts + urgencyPts + fitPts));
  const tag = budgetIdx === 0 ? 'Low Budget' : score >= 70 ? 'High Priority' : score >= 40 ? 'Standard' : 'Low Budget';

  const who = lead.company ? `${lead.full_name} at ${lead.company}` : lead.full_name;
  const summary = [
    `${who} wants help with ${lead.service_type.toLowerCase()}.`,
    `Budget ${lead.budget_range}, timeline “${lead.timeline.toLowerCase()}”. ${
      budgetIdx >= 3 ? 'Budget looks healthy for this scope.' : budgetIdx === 0 ? 'Budget is thin for most engagements.' : 'Budget is workable if scope stays tight.'}`,
    wordCount(lead.project_scope) < 18
      ? 'Risk: the brief is vague. Confirm deliverables before quoting firmly.'
      : timelineIdx === 0 ? 'Opportunity: urgent start, so a fast reply likely wins the deal.' : 'Opportunity: clear brief, so a tailored proposal should land well.',
  ];

  const name = firstName(lead.full_name);
  const deliverables = DELIVERABLES[lead.service_type] || DELIVERABLES['Something else'];
  const proposal = [
    `SCOPE OF WORK: ${lead.service_type}`,
    '',
    'Overview',
    `- Prepared for ${who}.`,
    `- Goal in your words: “${clip(lead.project_scope.replace(/\s+/g, ' '), 220)}”`,
    '',
    'Deliverables',
    ...deliverables.map(d => `- ${d}`),
    '',
    'Timeline',
    `- Requested start: ${lead.timeline}.`,
    '- Week 1: kickoff call, access and discovery. Weeks 2+: delivery in agreed milestones.',
    '',
    'Investment',
    `- Based on your ${lead.budget_range} budget: ${INVESTMENT[budgetIdx]}.`,
    '',
    'Next Steps',
    '- Reply to confirm, or book a 15-minute call to fine-tune the scope.',
    '- On approval you receive a simple agreement and a kickoff date.',
  ].join('\n');

  const email_subject = `Your project proposal${lead.company ? `, ${lead.company}` : ''}`;
  const email_body = [
    `Hi ${name},`,
    '',
    `Thank you for reaching out about ${lead.service_type.toLowerCase()}. It sounds like the goal is clear: ${clip(lead.project_scope.replace(/\s+/g, ' '), 110)}`,
    '',
    'I have put together a scope-of-work proposal based on your budget and timeline. The full document is linked below.',
    '',
    'Would a 15-minute call this week work to walk through it and answer any questions?',
    '',
    'Best,',
    'Clark',
  ].join('\n');

  return { score, tag, summary, proposal, email_subject, email_body };
}
