import { useState, useEffect, useRef } from 'react';
import { X, Camera, Trash2, Loader, Phone, Facebook, Mail, User } from 'lucide-react';
import {
  AVATAR_MAX_BYTES, validateAvatar, formatMB, validateMobile, cleanFacebook,
  uploadAvatar, removeAvatarFile, saveProfileDetails, fetchMyContact, saveMyContact,
} from './profileApi';
import { DEFAULT_COUNTRY, parseMobile, buildMobile } from './countries';
import CountryPicker from './CountryPicker';
import styles from './ProfileModal.module.css';

const capitalizeName = (v) => v.replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase());

export default function ProfileModal({ profile, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [mobile, setMobile] = useState('');   // national part only, without the +code
  const [facebook, setFacebook] = useState('');
  const [contactReady, setContactReady] = useState(false);
  const [newFile, setNewFile] = useState(null);        // staged, uploaded on Save
  const [preview, setPreview] = useState(profile.avatar_url ?? '');
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  /* Contact details live in a private table, so load them separately */
  useEffect(() => {
    let alive = true;
    fetchMyContact(profile.id).then((c) => {
      if (!alive) return;
      const parsed = parseMobile(c.mobile_number);
      setCountry(parsed.country);
      setMobile(parsed.national);
      setFacebook(c.facebook_url ?? '');
      setContactReady(true);
    });
    return () => { alive = false; };
  }, [profile.id]);

  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = (file) => {
    if (!file) return;
    const problem = validateAvatar(file);
    if (problem) { setError(problem); return; }
    setError('');
    setNewFile(file);
    setRemoveCurrent(false);
    setPreview(URL.createObjectURL(file));
  };

  const clearPicture = () => {
    setNewFile(null);
    setPreview('');
    setRemoveCurrent(!!profile.avatar_url);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    const first = capitalizeName(firstName.trim());
    const last = capitalizeName(lastName.trim());
    if (!first || !last) { setError('First and last name are required.'); return; }
    const m = buildMobile(country, mobile);
    const mobileProblem = validateMobile(country, m.digits);
    if (mobileProblem) { setError(mobileProblem); return; }
    const f = cleanFacebook(facebook);   // (mobile saved below as m.value)
    if (f.error) { setError(f.error); return; }

    setSaving(true);
    try {
      let avatar_url = profile.avatar_url ?? null;
      if (newFile) avatar_url = await uploadAvatar(profile.id, newFile, profile.avatar_url);
      else if (removeCurrent) { await removeAvatarFile(profile.avatar_url); avatar_url = null; }

      const saved = await saveProfileDetails(profile.id, { first_name: first, last_name: last, avatar_url });
      if (contactReady) await saveMyContact(profile.id, { mobile_number: m.value, facebook_url: f.value });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className={styles.close} onClick={onClose} disabled={saving} aria-label="Close"><X size={16} /></button>
        <h2 className={styles.title} id="profile-title">Edit profile</h2>
        <p className={styles.sub}>This is how your team sees you in a room.</p>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.photoRow}>
            <div className={styles.photo}>
              {preview ? <img src={preview} alt="Your profile" /> : <span>{initials}</span>}
            </div>
            <div className={styles.photoActions}>
              <div className={styles.photoBtns}>
                <button type="button" className={styles.ghostBtn} onClick={() => fileInput.current?.click()} disabled={saving}>
                  <Camera size={14} /> {preview ? 'Change photo' : 'Upload photo'}
                </button>
                {preview && (
                  <button type="button" className={`${styles.ghostBtn} ${styles.danger}`} onClick={clearPicture} disabled={saving}>
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <span className={styles.hint}>JPG, PNG, WebP or GIF · max {formatMB(AVATAR_MAX_BYTES)}</span>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden
                onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </div>

          <div className={styles.twoCol}>
            <label className={styles.field}>
              <span>First name</span>
              <div className={styles.inputWrap}>
                <User size={15} />
                <input value={firstName} onChange={(e) => setFirstName(capitalizeName(e.target.value))} maxLength={40} required />
              </div>
            </label>
            <label className={styles.field}>
              <span>Last name</span>
              <div className={styles.inputWrap}>
                <User size={15} />
                <input value={lastName} onChange={(e) => setLastName(capitalizeName(e.target.value))} maxLength={40} required />
              </div>
            </label>
          </div>

          <label className={styles.field}>
            <span>Email</span>
            <div className={`${styles.inputWrap} ${styles.readonly}`}>
              <Mail size={15} />
              <input value={profile.email ?? ''} readOnly tabIndex={-1} />
            </div>
          </label>

          <label className={styles.field}>
            <span>Mobile number <em>(optional · only room owners can see this)</em></span>
            <div className={styles.phoneRow}>
              <CountryPicker value={country} onChange={setCountry} disabled={saving} />
              <div className={`${styles.inputWrap} ${styles.phoneInput}`}>
                <Phone size={15} />
                <input type="tel" inputMode="numeric" placeholder="912 345 6789" value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/[^\d\s\-()]/g, ''))} maxLength={20}
                  autoComplete="tel-national" />
              </div>
            </div>
          </label>

          <label className={styles.field}>
            <span>Facebook link <em>(optional · only room owners can see this)</em></span>
            <div className={styles.inputWrap}>
              <Facebook size={15} />
              <input type="text" inputMode="url" placeholder="https://facebook.com/yourname" value={facebook}
                onChange={(e) => setFacebook(e.target.value)} maxLength={200} />
            </div>
          </label>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.save} disabled={saving || !contactReady}>
              {saving && <Loader size={15} className={styles.spin} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
