import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, RotateCcw, ChevronDown, Loader, Search, CalendarClock, Pencil, Save, ChevronLeft, ChevronRight, Trash2, TriangleAlert } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import StatusBadge, { UrgentBadge, getName } from '../StatusBadge';
import SubmissionTable from '../SubmissionTable';
import AttachmentList from '../AttachmentList';
import { deadlineInfo, formatDeadline, isActionable } from '../taskUtils';
import { fetchRoomTasks } from '../taskApi';
import { removeUploaded } from '../attachmentApi';
import styles from '../SharedPages.module.css';
import Avatar from '../../profile/Avatar';

const PAGE_SIZE = 5;

const FILTERS = [
  { key: 'all',      label: 'All',      activeClass: styles.filterActive },
  { key: 'submitted', label: 'To review', activeClass: styles.filterPendingActive },
  { key: 'assigned',  label: 'Assigned',  activeClass: styles.filterActive },
  { key: 'approved',  label: 'Approved',  activeClass: styles.filterApprovedActive },
  { key: 'rejected',  label: 'Revision',  activeClass: styles.filterRejectedActive },
];

const TITLE_MAX = 120;
const DESC_MAX = 1500;

/* ISO -> value for <input type="datetime-local"> in the viewer's timezone */
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function ReviewPage({ room }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState('');
  const [noteError, setNoteError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', description: '', hasDeadline: false, deadline: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);   // task whose delete confirmation is open
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!room || !supabase) return;
    if (!silent) setLoading(true);
    const { data, error } = await fetchRoomTasks(room.id);
    if (error) console.error('Could not load tasks:', error.message);
    setLoadError(error ? error.message : '');
    if (!error) setTasks(data);
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

  const toggleDelete = (task) => {
    setExpandedId(null);
    setEditingId(null);
    setDeleteError('');
    setDeletingId(id => (id === task.id ? null : task.id));
  };

  const handleDelete = async (task) => {
    setDeleteBusy(true);
    setDeleteError('');
    /* .select() lets us detect an RLS-blocked delete (0 rows, no error) */
    const { data, error } = await supabase.from('tasks').delete().eq('id', task.id).select('id');
    if (error || !data?.length) {
      setDeleteError(error?.message ?? 'You don’t have permission to delete this task.');
      setDeleteBusy(false);
      return;
    }
    /* Row is gone — clean up its stored files; a failure here only leaves orphaned objects */
    const paths = (task.attachments ?? []).filter(a => a.type === 'file' && a.path).map(a => a.path);
    try { await removeUploaded(paths); } catch (e) { console.error('Could not remove task files:', e); }
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setDeletingId(null);
    setDeleteBusy(false);
  };

  const startEdit = (task) => {
    setDeletingId(null);
    setExpandedId(null);
    setEditError('');
    setDraft({
      title: task.title,
      description: task.description ?? '',
      hasDeadline: !!task.deadline,
      deadline: toLocalInput(task.deadline),
    });
    setEditingId(task.id);
  };

  const handleSaveEdit = async (task) => {
    const title = draft.title.trim();
    if (!title) { setEditError('Please enter a task title.'); return; }
    if (draft.hasDeadline && !draft.deadline) { setEditError('Pick a deadline or turn the deadline option off.'); return; }
    const deadline = draft.hasDeadline ? new Date(draft.deadline).toISOString() : null;
    const deadlineChanged = deadline !== (task.deadline ? new Date(task.deadline).toISOString() : null);
    if (deadline && deadlineChanged && new Date(deadline).getTime() < Date.now()) {
      setEditError('The deadline must be in the future.');
      return;
    }
    setSaving(true);
    const changes = { title, description: draft.description.trim() || null, deadline };
    const { error } = await supabase.from('tasks').update(changes).eq('id', task.id);
    setSaving(false);
    if (error) { setEditError(error.message); return; }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...changes } : t));
    setEditingId(null);
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

  /* 5 tasks per page; page resets when the filter/search changes and is clamped if the list shrinks */
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageTasks = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filter, query]);

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

      {loadError && (
        <p className={styles.formError} role="alert">Couldn’t load tasks: {loadError}</p>
      )}

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
            {pageTasks.map(task => {
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
                      <Avatar profile={task.profiles} className={styles.miniAvatar} />
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

                    {isActionable(task) && (
                      <button
                        className={styles.cancelBtn}
                        aria-expanded={editingId === task.id}
                        onClick={() => editingId === task.id ? setEditingId(null) : startEdit(task)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                    )}

                    {task.status === 'submitted' && (
                      <button
                        className={styles.reviewToggle}
                        aria-expanded={isExpanded}
                        onClick={() => { setDeletingId(null); setExpandedId(isExpanded ? null : task.id); setNotes(''); setNoteError(''); }}
                      >
                        Review
                        <ChevronDown size={14} className={isExpanded ? styles.chevronUp : ''} />
                      </button>
                    )}

                    <button
                      className={styles.iconDeleteBtn}
                      aria-label={`Delete task “${task.title}”`}
                      title="Delete task"
                      aria-expanded={deletingId === task.id}
                      onClick={() => toggleDelete(task)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {deletingId === task.id && (
                    <div className={styles.reviewPanel} role="alertdialog" aria-label="Confirm task deletion">
                      <div className={styles.deleteWarn}>
                        <TriangleAlert size={18} />
                        <div>
                          <strong>Delete “{task.title}”?</strong>
                          <p>
                            This permanently removes the task{task.submission?.length ? ', the submission' : ''}
                            {task.attachments?.length ? ' and its attachments' : ''} for {getName(task.profiles)}. This can’t be undone.
                          </p>
                        </div>
                      </div>
                      {deleteError && <p className={styles.formError} role="alert">{deleteError}</p>}
                      <div className={styles.reviewBtnRow}>
                        <button className={styles.cancelBtn} onClick={() => setDeletingId(null)} disabled={deleteBusy} autoFocus>Cancel</button>
                        <button className={styles.dangerBtn} onClick={() => handleDelete(task)} disabled={deleteBusy}>
                          {deleteBusy ? <Loader size={14} className={styles.spin} /> : <Trash2 size={14} />} Delete task
                        </button>
                      </div>
                    </div>
                  )}

                  {editingId === task.id && (
                    <div className={styles.reviewPanel}>
                      <label className={styles.reviewLabel} htmlFor={`edit-title-${task.id}`}>Task title *</label>
                      <input
                        id={`edit-title-${task.id}`}
                        className={styles.input}
                        value={draft.title}
                        maxLength={TITLE_MAX}
                        onChange={e => { setDraft(d => ({ ...d, title: e.target.value })); setEditError(''); }}
                        autoFocus
                      />
                      <label className={styles.reviewLabel} htmlFor={`edit-desc-${task.id}`}>Task description</label>
                      <textarea
                        id={`edit-desc-${task.id}`}
                        className={styles.reviewTextarea}
                        rows={4}
                        value={draft.description}
                        maxLength={DESC_MAX}
                        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                      />
                      <div className={styles.deadlineBox}>
                        <label className={styles.switchRow}>
                          <span className={styles.switch}>
                            <input
                              type="checkbox"
                              checked={draft.hasDeadline}
                              onChange={e => setDraft(d => ({ ...d, hasDeadline: e.target.checked }))}
                            />
                            <span className={styles.switchTrack} />
                          </span>
                          <span><strong>Set a deadline</strong></span>
                        </label>
                        {draft.hasDeadline && (
                          <input
                            type="datetime-local"
                            className={`${styles.input} ${styles.deadlineInput}`}
                            value={draft.deadline}
                            onChange={e => { setDraft(d => ({ ...d, deadline: e.target.value })); setEditError(''); }}
                            aria-label="Deadline"
                          />
                        )}
                      </div>
                      {editError && <p className={styles.formError} role="alert">{editError}</p>}
                      <div className={styles.reviewBtnRow}>
                        <button className={styles.cancelBtn} onClick={() => setEditingId(null)} disabled={saving}>Cancel</button>
                        <button className={styles.acceptBtn} onClick={() => handleSaveEdit(task)} disabled={saving}>
                          {saving ? <Loader size={14} className={styles.spin} /> : <Save size={14} />} Save changes
                        </button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className={styles.reviewPanel}>
                      {task.description && (
                        <div className={styles.fullDesc}>
                          <span className={styles.fullDescLabel}>Task description</span>
                          {task.description}
                        </div>
                      )}
                      <AttachmentList items={task.attachments} />
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

        {totalPages > 1 && (
          <nav className={styles.pager} aria-label="Task pages">
            <span className={styles.pagerInfo}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visible.length)} of {visible.length}
            </span>
            <div className={styles.pagerBtns}>
              <button className={styles.pagerBtn} onClick={() => setPage(safePage - 1)} disabled={safePage === 1} aria-label="Previous page">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`${styles.pagerBtn} ${n === safePage ? styles.pagerActive : ''}`}
                  onClick={() => setPage(n)}
                  aria-current={n === safePage ? 'page' : undefined}
                >{n}</button>
              ))}
              <button className={styles.pagerBtn} onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} aria-label="Next page">
                <ChevronRight size={15} />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
