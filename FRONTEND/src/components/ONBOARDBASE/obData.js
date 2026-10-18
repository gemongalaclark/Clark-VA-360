/* Shared constants + pure helpers for OnboardBase. No React, no network. */

export const STALLED_AFTER_DAYS = 3;
const DAY = 86_400_000;

/* Mirrors ob_create_default_steps() in BACKEND/ONBOARDBASE/schema.sql (used by demo mode). */
export const STEP_TEMPLATE = [
  { step_key: 'contract',     step_name: 'Sign Contract',        description: 'Review and sign the service agreement.' },
  { step_key: 'brand_assets', step_name: 'Upload Brand Assets',  description: 'Drop in your logo, headshots and brand guidelines.' },
  { step_key: 'intake',       step_name: 'Complete Intake Form', description: 'Tell us about your business, goals and tools.' },
  { step_key: 'kickoff',      step_name: 'Book Kickoff Call',    description: 'Pick a time so we can walk through the plan together.' },
  { step_key: 'review',       step_name: 'Final Review',         description: 'We confirm everything is in place and switch your project on.' },
];

export const INTAKE_SECTIONS = [
  {
    title: 'Your business',
    blurb: 'The basics, so we know who we are working with.',
    fields: [
      { key: 'business_name', label: 'Business name', type: 'text', required: true },
      { key: 'website', label: 'Website', type: 'text', placeholder: 'https://' },
      { key: 'industry', label: 'Industry', type: 'text', required: true, placeholder: 'e.g. Coffee retail, Real estate' },
      { key: 'team_size', label: 'Team size', type: 'select', options: ['Just me', '2–5', '6–20', '21–50', '50+'] },
    ],
  },
  {
    title: 'Brand & voice',
    blurb: 'How your brand should look and sound when we speak for you.',
    fields: [
      { key: 'audience', label: 'Who is your ideal customer?', type: 'textarea', required: true },
      { key: 'brand_voice', label: 'Describe your brand voice', type: 'textarea', placeholder: 'Friendly, expert, playful…' },
      { key: 'brand_colors', label: 'Brand colors', type: 'text', placeholder: '#CB2525, charcoal, cream' },
      { key: 'competitors', label: 'Competitors or accounts you admire', type: 'textarea' },
    ],
  },
  {
    title: 'Goals & scope',
    blurb: 'What success looks like and where we should start.',
    fields: [
      { key: 'top_goals', label: 'Top goals for the next 90 days', type: 'textarea', required: true },
      {
        key: 'priority_tasks', label: 'Where do you need the most help?', type: 'checkbox', required: true,
        options: ['Inbox management', 'Calendar scheduling', 'Social media', 'Lead generation', 'Customer support', 'Data entry', 'Bookkeeping admin'],
      },
      { key: 'hours', label: 'Expected hours per week', type: 'select', options: ['Under 10', '10–20', '20–30', '30–40'] },
    ],
  },
  {
    title: 'Tools & access',
    blurb: 'So we can hit the ground running on day one.',
    fields: [
      { key: 'tools', label: 'Tools we will be working in', type: 'text', placeholder: 'Gmail, Trello, Canva, HubSpot…' },
      { key: 'comms', label: 'Preferred communication channel', type: 'select', options: ['Email', 'Slack', 'WhatsApp', 'Microsoft Teams'] },
      { key: 'timezone', label: 'Your time zone', type: 'text', required: true, placeholder: 'e.g. EST / UTC−5' },
      { key: 'notes', label: 'Anything else we should know?', type: 'textarea' },
    ],
  },
];

/* ── Helpers ─────────────────────────────────────────────── */

export const doneCount = (steps) => steps.filter(s => s.is_completed).length;
export const percentDone = (steps) => (steps.length ? Math.round((doneCount(steps) / steps.length) * 100) : 0);
export const currentStep = (steps) => steps.find(s => !s.is_completed) || null;

export function lastActivityAt(portal) {
  const times = [
    portal.project?.created_at,
    ...portal.steps.map(s => s.completed_at),
    portal.intake?.updated_at,
    ...portal.files.map(f => f.created_at),
  ].filter(Boolean).map(t => new Date(t).getTime());
  return times.length ? Math.max(...times) : Date.now();
}

export const daysIdle = (portal) => Math.floor((Date.now() - lastActivityAt(portal)) / DAY);

/* Which Kanban column a client belongs in. */
export function classify(portal) {
  const { project, steps } = portal;
  if (project.status === 'active') return 'active';
  const open = steps.filter(s => !s.is_completed);
  if (open.length === 1 && open[0].step_key === 'review') return 'review';
  if (daysIdle(portal) >= STALLED_AFTER_DAYS) return 'stalled';
  return 'onboarding';
}

export function fmtBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf', 'application/zip'];

/* Storage object keys must be ASCII-safe. */
export const safeFileName = (name) => name.replace(/[^\w.\-]+/g, '_');
