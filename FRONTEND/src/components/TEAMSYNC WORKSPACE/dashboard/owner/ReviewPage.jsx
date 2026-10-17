import { useState, useEffect, useCallback } from 'react';
import { Check, X, ChevronDown, Filter, Loader } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import styles from '../SharedPages.module.css';

const STATUS_COLORS = {
  pending: { bg: '#fff3cd', color: '#856404' },
  approved: { bg: '#d4edda', color: '#155724' },
  rejected: { bg: '#f8d7da', color: '#721c24' },
};

export default function ReviewPage({ room, profile }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState('');

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
    setReviewingId(taskId);
    await supabase.from('tasks').update({ status, reviewer_notes: notes || null }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, reviewer_notes: notes || null } : t));
    setExpandedId(null);
    setNotes('');
    setReviewingId(null);
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const getInitials = (p) => p ? `${p.first_name[0]}${p.last_name[0]}`.toUpperCase() : '?';
  const getName = (p) => p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    approved: tasks.filter(t => t.status === 'approved').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
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
            {filter === 'pending' ? (
              <>
                <span className={styles.emptyIcon}>🎉</span>
                <span className={styles.emptyText}>All caught up!</span>
                <span className={styles.emptySubtext}>No tasks are waiting for review</span>
              </>
            ) : filter === 'all' ? (
              <>
                <span className={styles.emptyIcon}>📋</span>
                <span className={styles.emptyText}>No tasks submitted yet</span>
                <span className={styles.emptySubtext}>Tasks from employees will appear here</span>
              </>
            ) : (
              <>
                <span className={styles.emptyIcon}>{filter === 'approved' ? '✅' : '❌'}</span>
                <span className={styles.emptyText}>No {filter} tasks yet</span>
              </>
            )}
          </div>
        ) : (
          <div className={styles.taskList}>
            {filtered.map(task => {
              const sc = STATUS_COLORS[task.status];
              const isExpanded = expandedId === task.id;
              return (
                <div key={task.id} className={`${styles.taskItem} ${isExpanded ? styles.taskExpanded : ''}`}>
                  <div className={styles.taskRow}>
                    {/* Employee */}
                    <div className={styles.taskEmployee}>
                      <div className={styles.miniAvatar}>{getInitials(task.profiles)}</div>
                      <span className={styles.empNameSm}>{getName(task.profiles)}</span>
                    </div>

                    {/* Title + desc */}
                    <div className={styles.taskInfo}>
                      <p className={styles.taskTitle}>{task.title}</p>
                      {task.description && (
                        <p className={styles.taskDesc}>{task.description}</p>
                      )}
                    </div>

                    {/* Date */}
                    <span className={styles.taskDate}>{formatDate(task.created_at)}</span>

                    {/* Status badge */}
                    <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>
                      {task.status}
                    </span>

                    {/* Actions */}
                    {task.status === 'pending' && (
                      <div className={styles.taskActions}>
                        <button
                          className={styles.approveBtn}
                          onClick={() => { setExpandedId(isExpanded ? null : task.id); setNotes(''); }}
                        >
                          Review <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expand: review panel */}
                  {isExpanded && (
                    <div className={styles.reviewPanel}>
                      <label className={styles.reviewLabel}>Notes for employee (optional)</label>
                      <textarea
                        className={styles.reviewTextarea}
                        rows={3}
                        placeholder="Add feedback or notes…"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                      <div className={styles.reviewBtnRow}>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleReview(task.id, 'rejected')}
                          disabled={reviewingId === task.id}
                        >
                          {reviewingId === task.id ? <Loader size={14} className={styles.spin} /> : <X size={14} />}
                          Reject
                        </button>
                        <button
                          className={styles.acceptBtn}
                          onClick={() => handleReview(task.id, 'approved')}
                          disabled={reviewingId === task.id}
                        >
                          {reviewingId === task.id ? <Loader size={14} className={styles.spin} /> : <Check size={14} />}
                          Approve
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show reviewer notes if reviewed */}
                  {task.reviewer_notes && task.status !== 'pending' && (
                    <div className={styles.reviewerNote}>
                      <strong>Owner note:</strong> {task.reviewer_notes}
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
