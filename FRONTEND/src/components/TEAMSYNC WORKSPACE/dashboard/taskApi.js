import { supabase } from '../../../lib/supabase';

/**
 * Load a room's tasks newest-first, each with its employee profile attached as `profiles`.
 * Profiles are fetched in a second query instead of an embed: tasks has two foreign keys
 * to profiles (employee_id, assigned_by), which makes PostgREST embeds fragile.
 * Always resolves to { data, error } — callers must surface `error`.
 */
export async function fetchRoomTasks(roomId, { limit } = {}) {
  let q = supabase.from('tasks').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
  if (limit) q = q.limit(limit);
  const { data: tasks, error } = await q;
  if (error) return { data: [], error };

  const ids = [...new Set((tasks ?? []).map(t => t.employee_id))];
  const byId = {};
  if (ids.length) {
    const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
    (profs ?? []).forEach(p => { byId[p.id] = p; });
  }
  return { data: (tasks ?? []).map(t => ({ ...t, profiles: byId[t.employee_id] ?? null })), error: null };
}
