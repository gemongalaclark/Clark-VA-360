import { useEffect, useState } from 'react';
import { AlarmClock, Bell, BellRing, Plus, X } from 'lucide-react';
import styles from './JobTracker.module.css';
import { isoDay } from './ui';
import { REMINDER_LABEL, reminderDue, reminderText } from './goalRules';

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

/* Re-checks the clock every 30 s (and when the tab comes back), so the reminder
   appears at REMINDER_HOUR without a reload. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, []);
  return now;
}

/* End-of-day reminder state for the signed-in user. Fires one browser notification per day
   (if allowed) and exposes the in-app banner, which can be dismissed for the rest of the day. */
export function useGoalReminder({ enabled, username, applications, onOpen }) {
  const now = useNow();
  const today = isoDay(now);
  const count = applications.filter(a => a.applied_on === today).length;
  const due = enabled && reminderDue(count, now);
  const dismissKey = `jobtracker-reminder-dismissed:${username}`;
  const notifyKey = `jobtracker-reminder-notified:${username}`;
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!due || !canNotify() || Notification.permission !== 'granted' || read(notifyKey) === today) return;
    write(notifyKey, today);
    try {
      const n = new Notification('Clark VA 360 Job Tracker', { body: reminderText(count, now), icon: '/images/logo.png', tag: 'jt-daily-goal' });
      n.onclick = () => { window.focus(); onOpen(); n.close(); };
    } catch { /* some mobile browsers only allow notifications from a service worker */ }
  }, [due, today, count, now, notifyKey, onOpen]);

  return {
    show: due && read(dismissKey) !== today,
    text: reminderText(count, now),
    dismiss: () => { write(dismissKey, today); rerender(n => n + 1); },
  };
}

export function ReminderBanner({ text, onOpen, onDismiss }) {
  return (
    <div className={styles.reminder} role="alert">
      <span className={styles.reminderIcon}><AlarmClock size={18} /></span>
      <p><strong>The day is almost over.</strong> {text}</p>
      <button className={styles.btnPrimary} onClick={onOpen}><Plus size={15} /> Log application</button>
      <button className={styles.iconBtn} onClick={onDismiss} aria-label="Dismiss reminder for today" title="Dismiss for today"><X size={16} /></button>
    </div>
  );
}

/* Opt-in for the browser notification. Hidden where notifications aren't supported or are blocked. */
export function NotifyButton() {
  const [perm, setPerm] = useState(() => (canNotify() ? Notification.permission : 'unsupported'));
  if (perm === 'granted') {
    return <span className={styles.notifyOn}><BellRing size={13} /> Reminder on · {REMINDER_LABEL}</span>;
  }
  if (perm !== 'default') return null;
  const ask = async () => {
    try { setPerm(await Notification.requestPermission()); } catch { setPerm('denied'); }
  };
  return (
    <button type="button" className={styles.notifyBtn} onClick={ask}>
      <Bell size={13} /> Remind me at {REMINDER_LABEL} if I’m short
    </button>
  );
}
