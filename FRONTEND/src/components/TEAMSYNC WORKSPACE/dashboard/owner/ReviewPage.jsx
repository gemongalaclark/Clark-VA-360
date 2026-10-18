import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, RotateCcw, ChevronDown, Loader, Search, CalendarClock } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import StatusBadge, { UrgentBadge, getInitials, getName } from '../StatusBadge';
import SubmissionTable from '../SubmissionTable';
import { deadlineInfo, formatDeadline } from '../taskUtils';
import styles from '../SharedPages.module.css';

const FILTERS = [
  { key: 'all',      label: 'All',      activeClass: styles.filterActive },
  { key: 'submitted', label: 'To review', activeClass: styles.filterPendingActive },
  { key: 'assigned',  label: 'Assigned',  activeClass: styles.filterActive },
  { key: 'approved',  label: 'Approved',  activeClass: styles.filterApprovedActive },
  { key: 'rejected',  label: 'Revision',  activeClass: styles.filterRejectedActive },
];

export default function ReviewPage({ room }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState('');
  const [noteError, setNoteError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!room || !supabase) return;
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles(*)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  }, [room]);

  useEffect(() => { load(); }, [load]);

  /* Realtime updates */
  useEffect(() => {
    if (!room || !supabase) return;
    const channel = supabase
      .channel('ts-review-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `room_id=eq.${room.id}` },
        () => load(true))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [room, load]);

  const handleReview = async (taskId, status) => {
    const note = notes.trim();
    if (status === 'rejected' && !note) {
      setNoteError('Please explain why you are declining or what needs to be revised.');
      return;
    }
    setNoteError('');
    setReviewingId(taskId);
    const { error } = await supabase.from('tasks').update({ status, reviewer_notes: note || null }).eq('id', taskId);
    if (error) { setNoteError(error.message); setReviewingId(null); return; }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, reviewer_notes: note || null } : t));
    setExpandedId(null);
    setNotes('');
    setReviewingId(null);
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const counts = useMemo(() => ({
    all: tasks.length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    assigned: tasks.filter(t => t.status === 'assigned').length,
    approved: tasks.filter(t => t.status === 'approved').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  }), [tasks]);

  /* Pending work floats to the top of "All"; search matches employee or title */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter(t => filter === 'all' || t.status === filter)
      .filter(t => !q || t.title.toLowerCase().includes(q) || getName(t.profiles).toLowerCase().includes(q))
      .sort((a, b) => (filter === 'all' ? (b.status === 'submitted') - (a.status === 'submitted') : 0));
  }, [tasks, filter, query]);

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>Review Tasks</p>
          <p className={styles.pageSubtitle}>
            {counts.submitted > 0
              ? <><strong>{counts.submitted}</strong> {counts.submitted === 1 ? 'task is' : 'tasks are'} waiting for your decision.</>
              : 'Nothing is waiting — completed tasks will appear here in real time.'}
          </p>
        </div>
        <div className={styles.pageHeaderBadge}>{counts.approved} approved · {counts.rejected} in revision</div>
      </div>

      {/* Toolbar: filters + search */}
      <div className={styles.toolbar}>
        <div className={styles.filterRow} role="tablist" aria-label="Filter tasks by status">
          {FILTERS.map(({ key, label, activeClass }) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              className={`${styles.filterTab} ${filter === key ? activeClass : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className={styles.filterCount}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <label className={styles.searchBox}>
          <Search size={15} />
          <input
            type="search"
            placeholder="Search employee or task…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search tasks"
          />
        </label>
      </div>

      {/* Task list */}
      <div className={styles.card}>
        {visible.length === 0 ? (
          <div className={styles.emptyState}>
            {query ? (
              <>
                <span className={styles.emptyIcon}>🔍</span>
                <span className={styles.emptyText}>No matches for “{query}”</span>
                <span className={styles.emptySubtext}>Try a different name or task title</span>
              </>
            ) : filter === 'submitted' ? (
              <>
                <span className={styles.emptyIcon}>🎉</span>
                <span className={styles.emptyText}>All caught up!</span>
                <span className={styles.emptySubtext}>No tasks are waiting for review</span>
              </>
            ) : filter === 'all' ? (
              <>
                <span className={styles.emptyIcon}>📋</span>
                <span className={styles.emptyText}>No tasks yet</span>
                <span className={styles.emptySubtext}>Create a task and assign it to an employee to get started</span>
              </>
            ) : (
              <>
                <span className={styles.emptyIcon}>{filter === 'approved' ? '✅' : '🔁'}</span>
                <span className={styles.emptyText}>No {filter === 'rejected' ? 'tasks in revision' : `${filter} tasks`} yet</span>
              </>
            )}
          </div>
        ) : (
          <div className={styles.taskList}>
            {visible.map(task => {
              const isExpanded = expandedId === task.id;
              const busy = reviewingId === task.id;
              const info = deadlineInfo(task);
              return (
                <div
                  key={task.id}
                  data-status={task.status}
                  className={`${styles.taskItem} ${isExpanded ? styles.taskExpanded : ''}`}
                >
                  <div className={styles.taskRow}>
                    <div className={styles.taskEmployee}>
                      <div className={styles.miniAvatar}>{getInitials(task.profiles)}</div>
                      <span className={styles.empNameSm}>{getName(task.profiles)}</span>
                    </div>

                    <div className={styles.taskInfo}>
                      <p className={styles.taskTitle}>{task.title}</p>
                      {task.description && <p className={styles.taskDesc}>{task.description}</p>}
                      {task.deadline && (
                        <span className={`${styles.deadlineChip} ${info?.urgent ? styles.deadlineUrgent : ''}`}>
                          <CalendarClock size={12} /> {formatDeadline(task.deadline)}{info && !info.done && <em>· {info.label}</em>}
                        </span>
                      )}
                    </div>

                    <span className={styles.taskDate}>{formatDate(task.created_at)}</span>
                    {info?.urgent && <UrgentBadge overdue={info.overdue} />}
                    <StatusBadge status={task.status} />

                    {task.status === 'submitted' && (
                      <button
                        className={styles.reviewToggle}
                        aria-expanded={isExpanded}
                        onClick={() => { setExpandedId(isExpanded ? null : task.id); setNotes(''); setNoteError(''); }}
                      >
                        Review
                        <ChevronDown size={14} className={isExpanded ? styles.chevronUp : ''} />
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className={styles.reviewPanel}>
                      {task.description && (
                        <div className={styles.fullDesc}>
                          <span className={styles.fullDescLabel}>Task description</span>
                          {task.description}
                        </div>
                      )}
                      <span className={styles.fullDescLabel}>Submission</span>
                      <SubmissionTable rows={task.submission} />
                      <label className={styles.reviewLabel} htmlFor={`notes-${task.id}`}>
                        Feedback for {task.profiles?.first_name ?? 'employee'} <span className={styles.optional}>(required if you request a revision)</span>
                      </label>
                      <textarea
                        id={`notes-${task.id}`}
                        className={styles.reviewTextarea}
                        rows={3}
                        placeholder="Say what went well, or exactly what to change…"
                        value={notes}
                        onChange={e => { setNotes(e.target.value); setNoteError(''); }}
                        autoFocus
                      />
                      {noteError && <p className={styles.formError} role="alert">{noteError}</p>}
                      <div className={styles.reviewBtnRow}>
                        <button className={styles.cancelBtn} onClick={() => setExpandedId(null)} disabled={busy}>Cancel</button>
                        <button className={styles.rejectBtn} onClick={() => handleReview(task.id, 'rejected')} disabled={busy}>
                          {busy ? <Loader size={14} className={styles.spin} /> : <RotateCcw size={14} />} Decline / request revision
                        </button>
                        <button className={styles.acceptBtn} onClick={() => handleReview(task.id, 'approved')} disabled={busy}>
                          {busy ? <Loader size={14} className={styles.spin} /> : <Check size={14} />} Approve
                        </button>
                      </div>
                    </div>
                  )}

                  {task.reviewer_notes && (task.status === 'approved' || task.status === 'rejected') && (
                    <div className={styles.reviewerNote}>
                      <strong>Your note:</strong> {task.reviewer_notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
