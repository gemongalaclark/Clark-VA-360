import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Loader, CheckCircle2, UserPlus, CalendarClock, Paperclip, Link2, FileText, X, Plus, Upload, Sparkles, Undo2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import StatusBadge, { getName } from '../StatusBadge';
import { formatDeadline } from '../taskUtils';
import { fetchRoomTasks } from '../taskApi';
import { generateBrief } from '../aiApi';
import {
  ATTACH_MAX_FILES, ATTACH_MAX_BYTES, ATTACH_NOTE_MAX,
  formatBytes, normalizeUrl, uploadAttachments, removeUploaded,
} from '../attachmentApi';
import styles from '../SharedPages.module.css';
import Avatar from '../../profile/Avatar';

const TITLE_MAX = 120;
const DESC_MAX = 1500;
const RECENT_VISIBLE = 5;  // newest tasks shown; older ones go to the archive view
const RECENT_FETCH = 30;

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
  const [showArchive, setShowArchive] = useState(false);
  const [attachments, setAttachments] = useState([]);   // { id, kind:'file'|'link', file | url+title, note }
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefUndo, setBriefUndo] = useState(null);     // description before the AI rewrite

  const load = useCallback(async () => {
    if (!room || !supabase) return;
    const [{ data: members }, { data: tasks, error: tasksErr }] = await Promise.all([
      supabase.from('room_members').select('user_id, profiles(*)').eq('room_id', room.id).eq('role', 'employee'),
      fetchRoomTasks(room.id, { limit: RECENT_FETCH }),
    ]);
    if (tasksErr) console.error('Could not load recent tasks:', tasksErr.message);
    setEmployees(members ?? []);
    setRecent(tasks ?? []);
    setLoading(false);
  }, [room]);

  useEffect(() => { load(); }, [load]);

  const addFiles = (list) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    setError('');
    const slotsLeft = ATTACH_MAX_FILES - attachments.length;
    const tooBig = picked.filter(f => f.size > ATTACH_MAX_BYTES);
    const ok = picked.filter(f => f.size <= ATTACH_MAX_BYTES).slice(0, Math.max(0, slotsLeft));
    if (tooBig.length) setError(`“${tooBig[0].name}” is over ${formatBytes(ATTACH_MAX_BYTES)} — share it as a link instead.`);
    else if (picked.length > slotsLeft) setError(`You can attach up to ${ATTACH_MAX_FILES} items.`);
    setAttachments(prev => [...prev, ...ok.map(file => ({ id: crypto.randomUUID(), kind: 'file', file, note: '' }))]);
  };

  const addLink = () => {
    const url = normalizeUrl(linkUrl);
    if (!url) { setError('Enter a valid link, e.g. https://drive.google.com/…'); return; }
    if (attachments.length >= ATTACH_MAX_FILES) { setError(`You can attach up to ${ATTACH_MAX_FILES} items.`); return; }
    setError('');
    setAttachments(prev => [...prev, { id: crypto.randomUUID(), kind: 'link', url, title: '', note: '' }]);
    setLinkUrl(''); setLinkOpen(false);
  };

  const updateAttachment = (id, patch) =>
    setAttachments(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
  const removeAttachment = (id) => setAttachments(prev => prev.filter(a => a.id !== id));

  /* The owner's existing notes are sent along and folded into the brief; Undo restores them */
  const writeBrief = async () => {
    if (!title.trim()) { setError('Type a task title first — the AI writes the brief from it.'); return; }
    setError(''); setBriefBusy(true);
    try {
      const brief = await generateBrief({ roomId: room.id, title: title.trim(), notes: description.trim() });
      setBriefUndo(description);
      setDescription(brief);
    } catch (err) {
      setError(`AI brief failed: ${err.message}`);
    }
    setBriefBusy(false);
  };

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
    let uploaded;
    try {
      uploaded = await uploadAttachments(room.id, attachments);
    } catch (upErr) {
      setSaving(false); setError(upErr.message); return;
    }
    const { error: err } = await supabase.from('tasks').insert({
      room_id: room.id,
      employee_id: assignee,
      assigned_by: profile.id,
      title: title.trim(),
      description: description.trim() || null,
      deadline: hasDeadline ? new Date(deadline).toISOString() : null,
      attachments: uploaded.attachments,
    });
    setSaving(false);
    if (err) { await removeUploaded(uploaded.uploadedPaths); setError(err.message); return; }

    const person = employees.find(m => m.user_id === assignee)?.profiles;
    setCreated({ title: title.trim(), name: getName(person) });
    setTitle(''); setDescription(''); setAssignee(''); setHasDeadline(false); setDeadline('');
    setAttachments([]); setLinkOpen(false); setLinkUrl(''); setBriefUndo(null);
    load();
  };

  const archivedTasks = recent.slice(RECENT_VISIBLE);
  const shown = showArchive ? archivedTasks : recent.slice(0, RECENT_VISIBLE);

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
              <div className={styles.aiBriefRow}>
                <button type="button" className={styles.aiBtn} onClick={writeBrief} disabled={briefBusy || saving}>
                  {briefBusy ? <Loader size={14} className={styles.spin} /> : <Sparkles size={14} />}
                  {briefBusy ? 'Writing brief…' : 'Auto-Write Brief with AI'}
                </button>
                {briefUndo !== null && !briefBusy && (
                  <button type="button" className={styles.linkBtn} onClick={() => { setDescription(briefUndo); setBriefUndo(null); }}>
                    <Undo2 size={13} style={{ verticalAlign: '-2px' }} /> Undo
                  </button>
                )}
                <span className={styles.aiHint}>Turns your title{description.trim() ? ' and notes' : ''} into goals, deliverables and a step-by-step checklist.</span>
              </div>
              <textarea id="ct-desc" className={`${styles.textarea} ${briefBusy ? styles.aiWorking : ''}`} rows={briefUndo !== null ? 12 : 5}
                placeholder="Goals, tone, references, anything the employee needs to know…"
                value={description} maxLength={DESC_MAX} readOnly={briefBusy}
                onChange={e => setDescription(e.target.value)} />
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

            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label>Attachments <span className={styles.optional}>(optional)</span></label>
                <span className={styles.charCount}>{attachments.length}/{ATTACH_MAX_FILES}</span>
              </div>

              <div
                className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              >
                <Upload size={20} />
                <p><strong>Drag files here</strong> or use the buttons below</p>
                <span>Briefs, brand guides, images, docs — up to {formatBytes(ATTACH_MAX_BYTES)} each</span>
                <div className={styles.dropActions}>
                  <button type="button" className={styles.attachAddBtn} onClick={() => fileInput.current?.click()}>
                    <Paperclip size={14} /> Upload files
                  </button>
                  <button type="button" className={styles.attachAddBtn} onClick={() => setLinkOpen(v => !v)} aria-expanded={linkOpen}>
                    <Link2 size={14} /> Add a link
                  </button>
                </div>
                <input ref={fileInput} type="file" multiple hidden
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
              </div>

              {linkOpen && (
                <div className={styles.linkAddRow}>
                  <input className={styles.input} type="text" inputMode="url" autoFocus
                    placeholder="Paste a link (Google Drive, Figma, Notion…)"
                    value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
                  <button type="button" className={styles.attachAddBtn} onClick={addLink}><Plus size={14} /> Add</button>
                </div>
              )}

              {attachments.length > 0 && (
                <ul className={styles.attachEditList}>
                  {attachments.map(a => (
                    <li key={a.id} className={styles.attachEditItem}>
                      <div className={styles.attachEditTop}>
                        <span className={styles.attachIcon}>{a.kind === 'link' ? <Link2 size={15} /> : <FileText size={15} />}</span>
                        <div className={styles.attachBody}>
                          <span className={styles.attachFileName}>{a.kind === 'link' ? a.url : a.file.name}</span>
                          {a.kind === 'file' && <span className={styles.attachSize}>{formatBytes(a.file.size)}</span>}
                        </div>
                        <button type="button" className={styles.rowRemove} onClick={() => removeAttachment(a.id)}
                          aria-label="Remove attachment"><X size={14} /></button>
                      </div>
                      {a.kind === 'link' && (
                        <input className={styles.input} placeholder="Link title (optional)" maxLength={80}
                          value={a.title} onChange={e => updateAttachment(a.id, { title: e.target.value })} />
                      )}
                      <input className={styles.input} placeholder="Brief description — what is this for? (optional)"
                        maxLength={ATTACH_NOTE_MAX} value={a.note}
                        onChange={e => updateAttachment(a.id, { note: e.target.value })} />
                    </li>
                  ))}
                </ul>
              )}
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
              {saving ? (attachments.length ? 'Uploading & assigning…' : 'Assigning…') : 'Assign task'}
            </button>
          </form>

          <aside className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{showArchive ? 'Archived' : 'Recently assigned'}</h3>
              {showArchive
                ? <button className={styles.linkBtn} onClick={() => setShowArchive(false)}>Back</button>
                : <button className={styles.linkBtn} onClick={() => onNavigate?.('review')}>Review tasks</button>}
            </div>
            {shown.length === 0 ? (
              <p className={styles.subEmpty}>{showArchive ? 'No archived tasks.' : 'Tasks you assign will show up here.'}</p>
            ) : (
              <ul className={styles.recentList}>
                {shown.map(t => (
                  <li key={t.id} className={styles.recentItem}>
                    <Avatar profile={t.profiles} className={styles.miniAvatar} />
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
            {!showArchive && archivedTasks.length > 0 && (
              <button className={styles.linkBtn} style={{ marginTop: 12 }} onClick={() => setShowArchive(true)}>
                View archived ({archivedTasks.length})
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
