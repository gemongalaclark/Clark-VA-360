import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Check, X, Flame, Gauge, Minus } from 'lucide-react';
import styles from './QuoteVelo.module.css';
import { tagKey, scoreTone } from './qvData';

/* Small shared building blocks for the public and admin views. */

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
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  const node = toast && (
    <div className={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : ''}`} role="status" aria-live="polite">
      {toast.kind === 'error' ? <X size={16} /> : <Check size={16} />} {toast.message}
    </div>
  );
  return [node, notify];
}

/* Circular score dial: a conic-gradient ring filled to `score`%. Colour is never the only signal; the number is always shown. */
export function ScoreDial({ score, size = 'md' }) {
  const tone = scoreTone(score);
  return (
    <span
      className={`${styles.dial} ${styles[`dial_${size}`]} ${styles[`tone_${tone}`]}`}
      style={{ '--pct': `${score}%` }}
      role="img"
      aria-label={`Lead score ${score} out of 100`}
    >
      <span className={styles.dialNum}>{score}</span>
    </span>
  );
}

export function TagPill({ tag }) {
  if (!tag) return null;
  const key = tagKey(tag);
  const Icon = key === 'hot' ? Flame : key === 'std' ? Gauge : Minus;
  return (
    <span className={`${styles.tagPill} ${styles[`tag_${key}`]}`}>
      <Icon size={12} /> {tag}
    </span>
  );
}
