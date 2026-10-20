import { supabase } from '../../../lib/supabase';

/* Same rule as the room_integrations check constraint in teamsync_ai_automations.sql */
export const CHAT_WEBHOOK_RE =
  /^https:\/\/((ptb\.|canary\.)?discord(app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+|hooks\.slack\.com\/services\/[A-Za-z0-9_/]+)$/;

export const chatPlatform = (url) => (/discord/.test(url ?? '') ? 'Discord' : /slack/.test(url ?? '') ? 'Slack' : null);

/** AI QA Check rows for a room, keyed by task id. Owners only (RLS returns nothing for employees). */
export async function fetchAiReviews(roomId) {
  const { data, error } = await supabase.from('task_ai_reviews').select('*').eq('room_id', roomId);
  if (error) return { data: {}, error };
  return { data: Object.fromEntries((data ?? []).map(r => [r.task_id, r])), error: null };
}

/** Whether the Make.com webhook is configured, so the UI only promises an AI check when one will come. */
export async function isAiAutomationEnabled() {
  const { data, error } = await supabase.rpc('ai_automation_enabled');
  return !error && data === true;
}

/** Expand a short task title (+ optional notes) into a full brief via the teamsync-ai-brief Edge Function. */
export async function generateBrief({ roomId, title, notes }) {
  const { data, error } = await supabase.functions.invoke('teamsync-ai-brief', { body: { roomId, title, notes } });
  if (error) {
    /* functions.invoke hides the JSON error body on non-2xx; dig it out for a useful message. */
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data.brief;
}

export async function fetchChatWebhook(roomId) {
  const { data, error } = await supabase.from('room_integrations').select('chat_webhook_url').eq('room_id', roomId).maybeSingle();
  return { url: data?.chat_webhook_url ?? '', error };
}

export async function saveChatWebhook(roomId, url) {
  const { error } = await supabase.from('room_integrations')
    .upsert({ room_id: roomId, chat_webhook_url: url || null, updated_at: new Date().toISOString() });
  return { error };
}
