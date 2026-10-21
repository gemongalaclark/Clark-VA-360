import { useEffect, useRef } from 'react';
import { Bookmark, Copy } from 'lucide-react';
import styles from './BuhayvaCopilot.module.css';
import { buildBookmarklet } from './bvData';
import { Modal, CopyButton } from './ui';

/* The bookmarklet carries no secrets: it only opens this app with the job text attached,
   and the signed-in app does the rest. So it is safe to share or reinstall anywhere. */

export default function BookmarkletModal({ onClose }) {
  const code = buildBookmarklet(window.location.origin);
  const linkRef = useRef(null);

  /* React warns about javascript: URLs in JSX, so set the href directly. */
  useEffect(() => { linkRef.current?.setAttribute('href', code); }, [code]);

  return (
    <Modal title="1-click bookmarklet" onClose={onClose} wide>
      <p className={styles.muted}>Send any Upwork or OnlineJobs.ph post here without copy-pasting.</p>

      <div className={styles.bookmarkletDrop}>
        <a ref={linkRef} className={styles.bookmarklet} onClick={(e) => e.preventDefault()} draggable="true">
          <Bookmark size={16} /> Send to Copilot
        </a>
        <span className={styles.muted}>← drag this button to your bookmarks bar</span>
      </div>

      <h3>Install</h3>
      <ol className={styles.steps}>
        <li>Show your bookmarks bar: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> (<kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> on Mac).</li>
        <li>Drag the red <strong>Send to Copilot</strong> button onto the bar.</li>
        <li>
          Can't drag (e.g. on a laptop trackpad)? Copy the code, add a new bookmark named “Send to Copilot”,
          and paste the code as its URL.
          <div className={styles.rowGap}>
            <CopyButton text={code} label="Copy bookmarklet code" icon={Copy} className={styles.miniBtn} />
          </div>
        </li>
      </ol>

      <h3>Use</h3>
      <ol className={styles.steps}>
        <li>Open a job post on Upwork or OnlineJobs.ph.</li>
        <li><strong>Best results:</strong> highlight the job description first. Otherwise the bookmarklet grabs the page text.</li>
        <li>Click <strong>Send to Copilot</strong>. This app opens in a new tab and starts analyzing right away.</li>
      </ol>
      <p className={styles.muted}>
        It only auto-analyzes when the tab really came from Upwork or OnlineJobs.ph. From anywhere else the job is
        just pre-filled, so nobody can trigger analyses on your account with a crafted link.
      </p>
    </Modal>
  );
}
