import { supabase } from '../../../lib/supabase';

export const ATTACH_BUCKET = 'task-attachments';
export const ATTACH_MAX_FILES = 8;
export const ATTACH_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACH_NOTE_MAX = 200;

export const formatBytes = (n = 0) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;

/** Accepts "example.com/x" too; returns a normalised https URL or null. */
export function normalizeUrl(raw) {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.hostname.includes('.') ? u.href : null;
  } catch { return null; }
}

const safeName = (name) => name.replace(/[^\w.\-]+/g, '_').slice(-80);

/**
 * Upload the picked files, then return the jsonb entries to store on the task.
 * On any failure the files already uploaded are removed and the error is thrown.
 * `items`: [{ kind:'file', file, note } | { kind:'link', url, title, note }]
 */
export async function uploadAttachments(roomId, items) {
  const uploaded = [];
  const out = [];
  try {
    for (const it of items) {
      if (it.kind === 'link') {
        out.push({ type: 'link', url: it.url, title: it.title?.trim() || null, note: it.note.trim() || null });
        continue;
      }
      const path = `${roomId}/${crypto.randomUUID()}-${safeName(it.file.name)}`;
      const { error } = await supabase.storage.from(ATTACH_BUCKET)
        .upload(path, it.file, { contentType: it.file.type || 'application/octet-stream' });
      if (error) throw new Error(`Could not upload “${it.file.name}”: ${error.message}`);
      uploaded.push(path);
      out.push({
        type: 'file', path, name: it.file.name, size: it.file.size,
        mime: it.file.type || null, note: it.note.trim() || null,
      });
    }
    return { attachments: out, uploadedPaths: uploaded };
  } catch (e) {
    if (uploaded.length) await supabase.storage.from(ATTACH_BUCKET).remove(uploaded);
    throw e;
  }
}

export const removeUploaded = (paths) =>
  paths?.length ? supabase.storage.from(ATTACH_BUCKET).remove(paths) : Promise.resolve();

/** Short-lived signed URL for a stored file. */
export async function getAttachmentUrl(att) {
  const { data, error } = await supabase.storage.from(ATTACH_BUCKET).createSignedUrl(att.path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
