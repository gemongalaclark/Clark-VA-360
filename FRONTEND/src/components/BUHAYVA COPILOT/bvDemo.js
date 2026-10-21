import { guessTitle, SAMPLE_JOB } from './bvData';

/* In-browser demo backend: same interface as the live API in bvApi.js, so portfolio visitors can
   try the whole flow without an account. Instead of Gemini it runs a small rule-based analyzer,
   which is good enough to show the scoring, attention-check and pitch features. */

const KEY = 'buhayva_copilot_demo_v1';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const wait = (ms = 220) => new Promise(r => setTimeout(r, ms));
const ago = (h) => new Date(Date.now() - h * 3_600_000).toISOString();

const DEMO_PROFILE = {
  id: 'demo-profile',
  full_name: 'Alex Santos',
  target_niches: 'Tech Virtual Assistant, Automation Specialist, Web Developer',
  hourly_rate_min: 8,
  portfolio_links: 'https://clarkva360.example/portfolio',
  resume_text: `Tech Virtual Assistant with 3 years of experience supporting e-commerce and coaching businesses.
- Built 40+ Make.com and Zapier automations: order alerts, CRM syncing, lead routing, invoice reminders.
- Maintain Shopify and WordPress sites: product uploads, landing pages, HTML/CSS fixes.
- Built React + Supabase web apps (client portal, task tracker) deployed on Vercel.
- Run Klaviyo and Mailchimp email flows; weekly newsletters with 30%+ open rates.
- Google Workspace power user: Google Sheets dashboards, Gmail filters, calendar management.
- Document SOPs in Notion; manage projects in ClickUp, Trello and Asana.
- Social media scheduling with Canva, Buffer and Meta Business Suite.`,
  updated_at: ago(30),
};

/* name → pattern. Patterns avoid bare common words ("make", "excel" as a verb is fine). */
const SKILLS = [
  ['React', /\breact(\.js)?\b/i], ['JavaScript', /\b(javascript|js)\b/i], ['TypeScript', /\btypescript\b/i],
  ['Node.js', /\bnode(\.js)?\b/i], ['Supabase', /\bsupabase\b/i], ['SQL', /\b(sql|postgres(ql)?|mysql)\b/i],
  ['Python', /\bpython\b/i], ['HTML/CSS', /\b(html|css)\b/i], ['WordPress', /\bwordpress\b/i],
  ['Shopify', /\bshopify\b/i], ['Webflow', /\bwebflow\b/i], ['Wix', /\bwix\b/i], ['Figma', /\bfigma\b/i],
  ['Canva', /\bcanva\b/i], ['Make.com', /\b(make\.com|integromat)\b/i], ['Zapier', /\bzapier\b/i],
  ['n8n', /\bn8n\b/i], ['GoHighLevel', /\b(gohighlevel|go high level|ghl)\b/i], ['HubSpot', /\bhubspot\b/i],
  ['Salesforce', /\bsalesforce\b/i], ['Google Workspace', /\b(google workspace|g ?suite)\b/i],
  ['Google Sheets', /\b(google sheets|spreadsheets?)\b/i], ['Excel', /\b(ms )?excel\b/i],
  ['Microsoft 365', /\b(microsoft|ms|office) ?365\b/i], ['Notion', /\bnotion\b/i], ['Trello', /\btrello\b/i],
  ['Asana', /\basana\b/i], ['ClickUp', /\bclickup\b/i], ['Slack', /\bslack\b/i], ['Calendly', /\bcalendly\b/i],
  ['Klaviyo', /\bklaviyo\b/i], ['Mailchimp', /\bmailchimp\b/i], ['Email marketing', /\b(email marketing|newsletters?|email flows?)\b/i],
  ['Social media', /\b(social media|instagram|facebook|tiktok)\b/i], ['Meta Business Suite', /\bmeta (business )?suite\b/i],
  ['Buffer', /\bbuffer\b/i], ['Lead generation', /\b(lead gen(eration)?|prospecting)\b/i], ['LinkedIn', /\blinkedin\b/i],
  ['Apollo', /\bapollo(\.io)?\b/i], ['Cold email', /\bcold (email|outreach)\b/i], ['Customer support', /\b(customer (support|service)|helpdesk|zendesk)\b/i],
  ['Data entry', /\bdata entry\b/i], ['Bookkeeping', /\b(bookkeeping|quickbooks|xero)\b/i],
  ['Calendar management', /\bcalendar\b/i], ['Inbox management', /\b(inbox|email management)\b/i],
  ['Copywriting', /\bcopywriting\b/i], ['SEO', /\bseo\b/i], ['AI tools', /\b(chatgpt|gemini|claude|ai tools?)\b/i],
  ['Vercel', /\bvercel\b/i], ['SOPs', /\b(sops?|standard operating)\b/i], ['CRM', /\bcrm\b/i],
];

