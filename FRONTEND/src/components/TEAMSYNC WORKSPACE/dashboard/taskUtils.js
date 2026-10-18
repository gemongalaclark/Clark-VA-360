/* Shared task helpers for owner + employee pages */

export const URGENT_HOURS = 48;

export const CHANNELS = [
  'All social media accounts',
  'Facebook', 'Instagram', 'TikTok', 'X (Twitter)',
  'LinkedIn', 'YouTube', 'Pinterest', 'Threads',
];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const POST_STATUSES = ['Planned', 'In progress', 'Scheduled', 'Published'];

export const emptyRow = () => ({
  channel: '', day: '', status: 'Planned', date: '', time: '', topic: '', visual: '',
});

/** Monday–Sunday name for a yyyy-mm-dd string (local, no timezone shift) */
export const dayFromDate = (yyyyMmDd) => {
  if (!yyyyMmDd) return '';
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const idx = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  return DAYS[(idx + 6) % 7];
};

export const isActionable = (task) => task.status === 'assigned' || task.status === 'rejected';

/** { label, urgent, overdue } or null when the task has no deadline / is already done */
export const deadlineInfo = (task, now = Date.now()) => {
  if (!task.deadline) return null;
  const due = new Date(task.deadline).getTime();
  const done = !isActionable(task);
  const diffH = (due - now) / 36e5;
  const overdue = !done && diffH < 0;
  const urgent = !done && diffH <= URGENT_HOURS;

  let label;
  if (overdue) {
    const h = Math.abs(diffH);
    label = h < 24 ? `Overdue by ${Math.max(1, Math.floor(h))}h` : `Overdue by ${Math.floor(h / 24)}d`;
  } else if (diffH < 1) label = 'Due within the hour';
  else if (diffH < 24) label = `Due in ${Math.floor(diffH)}h`;
  else label = `Due in ${Math.floor(diffH / 24)}d`;
  return { label, urgent, overdue, done };
};

export const formatDeadline = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Employee ordering:
 *  1. actionable tasks with an urgent/overdue deadline (soonest first)
 *  2. other actionable tasks with a deadline (soonest first)
 *  3. actionable tasks without a deadline (oldest first)
 *  4. submitted, then approved (newest first)
 */
export const sortForEmployee = (tasks, now = Date.now()) => {
  const rank = (t) => {
    if (isActionable(t)) {
      const info = deadlineInfo(t, now);
      if (info?.urgent) return 0;
      return t.deadline ? 1 : 2;
    }
    return t.status === 'submitted' ? 3 : 4;
  };
  return [...tasks].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra <= 1) return new Date(a.deadline) - new Date(b.deadline);
    if (ra === 2) return new Date(a.created_at) - new Date(b.created_at);
    return new Date(b.updated_at ?? b.created_at) - new Date(a.updated_at ?? a.created_at);
  });
};

export const isValidUrl = (v) => {
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
};
