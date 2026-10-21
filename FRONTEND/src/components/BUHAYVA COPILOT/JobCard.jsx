import { useState } from 'react';
import { Copy, ExternalLink, Trash2, RotateCcw, Loader2, KeyRound, ShieldAlert, ChevronDown, Pencil, Save, X, StickyNote, AlertCircle } from 'lucide-react';
import styles from './BuhayvaCopilot.module.css';
import { STATUSES, fitTone, hasAttentionCheck, asList, timeAgo, fmtDate } from './bvData';
import { CopyButton } from './ui';

const TONE_CLASS = { high: styles.fitHigh, mid: styles.fitMid, low: styles.fitLow, none: styles.fitNone };

function FitRing({ score }) {
  const tone = fitTone(score);
  const pct = score ?? 0;
  return (
    <div className={`${styles.fitRing} ${TONE_CLASS[tone]}`} style={{ '--pct': pct }} aria-label={score == null ? 'Not scored' : `${score}% fit`}>
      <span>{score == null ? '—' : score}</span>
      <small>fit</small>
    </div>
  );
}

export default function JobCard({ job, busy, onRetry, onUpdate, onDelete, notify }) {
  const pending = job.analysis_state === 'pending';
  const failed = job.analysis_state === 'failed';
  const [open, setOpen] = useState(job.status === 'Analyzed');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ subject_line: '', tailored_pitch: '' });
  const [notes, setNotes] = useState(job.notes || '');
  const [showRaw, setShowRaw] = useState(false);

  const flags = asList(job.red_flags);
  const skills = asList(job.matching_skills);
  const code = hasAttentionCheck(job.attention_check_word) ? job.attention_check_word : null;
  const fullText = [job.subject_line && `Subject: ${job.subject_line}`, job.tailored_pitch].filter(Boolean).join('\n\n');

  const startEdit = () => {
    setDraft({ subject_line: job.subject_line || '', tailored_pitch: job.tailored_pitch || '' });
    setEditing(true);
    setOpen(true);
  };
  const saveEdit = async () => {
    if (await onUpdate(draft)) { setEditing(false); notify('Pitch updated.'); }
  };
  const saveNotes = () => {
    if ((job.notes || '') !== notes) onUpdate({ notes });
  };

  return (
    <article className={`${styles.card} ${styles.jobCard}`}>
      <header className={styles.jobHead}>
        {pending || busy ? (
          <div className={`${styles.fitRing} ${styles.fitNone}`} aria-label="Analyzing"><Loader2 className={styles.spin} size={22} /></div>
        ) : <FitRing score={job.fit_score} />}
        <div className={styles.jobTitleBlock}>
          <div className={styles.metaRow}>
            <span className={styles.platform}>{job.platform}</span>
            {job.company_or_client && job.company_or_client !== 'Unknown' && <span className={styles.muted}>{job.company_or_client}</span>}
            <span className={styles.muted} title={fmtDate(job.created_at)}>· {timeAgo(job.created_at)}</span>
            {job.applied_at && <span className={styles.muted}>· applied {fmtDate(job.applied_at)}</span>}
          </div>
          <h3>{job.job_title}</h3>
        </div>
        <label className={styles.srOnly} htmlFor={`status-${job.id}`}>Status</label>
        <select
          id={`status-${job.id}`}
          className={`${styles.statusSelect} ${styles[`status${job.status}`]}`}
          value={job.status}
          onChange={(e) => onUpdate({ status: e.target.value })}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </header>

      {(pending || busy) && (
        <p className={styles.pendingLine}>
          <Loader2 className={styles.spin} size={15} />
          {busy ? 'Gemini is reading the post and drafting your pitch…' : 'Waiting for the result from Make.com.'}
          {!busy && <button className={styles.linkBtn} onClick={onRetry}><RotateCcw size={13} /> Retry</button>}
        </p>
      )}

      {failed && !busy && (
        <p className={styles.calloutError}>
          <AlertCircle size={18} />
          <span>
            <strong>Analysis failed.</strong> {job.analysis_error || 'Unknown error.'}{' '}
            <button className={styles.linkBtn} onClick={onRetry}><RotateCcw size={13} /> Retry</button>
          </span>
        </p>
      )}

      {code && (
        <p className={styles.attention}>
          <KeyRound size={18} />
          <span><strong>Attention check found:</strong> include “{code}” exactly as the client asked.</span>
          <CopyButton text={code} label="Copy" icon={Copy} className={styles.miniBtn} />
        </p>
      )}

      {flags.length > 0 && (
        <div className={styles.flags}>
          <strong><ShieldAlert size={15} /> Red flags</strong>
          <ul>{flags.map(f => <li key={f}>{f}</li>)}</ul>
        </div>
      )}

      {skills.length > 0 && (
        <div className={styles.skillRow}>
          {skills.map(s => <span key={s} className={styles.skill}>{s}</span>)}
        </div>
      )}

      {(job.tailored_pitch || editing) && (
        <div className={styles.pitchBox}>
          <button className={styles.pitchToggle} onClick={() => setOpen(o => !o)} aria-expanded={open}>
            <span>Tailored pitch</span>
            <ChevronDown size={16} className={open ? styles.rotated : ''} />
          </button>
          {open && (editing ? (
            <div className={styles.pitchEdit}>
              <label className={styles.srOnly} htmlFor={`subj-${job.id}`}>Subject line</label>
              <input id={`subj-${job.id}`} value={draft.subject_line} onChange={(e) => setDraft(d => ({ ...d, subject_line: e.target.value }))} />
              <label className={styles.srOnly} htmlFor={`pitch-${job.id}`}>Pitch</label>
              <textarea id={`pitch-${job.id}`} rows={12} value={draft.tailored_pitch} onChange={(e) => setDraft(d => ({ ...d, tailored_pitch: e.target.value }))} />
              <div className={styles.rowGap}>
                <button className={styles.miniBtnDark} onClick={saveEdit}><Save size={14} /> Save</button>
                <button className={styles.miniBtn} onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
              </div>
            </div>
          ) : (
            <div className={styles.pitchBody}>
              {job.subject_line && <p className={styles.subject}><span>Subject:</span> {job.subject_line}</p>}
              <p className={styles.pitchText}>{job.tailored_pitch}</p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.notes}>
        <label htmlFor={`notes-${job.id}`}><StickyNote size={14} /> Notes</label>
        <textarea
          id={`notes-${job.id}`} rows={1} placeholder="Interview on Tue 3pm, client prefers Loom…"
          value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes}
        />
      </div>

      <footer className={styles.jobActions}>
        <div className={styles.rowGap}>
          <CopyButton text={job.tailored_pitch} label="Copy pitch" icon={Copy} className={styles.miniBtnDark} />
          <CopyButton text={job.subject_line} label="Copy subject" icon={Copy} className={styles.miniBtn} />
          <CopyButton text={fullText} label="Copy both" icon={Copy} className={styles.miniBtn} />
          {job.tailored_pitch && !editing && <button className={styles.miniBtn} onClick={startEdit}><Pencil size={14} /> Edit</button>}
        </div>
        <div className={styles.rowGap}>
          <button className={styles.linkBtn} onClick={() => setShowRaw(s => !s)}>{showRaw ? 'Hide' : 'View'} original post</button>
          {job.job_url && (
            <a href={job.job_url} target="_blank" rel="noreferrer" className={styles.linkBtn}>
              Open job post <ExternalLink size={13} />
            </a>
          )}
          <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={onDelete} aria-label={`Delete ${job.job_title}`}><Trash2 size={15} /></button>
        </div>
      </footer>

      {showRaw && <pre className={styles.rawPost}>{job.raw_description}</pre>}
    </article>
  );
}
