import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, Archive, Pencil, Trash2 } from 'lucide-react';
import styles from './Balanse.module.css';

const pesoFmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });
const pesoWhole = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export const num = (v) => Number(v) || 0;
export const peso = (v) => (num(v) % 1 ? pesoFmt : pesoWhole).format(num(v));
export const pct = (part, whole) => (whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0);

/* Whole months from today to a YYYY-MM-DD date (≤ 0 once it has passed), or null without a date. */
export function monthsUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) - (d < now.getDate() ? 1 : 0);
}

export const fmtDate = (s, opts = { month: 'short', year: 'numeric' }) =>
  new Date(`${s}T00:00:00`).toLocaleDateString('en-PH', opts);

/* "8 months left" / "1 yr 2 mo left", with wording for a passed or current-month date. */
export function timeLeft(dateStr, { passed, thisMonth }) {
  const m = monthsUntil(dateStr);
  if (m == null) return null;
  if (m < 0) return { text: passed, late: true };
  if (m === 0) return { text: thisMonth, late: false };
  if (m < 12) return { text: `${m} month${m > 1 ? 's' : ''} left`, late: false };
  const y = Math.floor(m / 12), r = m % 12;
  return { text: `${y} yr${y > 1 ? 's' : ''}${r ? ` ${r} mo` : ''} left`, late: false };
}

/* Amount with a de-emphasised ₱ sign and centavos, so the whole-peso figure reads first. */
export function Money({ value, className = '' }) {
  const v = num(value);
  const parts = (v % 1 ? pesoFmt : pesoWhole).formatToParts(v);
  return (
    <span className={`${styles.money} ${className}`}>
      {parts.map((p, i) => {
        if (p.type === 'currency') return <span key={i} className={styles.cur}>{p.value}</span>;
        if (p.type === 'decimal' || p.type === 'fraction') return <span key={i} className={styles.cents}>{p.value}</span>;
        return p.value;
      })}
    </span>
  );
}

/* The BALANSE mark: a balance beam on its post. */
export function Logo({ size = 34 }) {
  return (
    <span className={styles.logoMark} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 6v20M10 26h12M5 10h22" />
        <path d="M5 10l-3.5 8h7zM27 10l-3.5 8h7z" />
        <circle cx="16" cy="6" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

/* tone: 'debt' (ink) | 'goal' (brand red) | 'onDark' — fixed per entity type, never per rank. */
export function Meter({ value, max, label, tone = 'goal', done, size = 'md' }) {
  const p = pct(value, max);
  return (
    <div
      className={`${styles.meter} ${styles[`meter_${tone}`]} ${size === 'lg' ? styles.meterLg : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p)}
    >
      <span className={`${styles.meterFill} ${done ? styles.meterDone : ''}`} style={{ width: `${p}%` }} />
      <span className={styles.meterTicks} aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

export function Modal({ title, eyebrow, onClose, children, tone }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, textarea, [data-autofocus]')?.focus();
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

/* Every modal form shares one layout: scrolling fields above a fixed action footer,
   so long forms never push the header or the buttons off-screen. */
export function ModalForm({ onSubmit, actions, children }) {
  return (
    <form className={styles.modalForm} onSubmit={onSubmit}>
      <div className={styles.modalBody}>{children}</div>
      <div className={styles.modalActions}>{actions}</div>
    </form>
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

/* Number input with a ₱ prefix. Uncontrolled unless value/onChange are passed. */
export function PesoInput(props) {
  return (
    <span className={styles.pesoInput}>
      <span aria-hidden="true">₱</span>
      <input type="number" step="0.01" inputMode="decimal" {...props} />
    </span>
  );
}

/* "Add an amount" dialog shared by Record payment (debts) and Add savings (goals).
   presets: [{ label, value }] quick-fill chips, e.g. "Monthly ₱5,000" or "Pay in full". */
export function AmountModal({ title, eyebrow, label, max, presets = [], onSubmit, onClose }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (num(amount) <= 0) return;
    setBusy(true);
    await onSubmit(num(amount));
    setBusy(false);
  };
  return (
    <Modal title={title} eyebrow={eyebrow} onClose={onClose}>
      <ModalForm
        onSubmit={submit}
        actions={<>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>}
      >
        <Field label={label} hint={max != null ? `Remaining balance: ${peso(max)}` : undefined}>
          <PesoInput className={styles.bigInput} min="0.01" max={max ?? undefined} required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {presets.length > 0 && (
          <div className={styles.chipRow}>
            {presets.map(p => (
              <button type="button" key={p.label} className={styles.chip} onClick={() => setAmount(String(p.value))}>{p.label}</button>
            ))}
          </div>
        )}
      </ModalForm>
    </Modal>
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

/* Empty state with quick-start suggestions that open the add form pre-filled. */
export function EmptyState({ icon: Icon, title, text, suggestions = [], onPick, action }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}><Icon size={26} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {suggestions.length > 0 && (
        <div className={styles.suggest}>
          <span>Quick start</span>
          <div className={styles.chipRow}>
            {suggestions.map(s => (
              <button type="button" key={s.name} className={styles.chip} onClick={() => onPick(s)}>{s.label ?? s.name}</button>
            ))}
          </div>
        </div>
      )}
      {action}
    </div>
  );
}

/* When an item was finished. completed_at is stamped by the database; updated_at covers
   rows saved before that column existed. */
export const completedOn = (item) => item.completed_at || item.updated_at || null;

/* Active / Past switch shared by Debts and Goals. */
export function ArchiveTabs({ value, onChange, activeCount, pastCount, pastLabel, label }) {
  return (
    <div className={styles.filterTabs} role="tablist" aria-label={label}>
      <button role="tab" aria-selected={value === 'active'} className={value === 'active' ? styles.filterOn : ''} onClick={() => onChange('active')}>
        Active <span>{activeCount}</span>
      </button>
      <button role="tab" aria-selected={value === 'past'} className={value === 'past' ? styles.filterOn : ''} onClick={() => onChange('past')}>
        <Archive size={14} /> {pastLabel} <span>{pastCount}</span>
      </button>
    </div>
  );
}

/* Archived debt or goal: a filed-away card with a dated stamp. */
export function PastCard({ title, subtitle, stamp, date, amountLabel, amount, facts = [], notes, onEdit, onDelete }) {
  return (
    <article className={styles.pastCard}>
      <span className={styles.stamp}>
        <b>{stamp}</b>
        {date && <small>{new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</small>}
      </span>
      <div className={styles.pastHead}>
        <h3>{title}</h3>
        {subtitle && <span className={styles.muted}>{subtitle}</span>}
      </div>
      <div className={styles.pastAmount}>
        <span className={styles.ticketCaption}>{amountLabel}</span>
        <Money value={amount} className={styles.pastValue} />
      </div>
      {facts.length > 0 && (
        <div className={styles.chipRow}>{facts.map(f => <span key={f} className={styles.factChip}>{f}</span>)}</div>
      )}
      {notes && <p className={styles.itemNotes}>{notes}</p>}
      <div className={styles.itemActions}>
        <button className={styles.editBtn} onClick={onEdit} aria-label={`Edit ${title}`}><Pencil size={14} /> Edit</button>
        <button className={styles.iconBtn} onClick={onDelete} aria-label={`Delete ${title}`} title="Delete"><Trash2 size={15} /></button>
      </div>
    </article>
  );
}
