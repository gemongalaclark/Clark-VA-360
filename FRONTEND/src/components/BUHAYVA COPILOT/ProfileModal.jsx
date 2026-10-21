import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import styles from './BuhayvaCopilot.module.css';
import { Modal } from './ui';

/* Master resume + niche preferences. Gemini reads this on every analysis, so the more specific the
   resume (tools, numbers, results), the more specific the pitches. */

const MAX_RESUME = 12000;

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
