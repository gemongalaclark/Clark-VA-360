import { useEffect, useState } from 'react';
import { Mail, CheckCircle2, Loader2, RefreshCw, ShieldAlert, Eye, Send } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { api } from './cfApi';

const PERMISSIONS = {
  'https://www.googleapis.com/auth/gmail.readonly': { icon: Eye, label: 'Read email' },
  'https://www.googleapis.com/auth/gmail.send': { icon: Send, label: 'Send replies' },
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/* Shows whether Gmail is connected, and starts the Google consent flow. */
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

  const connectButton = (label, ghost) => (
    <button className={ghost ? styles.btnGhost : styles.btnPrimary} onClick={connect} disabled={busy}>
      {busy ? <Loader2 className={styles.spin} size={16} /> : ghost ? <RefreshCw size={16} /> : <Mail size={16} />}
      {busy ? 'Opening Google…' : label}
    </button>
  );

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
        {connectButton('Connect Gmail')}
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <span className={`${styles.cardIcon} ${styles.cardIconOk}`}><CheckCircle2 size={22} /></span>
      <h2>Gmail connected</h2>
      <p className={styles.mailbox}>{status.google_email}</p>
      <p className={styles.muted}>Connected {formatDate(status.connected_at)}</p>
      <ul className={styles.chips}>
        {(status.scopes ?? []).filter((s) => PERMISSIONS[s]).map((s) => {
          const { icon: Icon, label } = PERMISSIONS[s];
          return <li key={s}><Icon size={14} aria-hidden="true" /> {label}</li>;
        })}
      </ul>
      <p className={styles.muted}>Inbox sync and AI triage come next. They’ll appear here.</p>
      {connectButton('Reconnect or switch account', true)}
    </section>
  );
}
