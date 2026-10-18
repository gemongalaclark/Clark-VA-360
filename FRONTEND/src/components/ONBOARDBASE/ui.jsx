import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, FileImage, Download, Trash2, Loader2, Check, X } from 'lucide-react';
import styles from './OnboardBase.module.css';
import { ACCEPTED_TYPES, MAX_FILE_BYTES, INTAKE_SECTIONS, fmtBytes, fmtDate } from './obData';

/* Small shared building blocks for the client and admin views. */

export function Spinner({ label }) {
  return (
    <div className={styles.center} role="status">
      <Loader2 className={styles.spin} size={28} />
      {label && <span className={styles.muted}>{label}</span>}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const notify = useCallback((message, kind = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  const node = toast && (
    <div className={`${styles.toast} ${toast.kind === 'error' ? styles.toastError : ''}`} role="status" aria-live="polite">
      {toast.kind === 'error' ? <X size={16} /> : <Check size={16} />} {toast.message}
    </div>
  );
  return [node, notify];
}

export function ProgressBar({ steps, done, total, pct }) {
  const current = steps.find(s => !s.is_completed);
  const index = current ? steps.indexOf(current) + 1 : steps.length;
  return (
    <div className={styles.progress}>
      <div className={styles.progressHead}>
        <strong>
          {current ? `Step ${index} of ${total}: ${current.step_name}` : 'Onboarding complete'}
        </strong>
        <span className={styles.muted}>{done}/{total} done · {pct}%</span>
      </div>
      <div className={styles.progressTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* Drag-and-drop upload widget. Validation lives here; persistence is the parent's job. */
export function FileDropzone({ onFiles, busy, hint }) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);

  const accept = (list) => {
    const files = Array.from(list);
    const bad = files.find(f => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_FILE_BYTES);
    if (bad) {
      setError(
        bad.size > MAX_FILE_BYTES
          ? `“${bad.name}” is over ${MAX_FILE_BYTES / 1024 / 1024} MB.`
          : `“${bad.name}” isn't a supported type (PNG, JPG, SVG, WebP, PDF or ZIP).`,
      );
      return;
    }
    setError('');
    if (files.length) onFiles(files);
  };

  return (
    <div>
      <div
        className={`${styles.dropzone} ${over ? styles.dropzoneOver : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !busy) { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) accept(e.dataTransfer.files); }}
      >
        {busy ? <Loader2 className={styles.spin} size={28} /> : <Upload size={28} />}
        <strong>{busy ? 'Uploading…' : 'Drag & drop files here, or click to browse'}</strong>
        <span className={styles.muted}>{hint || 'PNG, JPG, SVG, WebP, PDF or ZIP · up to 10 MB each'}</span>
        <input
          ref={input} type="file" multiple hidden accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => { accept(e.target.files); e.target.value = ''; }}
        />
      </div>
      {error && <p className={styles.fieldError} role="alert">{error}</p>}
    </div>
  );
}

export function FileList({ files, api, onDelete, notify, emptyText = 'No files yet.' }) {
  const [opening, setOpening] = useState(null);

  const open = async (file) => {
    setOpening(file.id);
    try {
      const url = await api.getFileUrl(file);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      notify(e.message || 'Could not open file', 'error');
    } finally {
      setOpening(null);
    }
  };

  if (!files.length) return <p className={styles.muted}>{emptyText}</p>;
  return (
    <ul className={styles.fileList}>
      {files.map(f => (
        <li key={f.id} className={styles.fileRow}>
          {f.mime_type?.startsWith('image/') ? <FileImage size={20} /> : <FileText size={20} />}
          <div className={styles.fileMeta}>
            <span className={styles.fileName}>{f.file_name}</span>
            <span className={styles.muted}>{fmtBytes(f.size_bytes)} · {fmtDate(f.created_at)}</span>
          </div>
          <button className={styles.iconBtn} onClick={() => open(f)} disabled={opening === f.id} aria-label={`Download ${f.file_name}`}>
            {opening === f.id ? <Loader2 className={styles.spin} size={16} /> : <Download size={16} />}
          </button>
          {onDelete && (
            <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => onDelete(f)} aria-label={`Delete ${f.file_name}`}>
              <Trash2 size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* Read-only view of submitted intake answers (client recap + admin review). */
export function IntakeSummary({ intake }) {
  if (!intake?.question_data || !Object.keys(intake.question_data).length) {
    return <p className={styles.muted}>No answers saved yet.</p>;
  }
  const data = intake.question_data;
  return (
    <div className={styles.summary}>
      {INTAKE_SECTIONS.map(section => {
        const rows = section.fields.filter(f => {
          const v = data[f.key];
          return Array.isArray(v) ? v.length : v;
        });
        if (!rows.length) return null;
        return (
          <section key={section.title}>
            <h4>{section.title}</h4>
            <dl>
              {rows.map(f => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{Array.isArray(data[f.key]) ? data[f.key].join(', ') : data[f.key]}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
