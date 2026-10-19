import { useState } from 'react';
import { Paperclip, Link2, FileText, ExternalLink, Download, Loader } from 'lucide-react';
import { getAttachmentUrl, formatBytes } from './attachmentApi';
import styles from './SharedPages.module.css';

/* Read-only reference attachments (links + files) on a task, each with the owner's note */
export default function AttachmentList({ items }) {
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  if (!items?.length) return null;

  const openFile = async (att, i) => {
    setErr(''); setBusy(i);
    try { window.open(await getAttachmentUrl(att), '_blank', 'noopener'); }
    catch { setErr('Could not open that file. Please try again.'); }
    setBusy(null);
  };

  return (
    <div className={styles.attachBlock}>
      <p className={styles.attachHeading}><Paperclip size={13} /> Reference attachments ({items.length})</p>
      <ul className={styles.attachList}>
        {items.map((a, i) => (
          <li key={i} className={styles.attachItem}>
            <span className={styles.attachIcon}>{a.type === 'link' ? <Link2 size={15} /> : <FileText size={15} />}</span>
            <div className={styles.attachBody}>
              {a.type === 'link' ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.attachName}>
                  {a.title || a.url} <ExternalLink size={11} />
                </a>
              ) : (
                <button type="button" className={styles.attachName} onClick={() => openFile(a, i)} disabled={busy === i}>
                  {a.name} {busy === i ? <Loader size={11} className={styles.spin} /> : <Download size={11} />}
                  <span className={styles.attachSize}>{formatBytes(a.size)}</span>
                </button>
              )}
              {a.note && <p className={styles.attachNote}>{a.note}</p>}
            </div>
          </li>
        ))}
      </ul>
      {err && <p className={styles.formError} role="alert">{err}</p>}
    </div>
  );
}
