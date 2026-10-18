import { useState, useEffect, useCallback } from 'react';
import { Send, Loader, CheckCircle2, UserPlus, CalendarClock } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import StatusBadge, { getInitials, getName } from '../StatusBadge';
import { formatDeadline } from '../taskUtils';
import styles from '../SharedPages.module.css';

const TITLE_MAX = 120;
const DESC_MAX = 1500;

/* yyyy-mm-ddThh:mm in local time, for <input type="datetime-local" min> */
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function CreateTaskPage({ room, profile, onNavigate }) {
  const [employees, setEmployees] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const load = useCallback(async () => {
    if (!room || !supabase) return;
    const [{ data: members }, { data: tasks }] = await Promise.all([
      supabase.from('room_members').select('user_id, profiles(*)').eq('room_id', room.id).eq('role', 'employee'),
      supabase.from('tasks').select('*, profiles(*)').eq('room_id', room.id)
        .order('created_at', { ascending: false }).limit(6),
    ]);
    setEmployees(members ?? []);
    setRecent(tasks ?? []);
    setLoading(false);
  }, [room]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Please enter a task title.'); return; }
    if (!assignee) { setError('Choose who this task is for.'); return; }
    if (hasDeadline) {
      if (!deadline) { setError('Pick a deadline or turn the deadline option off.'); return; }
      if (new Date(deadline).getTime() < Date.now()) { setError('The deadline must be in the future.'); return; }
    }
    setSaving(true);
    const { error: err } = await supabase.from('tasks').insert({
      room_id: room.id,
      employee_id: assignee,
      assigned_by: profile.id,
      title: title.trim(),
      description: description.trim() || null,
      deadline: hasDeadline ? new Date(deadline).toISOString() : null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }

    const person = employees.find(m => m.user_id === assignee)?.profiles;
    setCreated({ title: title.trim(), name: getName(person) });
    setTitle(''); setDescription(''); setAssignee(''); setHasDeadline(false); setDeadline('');
    load();
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.pageTitle}>Create Task</p>
          <p className={styles.pageSubtitle}>Assign work to a member of <strong>{room.name}</strong>. They’re notified right away.</p>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><UserPlus size={28} /></span>
            <span className={styles.emptyText}>No employees to assign yet</span>
            <span className={styles.emptySubtext}>Share your Room ID and accept join requests first.</span>
            <button className={styles.emptyCta} onClick={() => onNavigate?.('members')}>Go to Members</button>
          </div>
        </div>
      ) : (
        <div className={styles.createGrid}>
          <form className={`${styles.card} ${styles.createForm}`} onSubmit={handleSubmit}>
            {created && (
              <div className={`${styles.feedback} ${styles.feedbackApproved}`} role="status">
                <CheckCircle2 size={16} />
                <div><strong>Task assigned</strong>“{created.title}” was sent to {created.name}.</div>
              </div>
            )}

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="ct-title">Task title *</label>
                <span className={styles.charCount}>{title.length}/{TITLE_MAX}</span>
              </div>
              <input id="ct-title" className={styles.input} placeholder="e.g. Create 5 Instagram posts for the October promo"
                value={title} maxLength={TITLE_MAX} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="ct-desc">Task description</label>
                <span className={styles.charCount}>{description.length}/{DESC_MAX}</span>
              </div>
              <textarea id="ct-desc" className={styles.textarea} rows={5}
                placeholder="Goals, tone, references, anything the employee needs to know…"
                value={description} maxLength={DESC_MAX} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="ct-assignee">Assign to *</label>
              <select id="ct-assignee" className={styles.input} value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">Select a room member…</option>
                {employees.map(m => (
                  <option key={m.user_id} value={m.user_id}>{getName(m.profiles)} — {m.profiles?.email}</option>
                ))}
              </select>
            </div>

            <div className={styles.deadlineBox}>
              <label className={styles.switchRow}>
                <span className={styles.switch}>
                  <input type="checkbox" checked={hasDeadline} onChange={e => setHasDeadline(e.target.checked)} />
                  <span className={styles.switchTrack} />
                </span>
                <span>
                  <strong>Set a deadline</strong>
                  <em>Tasks due soon are marked Urgent and move to the top of the employee’s list.</em>
                </span>
              </label>
              {hasDeadline && (
                <input type="datetime-local" className={`${styles.input} ${styles.deadlineInput}`} value={deadline}
                  min={localNow()} onChange={e => setDeadline(e.target.value)} aria-label="Deadline" />
              )}
            </div>

            {error && <p className={styles.formError} role="alert">{error}</p>}

            <button type="submit" className={`${styles.submitBtn} ${styles.submitInline}`} disabled={saving}>
              {saving ? <Loader size={16} className={styles.spin} /> : <Send size={16} />}
              {saving ? 'Assigning…' : 'Assign task'}
            </button>
          </form>

          <aside className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recently assigned</h3>
              <button className={styles.linkBtn} onClick={() => onNavigate?.('review')}>Review tasks</button>
            </div>
            {recent.length === 0 ? (
              <p className={styles.subEmpty}>Tasks you assign will show up here.</p>
            ) : (
              <ul className={styles.recentList}>
                {recent.map(t => (
                  <li key={t.id} className={styles.recentItem}>
                    <div className={styles.miniAvatar}>{getInitials(t.profiles)}</div>
                    <div className={styles.recentBody}>
                      <p className={styles.recentTitle}>{t.title}</p>
                      <p className={styles.recentMeta}>
                        {getName(t.profiles)}
                        {t.deadline && <> · <CalendarClock size={11} /> {formatDeadline(t.deadline)}</>}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
