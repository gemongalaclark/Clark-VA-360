import { useState } from 'react';
import { Check, Copy, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';
import styles from './JobTracker.module.css';
import { shareUrl } from './jtApi';
import { Modal } from './ui';

/* Share settings for the public showcase. onSetShare(mode) resolves to true on success. */
export default function ShareModal({ slug, onSetShare, onClose }) {
  const [busy, setBusy] = useState(null);       // which action is running
  const [copied, setCopied] = useState(false);
  const url = slug ? shareUrl(slug) : '';

  const run = async (mode) => { setBusy(mode); await onSetShare(mode); setBusy(null); setCopied(false); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch {
      document.getElementById('jt-share-url')?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal title="Share your job tracker" eyebrow="Showcase link" onClose={onClose}>
      <div className={styles.modalBody}>
        <p className={styles.muted}>
          Anyone with the link sees a read-only page of the jobs you’ve applied to. No sign-in needed.
        </p>

        <div className={styles.shareLists}>
          <div>
            <span className={styles.shareHead}><Eye size={14} /> Shown</span>
            <ul>
              <li>Your username</li>
              <li>Job titles</li>
              <li>Job links</li>
              <li>Dates applied</li>
            </ul>
          </div>
          <div>
            <span className={styles.shareHead}><EyeOff size={14} /> Hidden</span>
            <ul>
              <li>Status (no reply, in process, hired)</li>
              <li>Where you found each job</li>
              <li>Your daily goal and streak</li>
              <li>Bookmarks</li>
            </ul>
          </div>
        </div>

        {slug ? (
          <>
            <div className={styles.shareUrl}>
              <input id="jt-share-url" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Share link" />
              <button type="button" className={styles.btnPrimary} onClick={copy}>
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </button>
            </div>
            <div className={styles.shareActions}>
              <a className={styles.linkBtn} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Preview page</a>
              <button type="button" className={styles.linkBtn} onClick={() => run('reset')} disabled={!!busy}>
                <RefreshCw size={14} /> {busy === 'reset' ? 'Resetting…' : 'Reset link'}
              </button>
              <button type="button" className={`${styles.linkBtn} ${styles.linkMuted}`} onClick={() => run('disable')} disabled={!!busy}>
                {busy === 'disable' ? 'Turning off…' : 'Turn off sharing'}
              </button>
            </div>
            <p className={styles.fieldHint}>Resetting gives you a new link; the old one stops working.</p>
          </>
        ) : (
          <button type="button" className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={() => run('enable')} disabled={!!busy}>
            {busy ? 'Creating…' : 'Create share link'}
          </button>
        )}
      </div>
    </Modal>
  );
}
