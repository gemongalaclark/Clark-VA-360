import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import styles from './SharedPages.module.css';

const META = {
  pending:  { Icon: Clock,        cls: styles.stPending,  label: 'Pending' },
  approved: { Icon: CheckCircle2, cls: styles.stApproved, label: 'Approved' },
  rejected: { Icon: XCircle,      cls: styles.stRejected, label: 'Rejected' },
};

/* Status is conveyed by icon + label + colour, never colour alone */
export default function StatusBadge({ status }) {
  const m = META[status] ?? META.pending;
  return (
    <span className={`${styles.statusBadge} ${m.cls}`}>
      <m.Icon size={12} strokeWidth={2.4} /> {m.label}
    </span>
  );
}

export const getInitials = (p) => (p ? `${p.first_name[0]}${p.last_name[0]}`.toUpperCase() : '?');
export const getName = (p) => (p ? `${p.first_name} ${p.last_name}` : 'Unknown');

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
