/* Shared constants and pure helpers for BuhayVA Copilot (no React, no Supabase). */

export const PLATFORMS = ['OnlineJobs.ph', 'Upwork', 'Other'];
export const STATUSES = ['Analyzed', 'Applied', 'Interviewing', 'Offer', 'Archived'];
export const MAX_DESCRIPTION = 15000;
export const WEBHOOK_URL = import.meta.env.VITE_BV_MAKE_WEBHOOK_URL || '';

export const fitTone = (score) => (score == null ? 'none' : score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low');
export const hasAttentionCheck = (word) => !!word && !/^\s*none\s*$/i.test(word);
export const asList = (v) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : []);

export function detectPlatform(url = '') {
  if (/upwork\.com/i.test(url)) return 'Upwork';
  if (/onlinejobs\.ph/i.test(url)) return 'OnlineJobs.ph';
  return 'Other';
}

/* Only keep http(s) links; anything else (javascript:, data:) is dropped. */
export function safeUrl(url) {
  try {
    const u = new URL(String(url || '').trim());
    return /^https?:$/.test(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

/* First meaningful line of a job post, used as a provisional title until the AI extracts one. */
export function guessTitle(text = '') {
  const line = text.split('\n').map(l => l.trim()).find(l => l.length > 3) || 'Untitled job';
  return line.length > 110 ? `${line.slice(0, 107)}…` : line;
}

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
}

/* ── Bookmarklet ──────────────────────────────────────────────
   Runs on the Upwork / OLJ tab. It grabs the highlighted text (or the job description block,
   or the page), then opens this app with the job in the URL *fragment*. Fragments never reach a
   server, carry no secrets, and survive the cross-origin isolation Upwork uses, unlike postMessage. */
export function buildBookmarklet(origin) {
  const src = `(()=>{
const s=String(getSelection()).trim(),h=location.hostname;
const el=['[data-test="Description"]','[data-test="job-description-text"]','.job-description','#job-description','[class*="description"]','main','article']
.map(x=>document.querySelector(x)).find(e=>e&&e.innerText.trim().length>200);
const t=(s.length>80?s:(el||document.body).innerText).replace(/\\n{3,}/g,'\\n\\n').trim().slice(0,9000);
const d={p:/upwork/.test(h)?'Upwork':/onlinejobs/.test(h)?'OnlineJobs.ph':'Other',u:location.href,t:document.title,d:t};
window.open('${origin}/buhayva-copilot#ingest='+encodeURIComponent(JSON.stringify(d)),'_blank');
})()`;
  return `javascript:${src.replace(/\n/g, '')}`;
}

/* ── Incoming jobs from the bookmarklet ───────────────────────
   The job is stashed in localStorage so it survives a sign-in round trip (magic links open a
   new tab). It is only auto-analyzed when the referrer proves it came from Upwork / OLJ, so a
   random site can't link here and spend your AI quota. */
const INGEST_KEY = 'bv-copilot-ingest';
const INGEST_TTL = 30 * 60 * 1000;

export function readIngestFromHash() {
  const m = window.location.hash.match(/^#ingest=([\s\S]+)$/);
  if (!m) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  try {
    const d = JSON.parse(decodeURIComponent(m[1]));
    if (typeof d?.d !== 'string' || !d.d.trim()) return null;
    let trusted = false;
    try { trusted = /(^|\.)(upwork\.com|onlinejobs\.ph)$/i.test(new URL(document.referrer).hostname); } catch { /* no referrer */ }
    const jobUrl = safeUrl(d.u);
    const ingest = {
      platform: PLATFORMS.includes(d.p) ? d.p : detectPlatform(jobUrl),
      job_url: jobUrl,
      raw_description: d.d.slice(0, MAX_DESCRIPTION),
      autoRun: trusted,
    };
    try { localStorage.setItem(INGEST_KEY, JSON.stringify({ ...ingest, autoRun: false, at: Date.now() })); } catch { /* storage blocked */ }
    return ingest;
  } catch {
    return null;
  }
}

export function readStashedIngest() {
  try {
    const d = JSON.parse(localStorage.getItem(INGEST_KEY));
    if (d && Date.now() - d.at < INGEST_TTL) return d;
  } catch { /* ignore */ }
  return null;
}

export function clearStashedIngest() {
  try { localStorage.removeItem(INGEST_KEY); } catch { /* ignore */ }
}

/* Sample post for the "Load sample job" button, so the flow can be tried in seconds. */
export const SAMPLE_JOB = {
  platform: 'OnlineJobs.ph',
  job_url: 'https://www.onlinejobs.ph/jobseekers/job/1234567',
  raw_description: `Tech Virtual Assistant (Automation + Website Support)

We're a small e-commerce brand based in Austin and we're drowning in admin. We need a tech-savvy VA who can keep our Shopify store, email marketing and internal tools running smoothly.

What you'll do:
- Build and maintain automations in Make.com or Zapier (order alerts, CRM updates)
- Update our Shopify store and landing pages, light HTML/CSS edits
- Manage our Klaviyo email flows and weekly newsletter
- Keep our Google Sheets reports and Notion SOPs up to date
- Inbox and calendar management for the founder

Requirements:
- 2+ years as a VA, strong with Google Workspace
- Experience with Make.com or Zapier is a must
- Good written English, reliable internet

Pay: $6/hr, 40 hrs/week. Unpaid trial task first.

To show you read this, put the word PINEAPPLE in your subject line.`,
};
