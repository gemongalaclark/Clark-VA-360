import { supabase } from '../../../lib/supabase';

export const AVATAR_BUCKET = 'avatars';
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const formatMB = (n) => `${(n / 1048576).toFixed(1)} MB`;

/** Returns an error string, or '' when the file is an acceptable avatar. */
export function validateAvatar(file) {
  if (!AVATAR_TYPES.includes(file.type)) return 'Please choose a JPG, PNG, WebP or GIF image.';
  if (file.size > AVATAR_MAX_BYTES) return `That image is ${formatMB(file.size)} — the limit is 5 MB.`;
  return '';
}

/** Mobile is optional: keeps digits, +, spaces, dashes, brackets. Returns { value, error }. */
export function cleanMobile(raw) {
  const v = raw.trim();
  if (!v) return { value: null, error: '' };
  if (!/^[+\d\s\-()]+$/.test(v)) return { value: null, error: 'Mobile number can only contain digits, spaces, + and -.' };
  const digits = v.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return { value: null, error: 'Enter a valid mobile number (7–15 digits).' };
  return { value: v, error: '' };
}

/** Facebook link is optional: accepts "facebook.com/name" too. Returns { value, error }. */
export function cleanFacebook(raw) {
  const v = raw.trim();
  if (!v) return { value: null, error: '' };
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    const host = u.hostname.replace(/^(www|m|web)\./, '');
    if (!['facebook.com', 'fb.com', 'fb.me'].includes(host)) throw new Error();
    return { value: u.href, error: '' };
  } catch {
    return { value: null, error: 'Enter a valid Facebook link, e.g. https://facebook.com/yourname' };
  }
}

/** Uploads a new avatar, removes the previous one, and returns the new public URL. */
export async function uploadAvatar(userId, file, previousUrl) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Could not upload the picture: ${error.message}`);
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  await removeAvatarFile(previousUrl);
  return data.publicUrl;
}

/** Best-effort delete of a file in our avatars bucket, given its public URL. */
export async function removeAvatarFile(url) {
  if (!url) return;
  const marker = `/${AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  try { await supabase.storage.from(AVATAR_BUCKET).remove([path]); } catch { /* ignore */ }
}

/** The signed-in user's own mobile + Facebook ({} when none saved yet). */
export async function fetchMyContact(userId) {
  const { data } = await supabase.from('profile_contacts')
    .select('mobile_number, facebook_url').eq('user_id', userId).maybeSingle();
  return data ?? {};
}

export async function saveMyContact(userId, { mobile_number, facebook_url }) {
  const { error } = await supabase.from('profile_contacts')
    .upsert({ user_id: userId, mobile_number, facebook_url, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function saveProfileDetails(userId, patch) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
  if (error) throw new Error(error.message);
  return data;
}
