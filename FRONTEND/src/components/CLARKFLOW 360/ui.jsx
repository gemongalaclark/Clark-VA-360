import { AlertCircle, Clock, Check, Archive } from 'lucide-react';
import styles from './ClarkFlow360.module.css';

export const MAX_ATTEMPTS = 3;   // matches cf-triage-analyze

/* Queue order: high → medium → not triaged yet → low, newest first within each. */
const RANK = { high: 0, medium: 1, untriaged: 2, low: 3 };
export const priorityRank = (e) =>
  RANK[e.triage_status === 'pending' || !e.priority_level ? 'untriaged' : e.priority_level];

/* "To do" = everything you haven't replied to or archived. */
export const isTodo = (e) => e.triage_status !== 'replied' && e.triage_status !== 'archived';

export const isFailed = (e) => e.triage_status === 'pending' && e.triage_attempts >= MAX_ATTEMPTS;

export function formatWhen(iso) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const formatFull = (iso) => new Date(iso).toLocaleString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function StatusChip({ email }) {
  if (email.triage_status === 'replied') {
    return <span className={`${styles.priority} ${styles.repliedChip}`}><Check size={12} /> Replied</span>;
  }
  if (email.triage_status === 'archived') {
    return <span className={`${styles.priority} ${styles.pendingChip}`}><Archive size={12} /> Archived</span>;
  }
  /* A pending email may still carry an old priority (re-queued for triage): show Pending. */
  if (email.priority_level && email.triage_status !== 'pending') {
    return <span className={`${styles.priority} ${styles[email.priority_level]}`}>{email.priority_level}</span>;
  }
  if (isFailed(email)) {
    return <span className={`${styles.priority} ${styles.failedChip}`} title={email.triage_error ?? ''}><AlertCircle size={12} /> Not triaged</span>;
  }
  return <span className={`${styles.priority} ${styles.pendingChip}`}><Clock size={12} /> Pending</span>;
}
