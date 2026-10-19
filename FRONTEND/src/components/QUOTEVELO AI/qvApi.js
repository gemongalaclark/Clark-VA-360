import { supabase } from '../../lib/supabase';
import { demoApi } from './qvDemo';

/* Supabase-backed API. Every admin call runs as the signed-in user, so RLS decides what comes back.
   Demo mode exposes the same interface (qvDemo.js), so the UI never branches on it. */

const must = ({ data, error }) => { if (error) throw error; return data; };

/* Columns an admin may edit from the dashboard. The DB trigger (qv_guard_lead_update) enforces this too. */
const EDITABLE = ['status', 'ai_proposal', 'ai_email_subject', 'ai_email_body'];
const pick = (obj) => Object.fromEntries(EDITABLE.filter(k => k in obj).map(k => [k, obj[k]]));

const liveApi = {
  /* Public: anonymous insert. No .select() so the request is `return=minimal`; anon has no SELECT policy. */
  async submitLead(input) {
    const { error } = await supabase.from('qv_leads').insert(input);
    if (error) throw error;
  },

  async isAdmin(userId) {
    const row = must(await supabase.from('qv_admins').select('user_id').eq('user_id', userId).maybeSingle());
    return !!row;
  },

  async listLeads() {
    return must(await supabase.from('qv_leads').select('*').order('created_at', { ascending: false }).limit(500));
  },

  /* Realtime: Activepieces writes the score back, and the board updates without a refresh. */
  subscribe(onChange) {
    const channel = supabase
      .channel('qv-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qv_leads' }, onChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  async updateLead(id, fields) {
    return must(await supabase.from('qv_leads').update(pick(fields)).eq('id', id).select().single());
  },

  /* "Approve & Send": the edge function re-checks the admin, then triggers Activepieces Flow 2 (Gmail). */
  async sendProposal(lead) {
    const { data, error } = await supabase.functions.invoke('send-proposal', { body: { leadId: lead.id } });
    if (error) {
      /* functions.invoke hides the JSON error body on non-2xx; dig it out for a useful message. */
      let msg = error.message;
      try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
  },

  async deleteLead(id) {
    must(await supabase.from('qv_leads').delete().eq('id', id));
  },
};

export const isLiveAvailable = !!supabase;
export const getApi = (mode) => (mode === 'demo' ? demoApi : liveApi);
