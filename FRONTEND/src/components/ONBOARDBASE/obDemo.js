import { STEP_TEMPLATE } from './obData';

/* In-browser demo backend: same interface as the Supabase API in obApi.js, so portfolio visitors
   can try both the Client and Admin views without an account. State lives in localStorage. */

const KEY = 'onboardbase_demo_v1';
const DAY = 86_400_000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const wait = (ms = 220) => new Promise(r => setTimeout(r, ms));

export const DEMO_CLIENT_ID = 'demo-client';
export const DEMO_ADMIN_ID = 'demo-admin';

/* Object URLs for files uploaded this session (blobs can't be persisted in localStorage). */
const blobUrls = new Map();

function makeClient({ id, name, company, email, doneKeys, createdDaysAgo, lastDoneDaysAgo, status, extra = {} }) {
  const projectId = `p-${id}`;
  return {
    profile: { id, email, full_name: name, company_name: company, role: 'client', created_at: ago(createdDaysAgo) },
    project: {
      id: projectId, client_id: id, title: `${company} — Onboarding`, status: status || 'onboarding',
      start_date: ago(createdDaysAgo).slice(0, 10), contact_name: 'Clark Gemongala',
      contact_email: 'hello@clarkva360.com', meeting_url: 'https://calendly.com/', created_at: ago(createdDaysAgo),
    },
    steps: STEP_TEMPLATE.map((t, i) => ({
      id: `s-${id}-${t.step_key}`, project_id: projectId, ...t, position: i + 1,
      is_completed: doneKeys.includes(t.step_key),
      completed_at: doneKeys.includes(t.step_key) ? ago(lastDoneDaysAgo) : null,
      created_at: ago(createdDaysAgo),
    })),
    intake: null,
    files: [],
    ...extra,
  };
}

function seed() {
  const filledIntake = (id, name) => ({
    id: `i-${id}`, client_id: id, current_step: 3, updated_at: ago(2), submitted_at: ago(2),
    question_data: {
      business_name: name, industry: 'Hospitality', team_size: '6–20', audience: 'Local professionals and remote workers.',
      brand_voice: 'Warm, unfussy, a little witty.', top_goals: 'Free up 10 hours a week; grow the newsletter.',
      priority_tasks: ['Inbox management', 'Social media'], hours: '10–20', tools: 'Gmail, Canva, Trello',
      comms: 'Slack', timezone: 'EST',
    },
  });
  const file = (id, name, type, mime, size, days, by = id) => ({
    id: uid(), client_id: id, file_path: `${id}/${name}`, file_name: name, file_type: type,
    mime_type: mime, size_bytes: size, uploaded_by: by, created_at: ago(days),
  });

  const clients = [
    makeClient({ id: DEMO_CLIENT_ID, name: 'Jordan Rivera', company: 'Maple & Co. Bakery', email: 'jordan@maplebakery.example',
      doneKeys: ['contract'], createdDaysAgo: 2, lastDoneDaysAgo: 1 }),
    makeClient({ id: 'c-northwind', name: 'Priya Natarajan', company: 'Northwind Coffee', email: 'priya@northwind.example',
      doneKeys: [], createdDaysAgo: 6, lastDoneDaysAgo: 6 }),
    makeClient({ id: 'c-lumen', name: 'Marcus Webb', company: 'Lumen Realty', email: 'marcus@lumenrealty.example',
      doneKeys: ['contract', 'brand_assets'], createdDaysAgo: 8, lastDoneDaysAgo: 5 }),
    makeClient({ id: 'c-fable', name: 'Sofia Alvarez', company: 'Fable & Finch', email: 'sofia@fablefinch.example',
      doneKeys: ['contract', 'brand_assets', 'intake', 'kickoff'], createdDaysAgo: 9, lastDoneDaysAgo: 1,
      extra: { intake: filledIntake('c-fable', 'Fable & Finch'),
        files: [file('c-fable', 'logo-primary.png', 'brand_asset', 'image/png', 248_000, 3),
                file('c-fable', 'brand-guidelines.pdf', 'brand_asset', 'application/pdf', 1_820_000, 3)] } }),
    makeClient({ id: 'c-brightside', name: 'Dana Okafor', company: 'Brightside Dental', email: 'dana@brightside.example',
      doneKeys: STEP_TEMPLATE.map(t => t.step_key), createdDaysAgo: 21, lastDoneDaysAgo: 7, status: 'active',
      extra: { intake: filledIntake('c-brightside', 'Brightside Dental'),
        files: [file('c-brightside', 'logo.svg', 'brand_asset', 'image/svg+xml', 12_000, 18),
                file('c-brightside', 'Weekly-Report-Wk1.pdf', 'deliverable', 'application/pdf', 410_000, 7, DEMO_ADMIN_ID)] } }),
  ];
  /* Northwind has been quiet since day 6, stuck on "Sign Contract": the demo's stalled example. */
  return { clients };
}

