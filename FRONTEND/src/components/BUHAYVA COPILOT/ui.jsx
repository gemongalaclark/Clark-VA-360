import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import styles from './BuhayvaCopilot.module.css';

/* Small shared building blocks. */

export function Spinner({ label }) {
  return (
    <div className={styles.center} role="status">
      <Loader2 className={styles.spin} size={28} />
      {label && <span className={styles.muted}>{label}</span>}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const notify = useCallback((message, kind = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  const node = toast && (
    <div className={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : ''}`} role="status" aria-live="polite">
      {toast.kind === 'error' ? <X size={16} /> : <Check size={16} />} {toast.message}
    </div>
  );
  return [node, notify];
}

/* Modal shell: Escape / backdrop click closes, body scroll is locked while open. */
export function Modal({ title, onClose, children, wide }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${wide ? styles.modalWide : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <button ref={closeRef} className={styles.modalClose} onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* Copies text and briefly flips its label to "Copied". */
export function CopyButton({ text, label, icon: Icon, className, onCopied }) {
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      onCopied?.();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1600);
    } catch { /* clipboard blocked: leave the label as-is */ }
  };
  return (
    <button type="button" className={className} onClick={copy} disabled={!text}>
      {done ? <Check size={14} /> : Icon && <Icon size={14} />} {done ? 'Copied' : label}
    </button>
  );
}
