import { useMemo, useState } from 'react';
import { Loader2, Inbox as InboxIcon, Users, AlertCircle, MailOpen, CheckCircle2 } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { StatusChip, formatWhen, isFailed, isTodo, priorityRank } from './ui';
import EmailDetail from './EmailDetail';

const VIEWS = [
  { id: 'todo', label: 'To do', test: isTodo },
  { id: 'replied', label: 'Replied', test: (e) => e.triage_status === 'replied' },
  { id: 'archived', label: 'Archived', test: (e) => e.triage_status === 'archived' },
  { id: 'all', label: 'All', test: () => true },
];
const PRIORITIES = ['all', 'high', 'medium', 'low'];

/* Two panels: the queue (filters + list) and the reading pane with the reply composer.
   On narrow screens only one shows at a time. */
export default function Inbox({ emails, clients, onAddClients, onRetryFailed, busy, onChanged, onNotice, onDisconnected }) {
  const [view, setView] = useState('todo');
  const [priority, setPriority] = useState('all');
  const [client, setClient] = useState('all');
  const [selectedId, setSelectedId] = useState(null);

  const clientName = useMemo(() => Object.fromEntries((clients ?? []).map((c) => [c.id, c.company_name])), [clients]);

  const visible = useMemo(() => {
    const test = VIEWS.find((v) => v.id === view).test;
    return (emails ?? [])
      .filter(test)
      .filter((e) => priority === 'all' || (e.priority_level === priority && e.triage_status !== 'pending'))
      .filter((e) => client === 'all' || (client === 'none' ? !e.client_id : e.client_id === client))
      .sort((a, b) => (view === 'todo' ? priorityRank(a) - priorityRank(b) : 0) || b.received_at.localeCompare(a.received_at));
  }, [emails, view, priority, client]);

  if (!emails) return <div className={styles.center}><Loader2 className={styles.spin} size={28} aria-label="Loading" /></div>;

  const selected = emails.find((e) => e.id === selectedId) ?? null;
  const failed = emails.filter(isFailed);
  const counts = Object.fromEntries(VIEWS.map((v) => [v.id, emails.filter(v.test).length]));

  if (emails.length === 0) {
    return (
      <div className={styles.inbox}>
        {clients?.length === 0 && <AddClientsCallout onAddClients={onAddClients} />}
        <div className={styles.empty}>
          <InboxIcon size={28} aria-hidden="true" />
          <h3>No emails yet</h3>
          <p className={styles.muted}>Click <strong>Sync &amp; triage</strong> to pull unread inbox mail from the last 14 days.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.inbox}>
      {clients?.length === 0 && <AddClientsCallout onAddClients={onAddClients} />}
      {failed.length > 0 && (
        <p className={`${styles.callout} ${styles.calloutError}`}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>
            {failed.length} email{failed.length === 1 ? '' : 's'} couldn’t be triaged. Open one to see why.{' '}
            <button className={styles.btnText} onClick={onRetryFailed} disabled={busy}>Retry failed</button>
          </span>
        </p>
      )}

      <div className={`${styles.split} ${selected ? styles.splitDetail : ''}`}>
        <aside className={styles.queue} aria-label="Email queue">
          <div className={styles.queueFilters}>
            <div className={styles.viewTabs} role="tablist" aria-label="Show">
              {VIEWS.map((v) => (
                <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? styles.viewOn : ''} onClick={() => setView(v.id)}>
                  {v.label} <small>{counts[v.id]}</small>
                </button>
              ))}
            </div>
            <div className={styles.filterRow}>
              <div className={styles.priorityFilter} role="group" aria-label="Priority">
                {PRIORITIES.map((p) => (
                  <button key={p} aria-pressed={priority === p} className={priority === p ? styles.filterOn : ''} onClick={() => setPriority(p)}>
                    {p === 'all' ? 'All' : p[0].toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <select className={styles.select} value={client} onChange={(e) => setClient(e.target.value)} aria-label="Client">
                <option value="all">All clients</option>
                {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                <option value="none">Unknown senders</option>
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className={styles.queueEmpty}>
              <CheckCircle2 size={22} aria-hidden="true" />
              <p>{view === 'todo' && priority === 'all' && client === 'all' ? 'All caught up.' : 'Nothing matches these filters.'}</p>
            </div>
          ) : (
            <ul className={styles.queueList}>
              {visible.map((e) => (
                <li key={e.id}>
                  <button className={`${styles.queueRow} ${e.id === selectedId ? styles.queueRowOn : ''}`} onClick={() => setSelectedId(e.id)} aria-current={e.id === selectedId}>
                    <span className={styles.queueTop}>
                      <strong title={e.sender_email}>{e.sender_name || e.sender_email}</strong>
                      <time dateTime={e.received_at}>{formatWhen(e.received_at)}</time>
                    </span>
                    <span className={styles.queueSubject}>{e.subject || '(no subject)'}</span>
                    <span className={styles.queueSummary}>{e.ai_summary || e.snippet}</span>
                    <span className={styles.queueMeta}>
                      <StatusChip email={e} />
                      <span className={e.client_id ? styles.clientTag : styles.clientTagNone}>
                        {e.client_id ? clientName[e.client_id] ?? 'Client' : 'Unknown sender'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={styles.detail} aria-label="Selected email">
          {selected ? (
            <EmailDetail
              key={selected.id}
              email={selected}
              clientName={selected.client_id ? clientName[selected.client_id] : null}
              onBack={() => setSelectedId(null)}
              onChanged={onChanged}
              onNotice={onNotice}
              onDisconnected={onDisconnected}
            />
          ) : (
            <div className={styles.detailEmpty}>
              <MailOpen size={28} aria-hidden="true" />
              <p>Select an email to read it and review the AI draft.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AddClientsCallout({ onAddClients }) {
  return (
    <p className={styles.callout}>
      <Users size={18} aria-hidden="true" />
      <span>
        Add your clients so ClarkFlow can match their emails and draft replies in each client’s tone.{' '}
        <button className={styles.btnText} onClick={onAddClients}>Add clients</button>
      </span>
    </p>
  );
}