let cache = null;
function read() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY)); } catch { cache = null; }
  if (!cache?.clients) cache = seed();
  return cache;
}
function write() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode / quota: state stays in memory */ }
}
const find = (clientId) => {
  const c = read().clients.find(x => x.profile.id === clientId);
  if (!c) throw new Error('Client not found');
  return c;
};
const clone = (o) => JSON.parse(JSON.stringify(o));

function syncStatus(c) {
  c.project.status = c.steps.every(s => s.is_completed) ? 'active' : 'onboarding';
}

export const demoApi = {
  async getProfile(userId) {
    await wait(120);
    if (userId === DEMO_ADMIN_ID) {
      return { id: DEMO_ADMIN_ID, email: 'admin@onboardbase.demo', full_name: 'Clark (Admin)', company_name: 'Clark VA 360', role: 'admin' };
    }
    return clone(find(userId).profile);
  },

  async getPortal(clientId) {
    await wait(160);
    return clone(find(clientId));
  },

  async setStepDone(stepId, done) {
    await wait(120);
    for (const c of read().clients) {
      const s = c.steps.find(x => x.id === stepId);
      if (s) {
        s.is_completed = done;
        s.completed_at = done ? new Date().toISOString() : null;
        syncStatus(c);
        write();
        return clone(s);
      }
    }
    throw new Error('Step not found');
  },

  async saveIntake(clientId, { data, currentStep, submit }) {
    await wait(160);
    const c = find(clientId);
    c.intake = {
      ...(c.intake || { id: uid(), client_id: clientId }),
      question_data: data, current_step: currentStep, updated_at: new Date().toISOString(),
      submitted_at: submit ? new Date().toISOString() : (c.intake?.submitted_at ?? null),
    };
    write();
    return clone(c.intake);
  },

  async uploadFile(clientId, file, fileType, uploaderId) {
    await wait(350);
    const c = find(clientId);
    const row = {
      id: uid(), client_id: clientId, file_path: `${clientId}/${file.name}`, file_name: file.name, file_type: fileType,
      mime_type: file.type, size_bytes: file.size, uploaded_by: uploaderId, created_at: new Date().toISOString(),
    };
    blobUrls.set(row.id, URL.createObjectURL(file));
    c.files.unshift(row);
    write();
    return clone(row);
  },

  async deleteFile(file) {
    await wait(150);
    const c = find(file.client_id);
    c.files = c.files.filter(f => f.id !== file.id);
    blobUrls.delete(file.id);
    write();
  },

  async getFileUrl(file) {
    const url = blobUrls.get(file.id);
    if (!url) throw new Error('Sample files in the demo have no real content. Upload your own to preview it.');
    return url;
  },

  async listClients() {
    await wait(200);
    return clone(read().clients);
  },

  async inviteClient({ email, fullName, companyName }) {
    await wait(400);
    const id = `c-${uid().slice(0, 8)}`;
    const client = makeClient({ id, name: fullName || email.split('@')[0], company: companyName, email,
      doneKeys: [], createdDaysAgo: 0, lastDoneDaysAgo: 0 });
    read().clients.unshift(client);
    write();
    return { ok: true, clientId: id, projectId: client.project.id };
  },

  async updateProject(projectId, patch) {
    await wait(150);
    const c = read().clients.find(x => x.project.id === projectId);
    if (!c) throw new Error('Project not found');
    Object.assign(c.project, patch);
    write();
    return clone(c.project);
  },
};

export function resetDemo() {
  cache = seed();
  write();
}
