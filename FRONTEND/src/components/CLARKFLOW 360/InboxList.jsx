import { useState } from 'react';
import { Loader2, ChevronDown, Inbox, Users, AlertCircle, Clock } from 'lucide-react';
import styles from './ClarkFlow360.module.css';

const MAX_ATTEMPTS = 3;   // matches cf-triage-analyze

function formatWhen(iso) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatusChip({ email }) {
  /* A pending email may still carry an old priority (re-queued for triage): show Pending. */
  if (email.priority_level && email.triage_status !== 'pending') {
    return <span className={`${styles.priority} ${styles[email.priority_level]}`}>{email.priority_level}</span>;
  }
  if (email.triage_error && email.triage_attempts >= MAX_ATTEMPTS) {
    return <span className={`${styles.priority} ${styles.failedChip}`} title={email.triage_error}><AlertCircle size={12} /> Not triaged</span>;
  }
  return <span className={`${styles.priority} ${styles.pendingChip}`}><Clock size={12} /> Pending</span>;
}

/* Triaged emails, newest first. Click a row to read Gemini's draft.
   (The full two-panel workspace with editing and sending is Phase 4.) */
export default function InboxList({ emails, clients, onAddClients, onRetryFailed, busy }) {
  const [open, setOpen] = useState(null);

  if (!emails) return <div className={styles.center}><Loader2 className={styles.spin} size={28} aria-label="Loading" /></div>;

  const clientName = Object.fromEntries((clients ?? []).map((c) => [c.id, c.company_name]));
  const noClients = clients && clients.length === 0;
  const failed = emails.filter((e) => e.triage_status === 'pending' && e.triage_attempts >= MAX_ATTEMPTS);

  return (
    <div className={styles.inbox}>
      {failed.length > 0 && (
        <p className={`${styles.callout} ${styles.calloutError}`}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>
            {failed.length} email{failed.length === 1 ? '' : 's'} couldn’t be triaged. Open one to see why.{' '}
            <button className={styles.btnText} onClick={onRetryFailed} disabled={busy}>Retry failed</button>
          </span>
        </p>
      )}
      {noClients && (
        <p className={styles.callout}>
          <Users size={18} aria-hidden="true" />
          <span>
            Add your clients so ClarkFlow can match their emails and draft replies in each client’s tone.{' '}
            <button className={styles.btnText} onClick={onAddClients}>Add clients</button>
          </span>
        </p>
      )}

      {emails.length === 0 ? (
        <div className={styles.empty}>
          <Inbox size={28} aria-hidden="true" />
          <h3>No emails yet</h3>
          <p className={styles.muted}>Click <strong>Sync &amp; triage</strong> to pull unread inbox mail from the last 14 days.</p>
        </div>
      ) : (
        <ul className={styles.emailList}>
          {emails.map((e) => {
            const isOpen = open === e.id;
            return (
              <li key={e.id} className={isOpen ? styles.emailOpen : ''}>
                <button className={styles.emailRow} onClick={() => setOpen(isOpen ? null : e.id)} aria-expanded={isOpen}>
                  <StatusChip email={e} />
                  <span className={styles.emailMain}>
                    <span className={styles.emailTop}>
                      <strong title={e.sender_email}>{e.sender_name || e.sender_email}</strong>
                      <span className={e.client_id ? styles.clientTag : styles.clientTagNone}>
                        {e.client_id ? clientName[e.client_id] ?? 'Client' : 'Unknown sender'}
                      </span>
                    </span>
                    <span className={styles.emailSubject}>{e.subject || '(no subject)'}</span>
                    <span className={styles.emailSummary}>{e.ai_summary || e.snippet}</span>
                  </span>
                  <time className={styles.emailTime} dateTime={e.received_at}>{formatWhen(e.received_at)}</time>
                  <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
                </button>

                {isOpen && (
                  <div className={styles.draft}>
                    <span className={styles.draftLabel}>AI draft reply</span>
                    {e.triage_status === 'pending'
                      ? <p className={styles.muted}>{e.triage_error ? `Triage failed: ${e.triage_error}` : 'Not triaged yet. Run Sync & triage.'}</p>
                      : e.ai_generated_draft
                        ? <pre>{e.ai_generated_draft}</pre>
                        : <p className={styles.muted}>No reply needed.</p>}
                    <p className={styles.draftNote}>Editing and sending drafts arrive in the next update.</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