/* Skills found in the text, ordered by first mention (clients list what matters most first). */
const skillsIn = (text) => SKILLS
  .map(([name, re]) => [name, text.search(re)])
  .filter(([, at]) => at >= 0)
  .sort((a, b) => a[1] - b[1])
  .map(([name]) => name);

function findAttentionCheck(text) {
  const patterns = [
    /(?:put|write|include|type|add|use|mention|start (?:your \w+ )?with|begin (?:your \w+ )?with)\s+(?:the\s+(?:word|phrase|code(?:\s*word)?)\s+)?["“'‘]([^"”'’\n]{2,40})["”'’]/i,
    /(?:word|phrase|code\s*word)\s+["“']?([A-Za-z0-9-]{3,30})["”']?\s+(?:in|at|on)\s+(?:the\s+|your\s+)?(?:subject|top|beginning|start|first)/i,
    /(?:put|write|type|include)\s+(?:the\s+word\s+)?([A-Z][A-Z0-9-]{2,24})\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  const math = text.match(/answer[^.\n]{0,30}?(\d+)\s*([+x*-])\s*(\d+)/i);
  if (math) {
    const [a, op, b] = [Number(math[1]), math[2], Number(math[3])];
    return String(op === '+' ? a + b : op === '-' ? a - b : a * b);
  }
  return 'None';
}

function findRedFlags(text, profile, missing) {
  const flags = [];
  const hourly = [...text.matchAll(/\$\s?(\d+(?:\.\d+)?)\s*(?:\/|per\s*)\s*(?:hr|hour)/gi)].map(m => Number(m[1]));
  const monthly = [...text.matchAll(/\$\s?([\d,]+)\s*(?:\/|per\s*|a\s*)\s*month/gi)].map(m => Number(m[1].replace(/,/g, '')) / 160);
  const rate = Math.max(...hourly, ...monthly, 0);
  const min = Number(profile.hourly_rate_min) || 0;
  if (rate > 0 && rate < min) flags.push(`Pay looks low: about $${rate.toFixed(2)}/hr, under your $${min}/hr minimum.`);
  if (/unpaid (trial|test)/i.test(text)) flags.push('Asks for an unpaid trial or test task.');
  if (/24\/7|available at all times|always on call/i.test(text)) flags.push('Expects round-the-clock availability.');
  if (/unlimited revisions/i.test(text)) flags.push('Promises "unlimited revisions", a scope-creep warning sign.');
  if (/(registration|training|starter) fee|pay (a|the) (fee|deposit)/i.test(text)) flags.push('Mentions a fee or deposit from the applicant. Possible scam.');
  if (/(telegram|whatsapp)/i.test(text)) flags.push('Wants to move the chat off-platform early.');
  if (missing.length) flags.push(`Not on your resume yet: ${missing.slice(0, 4).join(', ')}.`);
  return flags;
}

/* Resume line that best backs up a skill, for the pitch bullets. */
function proofFor(skill, resume) {
  const re = SKILLS.find(([n]) => n === skill)?.[1];
  const line = resume.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).find(l => re?.test(l));
  return line ? line.replace(/\.$/, '') : null;
}

export function analyzeLocally(job, profile) {
  const text = job.raw_description;
  const jobSkills = skillsIn(text);
  const mine = new Set(skillsIn(`${profile.resume_text}\n${profile.target_niches}`));
  const matching = jobSkills.filter(s => mine.has(s));
  const missing = jobSkills.filter(s => !mine.has(s));
  const attention = findAttentionCheck(text);
  const redFlags = findRedFlags(text, profile, missing);

  const coverage = jobSkills.length ? matching.length / jobSkills.length : 0.5;
  const nicheHit = profile.target_niches.split(',').some(n => n.trim() && text.toLowerCase().includes(n.trim().toLowerCase().split(' ')[0]));
  const fit = Math.round(Math.min(98, Math.max(5, 30 + coverage * 62 + (nicheHit ? 6 : 0) - Math.min(3, redFlags.length - (missing.length ? 1 : 0)) * 4)));

  const title = guessTitle(text);
  const top = matching.slice(0, 2).join(' and ') || 'the day-to-day admin';
  const bullets = [...new Set(matching.map(s => proofFor(s, profile.resume_text) || `Hands-on experience with ${s}`))]
    .slice(0, 3)
    .map(l => `• ${l}.`);
  if (!bullets.length) bullets.push('• I learn new tools fast and document everything as I go, so nothing lives only in my head.');

  const hasCode = attention !== 'None';
  const pitch = [
    `${hasCode ? `${attention}. ` : ''}You need someone who can own ${top} without hand-holding, and that's the work I do every day.`,
    '',
    'A few things I can bring from day one:',
    ...bullets,
    '',
    `Quick question so I can hit the ground running: which part of ${matching[0] || 'your workflow'} is eating the most of your week right now?`,
    '',
    profile.full_name,
    profile.portfolio_links?.split(/[\s,]+/)[0] || '',
  ].join('\n').trim();

  return {
    job_title: title,
    company_or_client: 'Unknown',
    fit_score: fit,
    attention_check_word: attention,
    red_flags: redFlags,
    matching_skills: matching,
    subject_line: `${hasCode ? `${attention} | ` : ''}${title.replace(/…$/, '')}: ${profile.full_name}`,
    tailored_pitch: pitch,
  };
}

function seed() {
  const base = { company_or_client: 'Unknown', notes: '', analysis_error: null };
  const analyzed = { ...base, id: uid(), platform: SAMPLE_JOB.platform, job_url: SAMPLE_JOB.job_url,
    raw_description: SAMPLE_JOB.raw_description, status: 'Applied', applied_at: ago(20), created_at: ago(26),
    analysis_state: 'done', ...analyzeLocally(SAMPLE_JOB, DEMO_PROFILE) };
  const upwork = `Senior Salesforce Administrator needed

We're looking for a certified Salesforce admin to rebuild our sales pipeline, write Apex triggers and migrate 200k records from HubSpot.
Must have 5+ years of Salesforce experience and be available 24/7 for urgent issues.
Budget: $5/hr fixed. Unlimited revisions until we're happy.`;
  const low = { ...base, id: uid(), platform: 'Upwork', job_url: 'https://www.upwork.com/jobs/~0123456789abcdef',
    raw_description: upwork, status: 'Archived', applied_at: null, created_at: ago(50),
    analysis_state: 'done', ...analyzeLocally({ raw_description: upwork }, DEMO_PROFILE) };
  return { profile: DEMO_PROFILE, jobs: [analyzed, low] };
}

let cache = null;
function read() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY)); } catch { cache = null; }
  if (!cache?.jobs) cache = seed();
  return cache;
}
function write() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage full or blocked: keep in memory */ }
}

