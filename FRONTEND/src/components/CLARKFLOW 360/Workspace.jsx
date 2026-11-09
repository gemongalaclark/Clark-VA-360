import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Inbox, Users } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { api } from './cfApi';
import InboxList from './InboxList';
import ClientsManager from './ClientsManager';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function describeRun(r) {
  if (r.added === 0 && r.triaged === 0 && r.failed === 0 && !r.rateLimited) return 'Inbox is up to date.';
  const parts = [`${plural(r.added, 'new email')}`, `${r.triaged} triaged`];
  let text = parts.join(' · ') + '.';
  if (r.failed) text += ` ${r.failed} couldn’t be triaged: open one to see why.`;
  if (r.rateLimited && r.retryAfterSec > 120) {
    const h = Math.floor(r.retryAfterSec / 3600), m = Math.ceil((r.retryAfterSec % 3600) / 60);
    text += ` Gemini’s free daily limit is used up. It resets in about ${h ? `${h}h ` : ''}${m}m: run Sync & triage again then (${r.remaining} waiting).`;
  } else if (r.rateLimited) text += ' Gemini is busy: run Sync & triage again in a minute to finish.';
  else if (r.remaining) text += ` ${r.remaining} still waiting: run it again.`;
  return text;
}

/* Connected workspace: Sync & triage, the inbox, and clients. */
export default function Workspace({ status, onNotice, onReconnect, reconnecting, onDisconnected }) {
  const [tab, setTab] = useState('inbox');
  const [emails, setEmails] = useState(null);
  const [clients, setClients] = useState(null);
  const [progress, setProgress] = useState(null);   // text while a run is going

  const load = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([api.listEmails(), api.listClients()]);
      setEmails(e);
      setClients(c);
    } catch (err) {
      onNotice({ kind: 'error', text: /triage_attempts|triage_error/.test(err.message)
        ? 'ClarkFlow’s database needs the Phase 3 update. Run BACKEND/CLARKFLOW 360/schema.sql again in Supabase.'
        : err.message });
      setEmails((e) => e ?? []);
      setClients((c) => c ?? []);
    }
  }, [onNotice]);

  useEffect(() => { load(); }, [load]);

  const syncNow = async ({ retryFailed = false } = {}) => {
    setProgress('Checking Gmail…');
    try {
      const result = await api.syncAndTriage((p) => {
        setProgress(
          p.stage === 'sync' ? `Pulled ${plural(p.added, 'new email')}…`
          : p.stage === 'waiting' ? `Gemini limit reached. Continuing in ${p.seconds}s (${p.triaged} done, ${p.remaining} left)`
          : `Triaging… ${p.triaged} done${p.remaining ? `, ${p.remaining} left` : ''}`);
        if (p.stage === 'triage') load();   // show each batch's results as they land
      }, { retryFailed });
      onNotice({ kind: result.failed || result.rateLimited ? 'error' : 'ok', text: describeRun(result) });
    } catch (err) {
      if (err.code === 'gmail_not_connected') { onDisconnected(err.message); return; }
      onNotice({ kind: 'error', text: err.message });
    } finally {
      setProgress(null);
      load();
    }
  };

  const tabs = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: emails?.length },
    { id: 'clients', label: 'Clients', icon: Users, count: clients?.length },
  ];

  return (
    <section className={styles.workspace}>
      <div className={styles.toolbar}>
        <span className={styles.mailboxChip} title="Connected Gmail account">
          <CheckCircle2 size={15} aria-hidden="true" /> {status.google_email}
        </span>

        <div className={styles.tabs} role="tablist" aria-label="ClarkFlow sections">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? styles.tabOn : ''} onClick={() => setTab(id)}>
              <Icon size={15} aria-hidden="true" /> {label}{count != null && <small>{count}</small>}
            </button>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          {progress && <span className={styles.progress} role="status"><Loader2 className={styles.spin} size={15} /> {progress}</span>}
          <button className={styles.btnPrimary} onClick={() => syncNow()} disabled={!!progress}>
            <RefreshCw size={16} /> Sync &amp; triage
          </button>
          <button className={styles.btnGhost} onClick={onReconnect} disabled={reconnecting || !!progress} title="Reconnect or switch Gmail account">
            {reconnecting ? <Loader2 className={styles.spin} size={16} /> : null} Reconnect
          </button>
        </div>
      </div>

      {tab === 'inbox'
        ? <InboxList emails={emails} clients={clients} onAddClients={() => setTab('clients')}
            onRetryFailed={() => syncNow({ retryFailed: true })} busy={!!progress} />
        : <ClientsManager clients={clients} onChanged={load} onNotice={onNotice} />}
    </section>
  );
}
