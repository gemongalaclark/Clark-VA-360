import { useState, useRef } from 'react';
import { Loader2, Save, Upload, Sparkles, Check } from 'lucide-react';
import styles from './BuhayvaCopilot.module.css';
import { Modal } from './ui';
import { readResumeFile, RESUME_ACCEPT } from './bvResume';

/* Master resume + niche preferences. Gemini reads this on every analysis, so the more specific the
   resume (tools, numbers, results), the more specific the pitches.
   "Import from resume" lets Gemini fill the form from a file; the user still reviews and saves. */

const MAX_RESUME = 12000;

function ResumeImport({ api, onFilled }) {
  const [state, setState] = useState('idle');   // idle | reading | done
  const [over, setOver] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const input = useRef(null);
  const busy = state === 'reading';

  const importFile = async (file) => {
    if (!file || busy) return;
    setState('reading');
    setError('');
    setMessage(`Reading ${file.name}…`);
    try {
      onFilled(await api.parseResume(await readResumeFile(file)));
      setMessage(`Filled from ${file.name}. Check every field, then press Save profile.`);
      setState('done');
    } catch (e) {
      setError(e.message || 'Could not read that resume.');
      setState('idle');
    }
  };

  return (
    <div>
      <div
        className={`${styles.importZone} ${over ? styles.importZoneOver : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Import profile from a resume file"
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); importFile(e.dataTransfer.files[0]); }}
      >
        <span className={styles.flowIcon}>{busy ? <Loader2 className={styles.spin} size={20} /> : <Sparkles size={20} />}</span>
        <div>
          <strong>{busy ? 'Gemini is reading your resume…' : 'Import from resume'}</strong>
          <span className={styles.muted}>Drop a PDF, Word, text file or screenshot. AI fills in the form below.</span>
        </div>
        {!busy && <Upload size={18} className={styles.importIcon} />}
        <input
          ref={input} type="file" hidden accept={RESUME_ACCEPT}
          onChange={(e) => { importFile(e.target.files[0]); e.target.value = ''; }}
        />
      </div>
      {state === 'done' && <p className={styles.importDone}><Check size={15} /> {message}</p>}
      {error && <p className={styles.fieldError} role="alert">{error}</p>}
    </div>
  );
}

export default function ProfileModal({ api, profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    target_niches: profile?.target_niches || '',
    hourly_rate_min: profile?.hourly_rate_min ?? 8,
    portfolio_links: profile?.portfolio_links || '',
    resume_text: profile?.resume_text || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  /* Only overwrite what the AI actually found, so an empty answer never wipes a field. */
  const fillFromResume = (parsed) => setForm(f => ({
    ...f,
    ...Object.fromEntries(['full_name', 'target_niches', 'portfolio_links', 'resume_text']
      .filter(k => parsed[k]).map(k => [k, parsed[k]])),
    ...(parsed.hourly_rate_min ? { hourly_rate_min: parsed.hourly_rate_min } : {}),
  }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      onSaved(await api.saveProfile({
        full_name: form.full_name.trim(),
        target_niches: form.target_niches.trim(),
        hourly_rate_min: Number(form.hourly_rate_min) || 0,
        portfolio_links: form.portfolio_links.trim() || null,
        resume_text: form.resume_text.trim(),
      }));
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
      setSaving(false);
    }
  };

  return (
    <Modal title="Master profile" onClose={onClose} wide>
      <p className={styles.muted}>Saved once, used for every job. Gemini only ever sees what you put here.</p>
      <ResumeImport api={api} onFilled={fillFromResume} />
      <form onSubmit={save}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="bv-name">Full name</label>
            <input id="bv-name" type="text" required value={form.full_name} onChange={set('full_name')} />
          </div>
          <div className={styles.field}>
            <label htmlFor="bv-rate">Minimum hourly rate (USD)</label>
            <input id="bv-rate" type="number" min="0" step="0.5" value={form.hourly_rate_min} onChange={set('hourly_rate_min')} />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="bv-niches">Target niches</label>
          <input id="bv-niches" type="text" required placeholder="Tech Virtual Assistant, Web Developer, Automation Specialist" value={form.target_niches} onChange={set('target_niches')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="bv-links">Portfolio links <span className={styles.muted}>(one per line)</span></label>
          <textarea id="bv-links" rows={2} placeholder="https://clarkva360.com" value={form.portfolio_links} onChange={set('portfolio_links')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="bv-resume">Master resume</label>
          <textarea
            id="bv-resume" rows={14} required maxLength={MAX_RESUME}
            placeholder="Paste your resume: roles, tools, projects, measurable results…"
            value={form.resume_text} onChange={set('resume_text')}
          />
          <div className={styles.fieldFoot}>
            <span className={styles.muted}>Tip: concrete results (“built 40+ Zapier automations”) make stronger pitches.</span>
            <span className={styles.muted}>{form.resume_text.length.toLocaleString()} / {MAX_RESUME.toLocaleString()}</span>
          </div>
        </div>
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
        <div className={styles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={saving}>
            {saving ? <Loader2 className={styles.spin} size={16} /> : <Save size={16} />} Save profile
          </button>
        </div>
      </form>
    </Modal>
  );
}
