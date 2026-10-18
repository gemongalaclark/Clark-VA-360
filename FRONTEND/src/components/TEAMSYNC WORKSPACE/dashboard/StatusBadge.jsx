import { ListTodo, Clock, CheckCircle2, RotateCcw, Flame } from 'lucide-react';
import styles from './SharedPages.module.css';

const META = {
  assigned:  { Icon: ListTodo,     cls: styles.stAssigned, label: 'To do' },
  submitted: { Icon: Clock,        cls: styles.stPending,  label: 'In review' },
  approved:  { Icon: CheckCircle2, cls: styles.stApproved, label: 'Approved' },
  rejected:  { Icon: RotateCcw,    cls: styles.stRejected, label: 'Revision requested' },
};

/* Status is conveyed by icon + label + colour, never colour alone */
export default function StatusBadge({ status }) {
  const m = META[status] ?? META.submitted;
  return (
    <span className={`${styles.statusBadge} ${m.cls}`}>
      <m.Icon size={12} strokeWidth={2.4} /> {m.label}
    </span>
  );
}

export function UrgentBadge({ overdue }) {
  return (
    <span className={styles.urgentBadge}>
      <Flame size={12} strokeWidth={2.4} /> {overdue ? 'Overdue' : 'Urgent'}
    </span>
  );
}

export const getInitials = (p) => (p ? `${p.first_name[0]}${p.last_name[0]}`.toUpperCase() : '?');
export const getName = (p) => (p ? `${p.first_name} ${p.last_name}` : 'Unknown');

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
