import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, AlertTriangle, Clock, CheckCircle2, Rocket, Loader2, X, Mail } from 'lucide-react';
import styles from './OnboardBase.module.css';
import { classify, currentStep, daysIdle, percentDone, initials } from './obData';
import { Spinner, useToast } from './ui';
import ClientDetail from './ClientDetail';

const COLUMNS = [
  { key: 'onboarding', title: 'Onboarding', icon: Clock, tone: 'Blue' },
  { key: 'stalled', title: 'Stalled', icon: AlertTriangle, tone: 'Amber' },
  { key: 'review', title: 'Ready for review', icon: CheckCircle2, tone: 'Violet' },
  { key: 'active', title: 'Active', icon: Rocket, tone: 'Green' },
];

function statusLine(portal, column) {
  const step = currentStep(portal.steps);
  const idle = daysIdle(portal);
  if (column === 'active') return 'Onboarding complete';
  if (column === 'review') return 'Waiting on your final review';
  if (column === 'stalled') return `Stuck on “${step?.step_name}” for ${idle} day${idle === 1 ? '' : 's'}`;
  return `On “${step?.step_name}”`;
}

function NewClientModal({ api, onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', fullName: '', companyName: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address.');
    if (!form.companyName.trim()) return setError('Company name is required.');
    setBusy(true);
    setError('');
    try {
      await api.inviteClient({ email: form.email.trim(), fullName: form.fullName.trim(), companyName: form.companyName.trim() });
      onCreated(form.email.trim());
    } catch (err) {
      setError(err.message || 'Could not create client');
      setBusy(false);
    }
  };

  const bind = (key) => ({ value: form[key], onChange: (e) => setForm(f => ({ ...f, [key]: e.target.value })) });

  return (
    <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.modal} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="ob-new-client">
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2 id="ob-new-client">New client</h2>
        <p className={styles.muted}>We'll email them a magic link and generate their onboarding checklist automatically.</p>
        <div className={styles.field}>
          <label htmlFor="nc-email">Client email <span className={styles.req}>*</span></label>
          <input id="nc-email" type="email" autoFocus placeholder="client@company.com" {...bind('email')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nc-name">Contact name</label>
          <input id="nc-name" type="text" placeholder="Jordan Rivera" {...bind('fullName')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="nc-company">Company name <span className={styles.req}>*</span></label>
          <input id="nc-company" type="text" placeholder="Maple & Co." {...bind('companyName')} />
        </div>
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
        <div className={styles.formActions}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={styles.btnPrimary} disabled={busy}>
            {busy ? <Loader2 className={styles.spin} size={16} /> : <Mail size={16} />} Send invite
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminDashboard({ api, profile }) {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toastNode, notify] = useToast();

  const refresh = useCallback(async () => {
    try {
      setClients(await api.listClients());
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load clients');
    }
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);

  const grouped = useMemo(() => {
    const out = { onboarding: [], stalled: [], review: [], active: [] };
    (clients || []).forEach(c => out[classify(c)].push(c));
    return out;
  }, [clients]);

  if (error) return <div className={styles.card}><p className={styles.fieldError}>{error}</p></div>;
  if (!clients) return <Spinner label="Loading clients…" />;

  const selected = clients.find(c => c.profile.id === selectedId);

  return (
    <div>
      {toastNode}
      <header className={styles.adminHead}>
        <div>
          <h1>Client pipeline</h1>
          <p className={styles.muted}>Signed in as {profile.full_name || profile.email}. {clients.length} client{clients.length === 1 ? '' : 's'} total.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowNew(true)}><Plus size={16} /> New client</button>
      </header>

      <div className={styles.kanban}>
        {COLUMNS.map(({ key, title, icon: Icon, tone }) => (
          <section key={key} className={styles.column} aria-label={title}>
            <h2 className={`${styles.columnHead} ${styles[`tone${tone}`]}`}>
              <Icon size={16} /> {title} <span className={styles.count}>{grouped[key].length}</span>
            </h2>
            {grouped[key].length === 0 && <p className={styles.columnEmpty}>No clients here</p>}
            {grouped[key].map(c => (
              <button key={c.profile.id} className={styles.clientCard} onClick={() => setSelectedId(c.profile.id)}>
                <span className={styles.avatar}>{initials(c.profile.company_name)}</span>
                <span className={styles.clientBody}>
                  <strong>{c.profile.company_name}</strong>
                  <small>{c.profile.full_name || c.profile.email}</small>
                  <span className={`${styles.statusLine} ${key === 'stalled' ? styles.statusStalled : ''}`}>{statusLine(c, key)}</span>
                  <span className={styles.miniTrack}><span style={{ width: `${percentDone(c.steps)}%` }} /></span>
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>

      {selected && (
        <ClientDetail
          api={api}
          admin={profile}
          portal={selected}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
          notify={notify}
        />
      )}

      {showNew && (
        <NewClientModal
          api={api}
          onClose={() => setShowNew(false)}
          onCreated={(email) => { setShowNew(false); notify(`Invite sent to ${email}`); refresh(); }}
        />
      )}
    </div>
  );
}
