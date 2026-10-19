import { demoTriage, DECISION_OPTIONS } from './qvData';

/* In-browser demo backend: same interface as the Supabase API in qvApi.js, so portfolio visitors
   can submit a real inquiry and watch it move through the whole pipeline with no account.
   The "AI" here is the rule-based stand-in in qvData.js; live mode uses Gemini via Activepieces.
   State lives in localStorage. */

const KEY = 'quotevelo_demo_v1';
const EVENT = 'qv-demo-change';
const MIN = 60_000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const wait = (ms = 200) => new Promise(r => setTimeout(r, ms));

export const TRIAGE_DELAY = 3200;   // how long the demo "Gemini" takes, so the drafting state is visible
const SEND_DELAY = 1800;

const pending = new Set();          // lead ids with a triage/send timer already running (this tab)

function lead(over, minsAgo) {
  return {
    id: uid(), company: '', extra: {}, status: 'new', ai_score: null, ai_tag: null, ai_summary: null,
    ai_proposal: null, ai_email_subject: null, ai_email_body: null, proposal_doc_url: null, ai_error: null,
    scored_at: null, send_requested_at: null, sent_at: null,
    created_at: ago(minsAgo * MIN), updated_at: ago(minsAgo * MIN), ...over,
  };
}

/* Builds a lead that the "AI" already processed (seed data). demoTriage uses short field names;
   rows use the ai_* column names. */
function asRow(l, minsAgo, extra = {}) {
  const ai = demoTriage(l);
  return {
    ...l, status: 'scored', ai_score: ai.score, ai_tag: ai.tag, ai_summary: ai.summary, ai_proposal: ai.proposal,
    ai_email_subject: ai.email_subject, ai_email_body: ai.email_body, scored_at: ago((minsAgo - 0.4) * MIN), ...extra,
  };
}

function seed() {
  const dm = DECISION_OPTIONS[0];
  const rows = [
    asRow(lead({
      full_name: 'Dana Whitfield', email: 'dana@harborlaw.example', company: 'Harbor & Finch Law',
      service_type: 'Inbox & calendar management', budget_range: '$1,500 – $5,000', timeline: 'ASAP (within 2 weeks)',
      project_scope: 'Our two partners lose about ten hours a week to email and scheduling. We need someone to triage client emails, manage three calendars, send reminders and keep a weekly summary of open matters in Notion.',
      extra: { decision_maker: dm, heard_from: 'Referral' },
    }, 42), 41),
    asRow(lead({
      full_name: 'Marcus Oyelaran', email: 'marcus@brightpath.example', company: 'BrightPath Logistics',
      service_type: 'Workflow automation', budget_range: '$5,000 – $15,000', timeline: 'This month',
      project_scope: 'We want to automate quote requests, driver onboarding paperwork and invoice reminders across HubSpot, Google Sheets and Slack. About 40 shipments per day, currently all manual copy and paste between tools.',
      extra: { decision_maker: dm, heard_from: 'LinkedIn' },
    }, 130), 129),
    asRow(lead({
      full_name: 'Priya Natarajan', email: 'priya@northwind.example', company: 'Northwind Coffee',
      service_type: 'Social media management', budget_range: '$500 – $1,500', timeline: '1 – 3 months',
      project_scope: 'Looking for someone to run Instagram and TikTok for our three cafés: weekly content calendar, reels editing and replying to comments.',
      extra: { decision_maker: DECISION_OPTIONS[1], heard_from: 'Google' },
    }, 300), 299),
    asRow(lead({
      full_name: 'Tom Becker', email: 'tom@example.com', company: '',
      service_type: 'Something else', budget_range: 'Under $500', timeline: 'Just exploring',
      project_scope: 'Not sure yet, maybe help with some admin stuff.',
      extra: { decision_maker: DECISION_OPTIONS[2], heard_from: 'Other' },
    }, 520), 519),
    asRow(lead({
      full_name: 'Aisha Rahman', email: 'aisha@lumenrealty.example', company: 'Lumen Realty',
      service_type: 'CRM setup & management', budget_range: '$1,500 – $5,000', timeline: 'This month',
      project_scope: 'Move 1,200 leads from spreadsheets into a CRM, set up pipeline stages for buyers and sellers, and build follow-up reminders so no inquiry goes cold for more than two days.',
      extra: { decision_maker: dm, heard_from: 'Referral' },
    }, 1500), 1499, { status: 'sent', send_requested_at: ago(1380 * MIN), sent_at: ago(1379 * MIN) }),
    asRow(lead({
      full_name: 'Jordan Rivera', email: 'jordan@maplebakery.example', company: 'Maple & Co. Bakery',
      service_type: 'Lead generation & outreach', budget_range: '$5,000 – $15,000', timeline: 'ASAP (within 2 weeks)',
      project_scope: 'Wholesale push: find and contact 300 cafés and grocers in the region, run a three-step email sequence, and book tasting calls for our owner each week.',
      extra: { decision_maker: dm, heard_from: 'Referral' },
    }, 4000), 3999, { status: 'won', send_requested_at: ago(3900 * MIN), sent_at: ago(3899 * MIN) }),
  ];
  return rows;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to seed */ }
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(rows) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* storage blocked: demo still works for this session */ }
  window.dispatchEvent(new Event(EVENT));
}

export function resetDemo() {
  pending.clear();
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  write(seed());
}

function patch(id, fields) {
  const rows = read();
  const i = rows.findIndex(r => r.id === id);
  if (i < 0) return null;
  rows[i] = { ...rows[i], ...fields, updated_at: new Date().toISOString() };
  write(rows);
  return rows[i];
}

/* Plays the role of Activepieces Flow 1: after a short delay, score + draft the lead. */
function scheduleTriage(id) {
  if (pending.has(id)) return;
  pending.add(id);
  setTimeout(() => {
    pending.delete(id);
    const l = read().find(r => r.id === id);
    if (!l || l.status !== 'new') return;
    const ai = demoTriage(l);
    patch(id, {
      status: 'scored', ai_score: ai.score, ai_tag: ai.tag, ai_summary: ai.summary, ai_proposal: ai.proposal,
      ai_email_subject: ai.email_subject, ai_email_body: ai.email_body, scored_at: new Date().toISOString(),
    });
  }, TRIAGE_DELAY);
}

/* Plays the role of Flow 2: "send" the Gmail message and move the lead to Proposal Sent. */
function scheduleSend(id) {
  const key = `send:${id}`;
  if (pending.has(key)) return;
  pending.add(key);
  setTimeout(() => {
    pending.delete(key);
    patch(id, { status: 'sent', sent_at: new Date().toISOString() });
  }, SEND_DELAY);
}

export const demoApi = {
  async submitLead(input) {
    await wait(350);
    const row = lead({ ...input }, 0);
    write([row, ...read()]);
    scheduleTriage(row.id);
    return row.id;
  },

  async listLeads() {
    await wait(120);
    const rows = read();
    rows.filter(r => r.status === 'new').forEach(r => scheduleTriage(r.id));
    rows.filter(r => r.status === 'scored' && r.send_requested_at).forEach(r => scheduleSend(r.id));
    return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  subscribe(onChange) {
    const handler = () => onChange();
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);      // other tab on the same origin
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  },

  async updateLead(id, fields) {
    await wait(150);
    return patch(id, fields);
  },

  async sendProposal(l) {
    await wait(250);
    patch(l.id, { send_requested_at: new Date().toISOString() });
    scheduleSend(l.id);
  },

  async deleteLead(id) {
    await wait(120);
    write(read().filter(r => r.id !== id));
  },
};
