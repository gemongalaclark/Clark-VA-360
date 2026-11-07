import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import styles from './JobTracker.module.css';

/* Where a job was found. Colours come from the Clark VA 360 brand (ink, red, blush, grey);
   checked to stay distinguishable for colour-blind readers. The grey is pale, so a
   source always shows its name next to its colour, never colour alone. */
export const SOURCES = [
  { id: 'linkedin', label: 'LinkedIn', color: '#1a1a2e' },
  { id: 'onlinejobsph', label: 'OnlineJobs.ph', color: '#cb2525' },
  { id: 'upwork', label: 'Upwork', color: '#da7979' },
  { id: 'other', label: 'Other', color: '#c9c9d6' },
];
const SOURCE_BY_ID = Object.fromEntries(SOURCES.map(s => [s.id, s]));

export const sourceOf = (id) => SOURCE_BY_ID[id] ?? SOURCE_BY_ID.other;
/* "Other" jobs show the site the user typed, e.g. "Indeed". */
export const sourceName = (job) => (job.source === 'other' && job.source_other) || sourceOf(job.source).label;

/* Where an application stands. New applications start as "No reply". */
export const STATUSES = [
  { id: 'no_reply', label: 'No reply' },
  { id: 'in_process', label: 'In process' },
  { id: 'hired', label: 'Hired / Accepted' },
];

/* A pill that opens the native status menu (keyboard and screen-reader friendly). */
export function StatusPicker({ value = 'no_reply', onChange, disabled, title }) {
  const current = STATUSES.find(s => s.id === value) ?? STATUSES[0];
  return (
    <label className={`${styles.status} ${styles[`status_${current.id}`]}`} title="Change status">
      {current.id === 'hired' ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : <i aria-hidden="true" />}
      <span>{current.label}</span>
      <ChevronDown size={13} aria-hidden="true" />
      <select value={current.id} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={`Status of ${title}`}>
        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </label>
  );
}

/* "https://www.linkedin.com/jobs/view/123" → "linkedin.com" */
export function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/* Users often paste "linkedin.com/jobs/…" without the scheme; the database requires one. */
export const withScheme = (url) => {
  const u = String(url ?? '').trim();
  return !u || /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

/* Local calendar date as YYYY-MM-DD (toISOString would shift it to UTC). */
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseDay = (s) => new Date(`${s}T00:00:00`);
export const fmtDate = (s, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  parseDay(s).toLocaleDateString('en-US', opts);

/* "Today" / "Yesterday" / "3 days ago" / "Oct 14" — for recent activity lists. */
export function relDay(s) {
  const days = Math.round((parseDay(isoDay()) - parseDay(s)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return `${days} days ago`;
  return fmtDate(s, { month: 'short', day: 'numeric' });
}

/* Requirements are stored one per line. */
export const reqList = (text) => String(text ?? '').split('\n').map(s => s.replace(/^[\s•\-*]+/, '').trim()).filter(Boolean);

/* Case-insensitive match on title, link and source name. */
export const matches = (job, q) =>
  !q || [job.title, job.url, sourceName(job)].some(v => String(v ?? '').toLowerCase().includes(q.toLowerCase()));

/* Clark VA 360 logo, cropped into a tile (the artwork has wide padding). */
export function Logo({ size = 36 }) {
  return (
    <span className={styles.logoTile} style={{ width: size, height: size }} aria-hidden="true">
      <img src="/images/logo.png" alt="" />
    </span>
  );
}

export function SourceBadge({ job }) {
  return (
    <span className={styles.sourceBadge}>
      <i style={{ background: sourceOf(job.source).color }} aria-hidden="true" />
      {sourceName(job)}
    </span>
  );
}

/* Source radio pills, plus a "which site?" field when Other is picked. */
export function SourcePicker({ value, other, onChange, onOtherChange }) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.fieldLabel}>Where did you find it?</legend>
      <div className={styles.sourcePills}>
        {SOURCES.map(s => (
          <label key={s.id} className={`${styles.sourcePill} ${value === s.id ? styles.sourcePillOn : ''}`}>
            <input type="radio" name="source" value={s.id} checked={value === s.id} onChange={() => onChange(s.id)} required />
            <i style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </label>
        ))}
      </div>
      {value === 'other' && (
        <input
          className={styles.otherInput}
          name="source_other"
          value={other}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Which site? e.g. Indeed, Facebook group, referral"
          maxLength={60}
          required
          autoFocus
        />
      )}
    </fieldset>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

export function Modal({ title, eyebrow, onClose, children, tone }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('input:not([type=radio]), textarea, [data-autofocus]')?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`${styles.modal} ${tone === 'danger' ? styles.modalDanger : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.modalHead}>
          <div>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            <h3>{title}</h3>
          </div>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Scrolling fields above a fixed action footer, so the buttons never leave the screen. */
export function ModalForm({ onSubmit, actions, children }) {
  return (
    <form className={styles.modalForm} onSubmit={onSubmit}>
      <div className={styles.modalBody}>{children}</div>
      <div className={styles.modalActions}>{actions}</div>
    </form>
  );
}

export function ConfirmModal({ title, text, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => { setBusy(true); await onConfirm(); setBusy(false); };
  return (
    <Modal title={title} onClose={onClose} tone="danger">
      <div className={styles.modalBody}>
        <div className={styles.confirmBody}>
          <span className={styles.confirmIcon}><AlertTriangle size={20} /></span>
          <p>{text}</p>
        </div>
      </div>
      <div className={styles.modalActions}>
        <button type="button" className={styles.btnGhost} onClick={onClose} data-autofocus>Keep it</button>
        <button type="button" className={styles.btnDanger} onClick={confirm} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}><Icon size={24} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* Search box + source filter row shared by the Job Tracker and Bookmarks pages. */
export function Toolbar({ query, onQuery, source, onSource, items, placeholder }) {
  const counts = items.reduce((m, j) => ({ ...m, [j.source]: (m[j.source] ?? 0) + 1 }), {});
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} aria-label="Search" />
      </label>
      <div className={styles.filters} role="tablist" aria-label="Filter by source">
        <button role="tab" aria-selected={source === 'all'} className={source === 'all' ? styles.filterOn : ''} onClick={() => onSource('all')}>
          All <span>{items.length}</span>
        </button>
        {SOURCES.map(s => (
          <button key={s.id} role="tab" aria-selected={source === s.id} className={source === s.id ? styles.filterOn : ''} onClick={() => onSource(s.id)}>
            <i style={{ background: s.color }} aria-hidden="true" /> {s.label} <span>{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
