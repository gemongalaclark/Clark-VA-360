import { supabase } from '../../lib/supabase';
import { demoApi } from './obDemo';
import { safeFileName } from './obData';

/* Supabase-backed API. Every call runs as the signed-in user, so RLS decides what comes back.
   Demo mode exposes the same interface (obDemo.js), so the UI never branches on it. */

const BUCKET = 'onboardbase';
const must = ({ data, error }) => { if (error) throw error; return data; };

async function loadPortal(clientId) {
  const [profile, project, intake, files] = await Promise.all([
    supabase.from('ob_profiles').select('*').eq('id', clientId).maybeSingle().then(must),
    supabase.from('ob_projects').select('*').eq('client_id', clientId).maybeSingle().then(must),
    supabase.from('ob_intake_forms').select('*').eq('client_id', clientId).maybeSingle().then(must),
    supabase.from('ob_files').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).then(must),
  ]);
  const steps = project
    ? must(await supabase.from('ob_onboarding_steps').select('*').eq('project_id', project.id).order('position'))
    : [];
  return { profile, project, steps, intake, files: files || [] };
}

const liveApi = {
  async getProfile(userId) {
    return must(await supabase.from('ob_profiles').select('*').eq('id', userId).maybeSingle());
  },

  getPortal: loadPortal,

  async setStepDone(stepId, done) {
    return must(await supabase.from('ob_onboarding_steps')
      .update({ is_completed: done }).eq('id', stepId).select().single());
  },

  async saveIntake(clientId, { data, currentStep, submit }) {
    const row = {
      client_id: clientId,
      question_data: data,
      current_step: currentStep,
      updated_at: new Date().toISOString(),
      ...(submit ? { submitted_at: new Date().toISOString() } : {}),
    };
    return must(await supabase.from('ob_intake_forms')
      .upsert(row, { onConflict: 'client_id' }).select().single());
  },

  async uploadFile(clientId, file, fileType, uploaderId) {
    const path = `${clientId}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data, error: dbErr } = await supabase.from('ob_files').insert({
      client_id: clientId, file_path: path, file_name: file.name, file_type: fileType,
      mime_type: file.type, size_bytes: file.size, uploaded_by: uploaderId,
    }).select().single();
    if (dbErr) {
      await supabase.storage.from(BUCKET).remove([path]);   // don't orphan the object
      throw dbErr;
    }
    return data;
  },

  async deleteFile(file) {
    const { error: sErr } = await supabase.storage.from(BUCKET).remove([file.file_path]);
    if (sErr) throw sErr;
    must(await supabase.from('ob_files').delete().eq('id', file.id));
  },

  async getFileUrl(file) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.file_path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  },

  /* Admin */
  async listClients() {
    const [projects, intakes, files] = await Promise.all([
      supabase.from('ob_projects').select('*, profile:ob_profiles(*), steps:ob_onboarding_steps(*)')
        .order('created_at', { ascending: false }).then(must),
      supabase.from('ob_intake_forms').select('*').then(must),
      supabase.from('ob_files').select('*').then(must),
    ]);
    return projects.map(({ profile, steps, ...project }) => ({
      profile,
      project,
      steps: [...steps].sort((a, b) => a.position - b.position),
      intake: intakes.find(i => i.client_id === project.client_id) || null,
      files: files.filter(f => f.client_id === project.client_id),
    }));
  },

  async inviteClient({ email, fullName, companyName }) {
    const { data, error } = await supabase.functions.invoke('invite-client', {
      body: { email, fullName, companyName },
    });
    if (error) {
      /* functions.invoke hides the JSON error body on non-2xx; dig it out for a useful message. */
      let msg = error.message;
      try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async updateProject(projectId, patch) {
    return must(await supabase.from('ob_projects').update(patch).eq('id', projectId).select().single());
  },
};

/* Demo mode kicks in automatically when Supabase env vars are missing, or when the visitor picks "Try the demo". */
export const isLiveAvailable = !!supabase;
export const getApi = (mode) => (mode === 'demo' ? demoApi : liveApi);
