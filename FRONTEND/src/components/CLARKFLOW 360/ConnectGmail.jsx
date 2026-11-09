import { useEffect, useState } from 'react';
import { Mail, Loader2, ShieldAlert } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { api } from './cfApi';
import Workspace from './Workspace';

/* Not connected: the Connect Gmail card (starts the Google consent flow).
   Connected: the workspace. */
export default function ConnectGmail({ onNotice }) {
  const [status, setStatus] = useState(undefined);   // undefined = loading, null = not connected
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    api.gmailStatus()
      .then((s) => { if (live) setStatus(s ?? null); })
      .catch((err) => { if (live) { onNotice({ kind: 'error', text: err.message }); setStatus(null); } });
    return () => { live = false; };
  }, [onNotice]);

  const connect = async () => {
    setBusy(true);
    try {
      await api.connectGmail();   // navigates away on success
    } catch (err) {
      onNotice({ kind: 'error', text: err.message });
      setBusy(false);
    }
  };

  if (status === undefined) return <Loader2 className={styles.spin} size={28} aria-label="Loading" />;

  if (!status) {
    return (
      <section className={styles.card}>
        <span className={styles.cardIcon}><Mail size={22} /></span>
        <h2>Connect your Gmail</h2>
        <p className={styles.muted}>
          ClarkFlow needs two permissions: <strong>read email</strong> to pull in and triage client messages,
          and <strong>send email</strong> to send the replies you approve. Your Google tokens are encrypted
          and never reach this browser.
        </p>
        <p className={styles.callout}>
          <ShieldAlert size={18} aria-hidden="true" />
          <span>
            Google will warn that it <strong>hasn’t verified this app</strong>. That’s expected for a private app:
            click <strong>Advanced</strong>, then <strong>Go to … (unsafe)</strong>, and leave both permission boxes ticked.
          </span>
        </p>
        <button className={styles.btnPrimary} onClick={connect} disabled={busy}>
          {busy ? <Loader2 className={styles.spin} size={16} /> : <Mail size={16} />}
          {busy ? 'Opening Google…' : 'Connect Gmail'}
        </button>
      </section>
    );
  }

  return (
    <Workspace
      status={status}
      onNotice={onNotice}
      onReconnect={connect}
      reconnecting={busy}
      onDisconnected={(message) => { setStatus(null); onNotice({ kind: 'error', text: message }); }}
    />
  );
}
