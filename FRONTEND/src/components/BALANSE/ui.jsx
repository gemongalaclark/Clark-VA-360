import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './Balanse.module.css';

const pesoFmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });
const pesoWhole = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export const num = (v) => Number(v) || 0;
export const peso = (v) => (num(v) % 1 ? pesoFmt : pesoWhole).format(num(v));
export const pct = (part, whole) => (whole > 0 ? Math.min(100, Math.max(0, (part / whole) * 100)) : 0);

export function Meter({ value, max, label, done }) {
  const p = pct(value, max);
  return (
    <div
      className={styles.meter}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p)}
    >
      <span className={`${styles.meterFill} ${done ? styles.meterDone : ''}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, textarea, button')?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.modalHead}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
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

/* Small "add an amount" dialog shared by Record payment (debts) and Add savings (goals). */
export function AmountModal({ title, label, max, onSubmit, onClose }) {
  const submit = async (e) => {
    e.preventDefault();
    const amount = num(new FormData(e.currentTarget).get('amount'));
    if (amount > 0) await onSubmit(amount);
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className={styles.form}>
        <Field label={label} hint={max != null ? `Remaining: ${peso(max)}` : undefined}>
          <input name="amount" type="number" min="0.01" step="0.01" max={max ?? undefined} required inputMode="decimal" />
        </Field>
        <div className={styles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}><Icon size={26} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
