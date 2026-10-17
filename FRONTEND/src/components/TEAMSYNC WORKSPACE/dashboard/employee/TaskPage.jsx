import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader, X, Send, Trash2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import styles from '../SharedPages.module.css';

const STATUS_COLORS = {
  pending:  { bg: '#fff3cd', color: '#856404' },
  approved: { bg: '#d4edda', color: '#155724' },
  rejected: { bg: '#f8d7da', color: '#721c24' },
};

export default function TaskPage({ room, profile }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    if (!room || !profile || !supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('room_id', room.id)
      .eq('employee_id', profile.id)
      .order('created_at', { ascending: false });
    setTasks(data ?? []);
    setLoading(false);
  }, [room, profile]);

  useEffect(() => { load(); }, [load]);

  /* Realtime updates for own tasks */
  useEffect(() => {
    if (!room || !profile || !supabase) return;
    const channel = supabase
      .channel('ts-my-tasks')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `room_id=eq.${room.id}`,
      }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [room, profile, load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) { setFormError('Please enter a task title.'); return; }
    setSubmitting(true);

    const { error } = await supabase.from('tasks').insert({
      room_id: room.id,
      employee_id: profile.id,
      title: title.trim(),
      description: description.trim() || null,
    });

    if (error) { setFormError(error.message); setSubmitting(false); return; }

    setTitle('');
    setDescription('');
    setShowModal(false);
    setSubmitting(false);
    load();
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    setDeletingId(taskId);
    await supabase.from('tasks').delete().eq('id', taskId).eq('status', 'pending');
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDeletingId(null);
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    approved: tasks.filter(t => t.status === 'approved').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>My Tasks</p>
          <p className={styles.pageSubtitle}>
            Submit completed work to <strong>{room.name}</strong> for owner review.
          </p>
        </div>
        <button className={styles.addTaskBtn} onClick={() => setShowModal(true)}>
          <Plus size={16} /> Submit New Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterRow}>
        {[
          { key: 'all',      label: 'All',      activeClass: styles.filterActive },
          { key: 'pending',  label: 'Pending',  activeClass: styles.filterPendingActive },
          { key: 'approved', label: 'Approved', activeClass: styles.filterApprovedActive },
          { key: 'rejected', label: 'Rejected', activeClass: styles.filterRejectedActive },
        ].map(({ key, label, activeClass }) => (
          <button
            key={key}
            className={`${styles.filterTab} ${filter === key ? activeClass : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className={styles.filterCount}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className={styles.card}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {filter === 'all' ? (
              <>
                <span className={styles.emptyIcon}>✍️</span>
                <span className={styles.emptyText}>No tasks submitted yet</span>
                <span className={styles.emptySubtext}>Click "Submit New Task" above to log your first task</span>
              </>
            ) : filter === 'pending' ? (
              <>
                <span className={styles.emptyIcon}>🎉</span>
                <span className={styles.emptyText}>No tasks pending review</span>
              </>
            ) : (
              <>
                <span className={styles.emptyIcon}>{filter === 'approved' ? '✅' : '❌'}</span>
                <span className={styles.emptyText}>No {filter} tasks yet</span>
              </>
            )}
          </div>
        ) : (
          <div className={styles.myTaskList}>
            {filtered.map(task => {
              const sc = STATUS_COLORS[task.status];
              return (
                <div key={task.id} className={styles.myTaskItem}>
                  <div className={styles.myTaskBody}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <p className={styles.myTaskTitle}>{task.title}</p>
                      <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color, flexShrink: 0 }}>
                        {task.status}
                      </span>
                    </div>
                    {task.description && <p className={styles.myTaskDesc}>{task.description}</p>}
                    <div className={styles.myTaskMeta}>
                      <span className={styles.myTaskDate}>Submitted {formatDate(task.created_at)}</span>
                      {task.updated_at !== task.created_at && (
                        <span className={styles.myTaskDate}>· Updated {formatDate(task.updated_at)}</span>
                      )}
                    </div>
                    {task.reviewer_notes && (
                      <div className={styles.reviewerNoteEmp}>
                        <strong>Owner feedback:</strong> {task.reviewer_notes}
                      </div>
                    )}
                  </div>
                  {task.status === 'pending' && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(task.id)}
                      disabled={deletingId === task.id}
                      title="Delete task"
                    >
                      {deletingId === task.id ? <Loader size={13} className={styles.spin} /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit task modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Submit New Task</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Task Title *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="What did you work on?"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description (optional)</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Add details, links, or notes for the owner…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={1000}
                />
              </div>
              {formError && <p className={styles.formError}>{formError}</p>}
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? <Loader size={16} className={styles.spin} /> : <Send size={16} />}
                {submitting ? 'Submitting…' : 'Submit Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
