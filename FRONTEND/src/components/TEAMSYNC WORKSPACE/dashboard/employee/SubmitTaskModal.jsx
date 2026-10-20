import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Send, Loader, Info, AlertCircle, Link2 } from 'lucide-react';
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

  /* Portal to <body> so the page's animated transform can't trap the fixed overlay */
  return createPortal(
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

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.postList}>
            {rows.map((r, i) => (
              <fieldset key={i} className={`${styles.postCard} ${errors[i] ? styles.postCardError : ''}`}>
                <div className={styles.postCardHead}>
                  <span className={styles.postNum}>{i + 1}</span>
                  <span className={styles.postCardTitle}>Post {i + 1}</span>
                  {errors[i] && <span className={styles.postCardFlag}><AlertCircle size={13} /> Needs attention</span>}
                  <button type="button" className={styles.rowRemove} onClick={() => removeRow(i)} disabled={rows.length === 1} aria-label={`Remove post ${i + 1}`} title="Remove post">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className={styles.postGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Channel</span>
                    <select className={`${styles.cellInput} ${cell(i, 'channel')}`} value={r.channel} onChange={e => update(i, { channel: e.target.value })}>
                      <option value="">Select channel…</option>
                      {CHANNELS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {errors[i]?.channel && <span className={styles.fieldError}>Choose a channel</span>}
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <select className={styles.cellInput} value={r.status} onChange={e => update(i, { status: e.target.value })}>
                      {POST_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Date</span>
                    <input
                      type="date" className={`${styles.cellInput} ${cell(i, 'date')}`} value={r.date}
                      onChange={e => update(i, { date: e.target.value, day: dayFromDate(e.target.value) || r.day })}
                    />
                    {errors[i]?.date && <span className={styles.fieldError}>Pick a date</span>}
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Day</span>
                    <select className={`${styles.cellInput} ${cell(i, 'day')}`} value={r.day} onChange={e => update(i, { day: e.target.value })}>
                      <option value="">Auto from date</option>
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                    {errors[i]?.day && <span className={styles.fieldError}>Choose a day</span>}
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Time</span>
                    <input type="time" className={`${styles.cellInput} ${cell(i, 'time')}`} value={r.time} onChange={e => update(i, { time: e.target.value })} />
                    {errors[i]?.time && <span className={styles.fieldError}>Set a time</span>}
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.fieldLabel}>Post topic</span>
                    <input
                      type="text" className={`${styles.cellInput} ${cell(i, 'topic')}`} placeholder="What is the post about?"
                      value={r.topic} maxLength={200} onChange={e => update(i, { topic: e.target.value })}
                    />
                    {errors[i]?.topic && <span className={styles.fieldError}>Describe the post</span>}
                  </label>

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.fieldLabel}>Visual (Google Drive link)</span>
                    <span className={styles.inputIcon}>
                      <Link2 size={14} />
                      <input
                        type="url" className={`${styles.cellInput} ${cell(i, 'visual')}`} placeholder="https://drive.google.com/…"
                        value={r.visual} onChange={e => update(i, { visual: e.target.value })}
                      />
                    </span>
                    {errors[i]?.visual && <span className={styles.fieldError}>Enter a valid link (https://…)</span>}
                  </label>
                </div>
              </fieldset>
            ))}
          </div>

          <button type="button" className={styles.addRowBtn} onClick={addRow}><Plus size={14} /> Add another post</button>
          <p className={styles.entryHint}><Info size={13} /> Picking a date fills in the day for you. Set the Drive link to "Anyone with the link can view" so the owner can open your files.</p>

          {formError && <p className={styles.formError} role="alert">{formError}</p>}

          <div className={styles.modalFooter}>
            <span className={styles.footerCount}>{rows.length} {rows.length === 1 ? 'post' : 'posts'} in this submission</span>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={`${styles.submitBtn} ${styles.submitInline}`} disabled={saving}>
              {saving ? <Loader size={16} className={styles.spin} /> : <Send size={16} />}
              {saving ? 'Submitting…' : task.status === 'rejected' ? 'Resubmit for approval' : 'Submit task'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