export function resetDemo() {
  cache = seed();
  write();
}

export const demoApi = {
  async getProfile() { await wait(); return read().profile; },

  async saveProfile(fields) {
    await wait();
    read().profile = { ...read().profile, ...fields, updated_at: new Date().toISOString() };
    write();
    return read().profile;
  },

  async listJobs() {
    await wait();
    return [...read().jobs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createJob(fields) {
    await wait(120);
    const job = {
      id: uid(), company_or_client: null, fit_score: null, attention_check_word: 'None', red_flags: [],
      matching_skills: [], subject_line: null, tailored_pitch: null, status: 'Analyzed', notes: '',
      analysis_state: 'pending', analysis_error: null, applied_at: null, created_at: new Date().toISOString(),
      ...fields,
    };
    read().jobs.unshift(job);
    write();
    return job;
  },

  async analyzeJob(job) {
    await wait(1400);   // feel like a real model call
    const done = { ...job, ...analyzeLocally(job, read().profile), analysis_state: 'done', analysis_error: null };
    read().jobs = read().jobs.map(j => (j.id === job.id ? done : j));
    write();
    return done;
  },

  async updateJob(id, patch) {
    await wait(80);
    let updated = null;
    read().jobs = read().jobs.map(j => {
      if (j.id !== id) return j;
      updated = { ...j, ...patch };
      if (patch.status === 'Applied' && !j.applied_at) updated.applied_at = new Date().toISOString();
      return updated;
    });
    write();
    return updated;
  },

  async deleteJob(id) {
    await wait(80);
    read().jobs = read().jobs.filter(j => j.id !== id);
    write();
  },
};
