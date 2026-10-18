import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Send, Loader, Info } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { CHANNELS, DAYS, POST_STATUSES, emptyRow, dayFromDate, isValidUrl } from '../taskUtils';
import styles from '../SharedPages.module.css';

export default function SubmitTaskModal({ task, onClose, onSubmitted }) {
  const [rows, setRows] = useState(() => (task.submission?.length ? task.submission.map(r => ({ ...r })) : [emptyRow()]));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const update = (i, patch) => {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setErrors(prev => ({ ...prev, [i]: undefined }));
  };
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const validate = () => {
    const errs = {};
    rows.forEach((r, i) => {
      const e = {};
      if (!r.channel) e.channel = true;
      if (!r.day) e.day = true;
      if (!r.date) e.date = true;
      if (!r.time) e.time = true;
      if (!r.topic.trim()) e.topic = true;
      if (!isValidUrl(r.visual.trim())) e.visual = true;
      if (Object.keys(e).length) errs[i] = e;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) { setFormError('Please complete every field in the highlighted rows. Visual must be a valid link.'); return; }
    setSaving(true);
    const cleaned = rows.map(r => ({ ...r, topic: r.topic.trim(), visual: r.visual.trim() }));
    const { error } = await supabase
      .from('tasks')
      .update({ submission: cleaned, status: 'submitted' })
      .eq('id', task.id);
    if (error) { setFormError(error.message); setSaving(false); return; }
    onSubmitted();
  };

  const cell = (i, key) => (errors[i]?.[key] ? styles.cellError : '');

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className={`${styles.modal} ${styles.modalWide}`} role="dialog" aria-modal="true" aria-labelledby="submit-title">
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle} id="submit-title">Submit task</h3>
            <p className={styles.modalSub}>{task.title}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close" disabled={saving}><X size={16} /></button>
        </div>

        {task.status === 'rejected' && task.reviewer_notes && (
          <div className={`${styles.feedback} ${styles.feedbackRejected}`} style={{ marginBottom: 16 }}>
            <Info size={15} />
            <div><strong>Revision requested</strong>{task.reviewer_notes}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.entryWrap}>
            <table className={styles.entryTable}>
              <thead>
                <tr>
                  <th>Channel</th><th>Day</th><th>Status</th><th>Date</th><th>Time</th><th>Post topic</th><th>Visual (Google Drive link)</th><th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td data-label="Channel">
                      <select className={`${styles.cellInput} ${cell(i, 'channel')}`} value={r.channel} onChange={e => update(i, { channel: e.target.value })}>
                        <option value="">Select…</option>
                        {CHANNELS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td data-label="Day">
                      <select className={`${styles.cellInput} ${cell(i, 'day')}`} value={r.day} onChange={e => update(i, { day: e.target.value })}>
                        <option value="">Select…</option>
                        {DAYS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                    <td data-label="Status">
                      <select className={styles.cellInput} value={r.status} onChange={e => update(i, { status: e.target.value })}>
                        {POST_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td data-label="Date">
                      <input
                        type="date" className={`${styles.cellInput} ${cell(i, 'date')}`} value={r.date}
                        onChange={e => update(i, { date: e.target.value, day: dayFromDate(e.target.value) || r.day })}
                      />
                    </td>
                    <td data-label="Time">
                      <input type="time" className={`${styles.cellInput} ${cell(i, 'time')}`} value={r.time} onChange={e => update(i, { time: e.target.value })} />
                    </td>
                    <td data-label="Post topic">
                      <input
                        type="text" className={`${styles.cellInput} ${cell(i, 'topic')}`} placeholder="What is the post about?"
                        value={r.topic} maxLength={200} onChange={e => update(i, { topic: e.target.value })}
                      />
                    </td>
                    <td data-label="Visual">
                      <input
                        type="url" className={`${styles.cellInput} ${cell(i, 'visual')}`} placeholder="https://drive.google.com/…"
                        value={r.visual} onChange={e => update(i, { visual: e.target.value })}
                      />
                    </td>
                    <td className={styles.cellAction}>
                      <button type="button" className={styles.rowRemove} onClick={() => removeRow(i)} disabled={rows.length === 1} aria-label={`Remove row ${i + 1}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className={styles.addRowBtn} onClick={addRow}><Plus size={14} /> Add another post</button>
          <p className={styles.entryHint}>Tip: picking a date fills in the day for you. Set the Drive link to "Anyone with the link can view" so the owner can open your files.</p>

          {formError && <p className={styles.formError} role="alert">{formError}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={`${styles.submitBtn} ${styles.submitInline}`} disabled={saving}>
              {saving ? <Loader size={16} className={styles.spin} /> : <Send size={16} />}
              {saving ? 'Submitting…' : task.status === 'rejected' ? 'Resubmit for approval' : 'Submit task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
