import { useState, useEffect, useCallback, useMemo } from 'react';
import { Send, MessageSquareQuote, CalendarClock, ChevronDown, CheckCircle2, PartyPopper, Inbox } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import StatusBadge, { UrgentBadge } from '../StatusBadge';
import SubmissionTable from '../SubmissionTable';
import SubmitTaskModal from './SubmitTaskModal';
import AttachmentList from '../AttachmentList';
import { sortForEmployee, deadlineInfo, formatDeadline, isActionable } from '../taskUtils';
import styles from '../SharedPages.module.css';

const FILTERS = [
  { key: 'all',       label: 'All',         activeClass: styles.filterActive },
  { key: 'todo',      label: 'To do',       activeClass: styles.filterActive },
  { key: 'deadline',  label: 'With deadline', activeClass: styles.filterActive },
  { key: 'nodeadline', label: 'No deadline', activeClass: styles.filterActive },
  { key: 'submitted', label: 'In review',   activeClass: styles.filterPendingActive },
  { key: 'approved',  label: 'Approved',    activeClass: styles.filterApprovedActive },
];

export default function TaskPage({ room, profile }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(null);   // task being submitted
  const [openId, setOpenId] = useState(null);           // task whose submission is expanded
  const [now, setNow] = useState(Date.now());
  const userId = profile?.id;

  const load = useCallback(async (silent = false) => {
    if (!room || !userId || !supabase) return;
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('room_id', room.id)
      .eq('employee_id', userId);
    setTasks(data ?? []);
    setLoading(false);
  }, [room, userId]);

  useEffect(() => { load(); }, [load]);

  /* Realtime: new assignments and review decisions show up instantly */
  useEffect(() => {
    if (!room || !userId || !supabase) return;
    const channel = supabase
      .channel(`ts-my-tasks-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks', filter: `employee_id=eq.${userId}`,
      }, () => load(true))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [room, userId, load]);

  /* Keep "Due in 3h" labels and urgency fresh */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => sortForEmployee(tasks, now), [tasks, now]);

  const counts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter(isActionable).length,
    deadline: tasks.filter(t => t.deadline).length,
    nodeadline: tasks.filter(t => !t.deadline).length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    approved: tasks.filter(t => t.status === 'approved').length,
  }), [tasks]);

  const urgentCount = useMemo(
    () => tasks.filter(t => deadlineInfo(t, now)?.urgent).length,
    [tasks, now],
  );

  const visible = sorted.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'todo') return isActionable(t);
    if (filter === 'deadline') return !!t.deadline;
    if (filter === 'nodeadline') return !t.deadline;
    return t.status === filter;
  });

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>My Tasks</p>
          <p className={styles.pageSubtitle}>
            Tasks assigned to you in <strong>{room.name}</strong>. Complete the work, then submit it for review.
          </p>
        </div>
        {urgentCount > 0 && (
          <div className={styles.urgentSummary}>
            <UrgentBadge /> {urgentCount} {urgentCount === 1 ? 'task needs' : 'tasks need'} attention soon
          </div>
        )}
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Filter tasks">
        {FILTERS.map(({ key, label, activeClass }) => (
          <button
            key={key} role="tab" aria-selected={filter === key}
            className={`${styles.filterTab} ${filter === key ? activeClass : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}<span className={styles.filterCount}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>
            {filter === 'deadline' || filter === 'nodeadline' ? (
              <>
                <span className={styles.emptyIcon}><CalendarClock size={28} /></span>
                <span className={styles.emptyText}>{filter === 'deadline' ? 'No tasks with a deadline' : 'No tasks without a deadline'}</span>
              </>
            ) : filter === 'all' || filter === 'todo' ? (
              <>
                <span className={styles.emptyIcon}>{filter === 'all' ? <Inbox size={28} /> : <PartyPopper size={28} />}</span>
                <span className={styles.emptyText}>{filter === 'all' ? 'No tasks assigned yet' : "You're all caught up"}</span>
                <span className={styles.emptySubtext}>
                  {filter === 'all' ? 'When the room owner assigns you a task, it will appear here and you’ll be notified.' : 'Nothing is waiting on you right now.'}
                </span>
              </>
            ) : (
              <>
                <span className={styles.emptyIcon}><CheckCircle2 size={28} /></span>
                <span className={styles.emptyText}>No {filter === 'submitted' ? 'tasks in review' : 'approved tasks'} yet</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.myTaskCards}>
          {visible.map(task => {
            const info = deadlineInfo(task, now);
            const actionable = isActionable(task);
            const expanded = openId === task.id;
            return (
              <article key={task.id} className={`${styles.myTaskCard} ${info?.urgent ? styles.myTaskUrgent : ''}`}>
                <div className={styles.myTaskHead}>
                  <h4 className={styles.myTaskTitle}>{task.title}</h4>
                  <div className={styles.badgeRow}>
                    {info?.urgent && <UrgentBadge overdue={info.overdue} />}
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {task.description && <p className={styles.myTaskDesc}>{task.description}</p>}
                <AttachmentList items={task.attachments} />

                <div className={styles.myTaskFoot}>
                  <div className={styles.metaRow}>
                    {task.deadline ? (
                      <span className={`${styles.deadlineChip} ${info?.urgent ? styles.deadlineUrgent : ''}`}>
                        <CalendarClock size={13} />
                        {formatDeadline(task.deadline)}
                        {info && !info.done && <em>· {info.label}</em>}
                      </span>
                    ) : (
                      <span className={styles.deadlineChip}><CalendarClock size={13} /> No deadline</span>
                    )}
                  </div>

                  {actionable ? (
                    <button className={styles.submitTaskBtn} onClick={() => setSubmitting(task)}>
                      <Send size={14} /> {task.status === 'rejected' ? 'Revise & resubmit' : 'Submit task'}
                    </button>
                  ) : (
                    <button className={styles.linkBtn} onClick={() => setOpenId(expanded ? null : task.id)} aria-expanded={expanded}>
                      {expanded ? 'Hide' : 'View'} submission
                      <ChevronDown size={13} className={expanded ? styles.chevronUp : ''} />
                    </button>
                  )}
                </div>

                {task.status === 'rejected' && task.reviewer_notes && (
                  <div className={`${styles.feedback} ${styles.feedbackRejected}`}>
                    <MessageSquareQuote size={15} />
                    <div><strong>Revision requested</strong>{task.reviewer_notes}</div>
                  </div>
                )}
                {task.status === 'approved' && (
                  <div className={`${styles.feedback} ${styles.feedbackApproved}`}>
                    <CheckCircle2 size={15} />
                    <div><strong>Approved — you're good to go</strong>{task.reviewer_notes}</div>
                  </div>
                )}

                {expanded && <SubmissionTable rows={task.submission} />}
              </article>
            );
          })}
        </div>
      )}

      {submitting && (
        <SubmitTaskModal
          task={submitting}
          onClose={() => setSubmitting(null)}
          onSubmitted={() => { setSubmitting(null); load(true); }}
        />
      )}
    </div>
  );
}
