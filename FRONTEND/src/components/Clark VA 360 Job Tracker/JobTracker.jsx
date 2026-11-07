import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LogOut, LayoutGrid, Send, Bookmark, X, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './JobTracker.module.css';
import { api, getToken, SessionExpiredError } from './jtApi';
import { Logo } from './ui';
import { goalMessage } from './goalRules';
import { useGoalReminder, ReminderBanner } from './Reminder';
import AuthScreen from './AuthScreen';
import Overview from './Overview';
import Applications from './Applications';
import Bookmarks from './Bookmarks';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'tracker', label: 'Job Tracker', icon: Send },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
];

/* Newest first: applications by date applied, bookmarks by when they were saved. */
const byApplied = (a, b) => b.applied_on.localeCompare(a.applied_on) || b.created_at.localeCompare(a.created_at);
const byCreated = (a, b) => b.created_at.localeCompare(a.created_at);

/* Job Tracker root: loading → auth (sign up / sign in) → dashboard.
   Owns the applications/bookmarks lists; pages call onSave/onDelete, which resolve true on success. */
export default function JobTracker({ onBackToPortfolio }) {
  const [phase, setPhase] = useState('loading');   // loading | auth | app
  const [username, setUsername] = useState(null);
  const [memberSince, setMemberSince] = useState(null);
  const [tab, setTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [toast, setToast] = useState(null);        // { kind: 'ok' | 'error', text }
  const [newAppAt, setNewAppAt] = useState(0);     // bumped to open the "Log application" form

  const notify = useCallback((kind, text) => setToast({ kind, text, at: Date.now() }), []);

  /* Success toasts fade on their own; errors stay until dismissed. */
  useEffect(() => {
    if (toast?.kind !== 'ok') return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const toAuth = useCallback(() => {
    setUsername(null); setApplications([]); setBookmarks([]); setTab('overview'); setPhase('auth');
  }, []);

  const fail = useCallback((err) => {
    if (err instanceof SessionExpiredError) toAuth();
    notify('error', err.message);
    return false;
  }, [toAuth, notify]);

  const enter = useCallback(async (name) => {
    try {
      const data = await api.load();
      setApplications(data.applications ?? []);
      setBookmarks(data.bookmarks ?? []);
      setMemberSince(data.member_since ?? null);
      setUsername(name);
      setPhase('app');
    } catch (err) {
      fail(err);
      setPhase('auth');
    }
  }, [fail]);

  useEffect(() => {
    if (!getToken()) { setPhase('auth'); return; }
    api.me()
      .then(name => (name ? enter(name) : setPhase('auth')))
      .catch(() => setPhase('auth'));
  }, [enter]);

  /* Upsert-by-id, keeping each list in its display order. `msg` overrides the toast text;
     `describe(row, isNew)` can supply one too (e.g. daily-goal progress). */
  const saver = (call, setList, sort, what, describe) => async (item, msg) => {
    try {
      const row = await call(item);
      setList(l => (l.some(x => x.id === row.id) ? l.map(x => (x.id === row.id ? row : x)) : [...l, row]).sort(sort));
      notify('ok', msg ?? describe?.(row, !item.id) ?? (item.id ? `${what} updated.` : `${what} added.`));
      return true;
    } catch (err) { return fail(err); }
  };
  const deleter = (call, setList, what) => async (id) => {
    try {
      await call(id);
      setList(l => l.filter(x => x.id !== id));
      notify('ok', `${what} deleted.`);
      return true;
    } catch (err) { return fail(err); }
  };

  const signOut = async () => { await api.signOut(); setToast(null); toAuth(); };
  const go = (id) => { setTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* End-of-day reminder: opens the Job Tracker with the "Log application" form ready. */
  const openNewApplication = useCallback(() => { setTab('tracker'); setNewAppAt(Date.now()); }, []);
  const reminder = useGoalReminder({ enabled: phase === 'app', username, applications, onOpen: openNewApplication });

  const counts = { tracker: applications.length, bookmarks: bookmarks.length };

  return (
    <div className={styles.root}>
      {toast && (
        <div key={toast.at} className={`${styles.toast} ${toast.kind === 'ok' ? styles.toastOk : styles.toastErr}`} role={toast.kind === 'ok' ? 'status' : 'alert'}>
          {toast.kind === 'ok' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss"><X size={15} /></button>
        </div>
      )}

      {phase === 'loading' && (
        <div className={styles.loading}>
          <Logo size={56} />
          <span className={styles.loadingBar}><i /></span>
        </div>
      )}

      {phase === 'auth' && <AuthScreen onBack={onBackToPortfolio} onAuthed={(name) => { setToast(null); enter(name); }} />}

      {phase === 'app' && (
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <div className={styles.brand}>
              <Logo size={38} />
              <span><strong>Clark VA 360</strong><small>Job Tracker</small></span>
            </div>

            <nav className={styles.nav} aria-label="Dashboard">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`${styles.navItem} ${tab === id ? styles.navActive : ''}`}
                  onClick={() => go(id)}
                  aria-current={tab === id ? 'page' : undefined}
                >
                  <Icon size={17} /> <span>{label}</span>
                  {counts[id] != null && <em className={styles.navCount}>{counts[id]}</em>}
                </button>
              ))}
            </nav>

            <div className={styles.sideFoot}>
              <div className={styles.userCard}>
                <span className={styles.avatar}>{username?.[0]?.toUpperCase()}</span>
                <span className={styles.userName}>
                  <strong>{username}</strong>
                  <small>Signed in</small>
                </span>
                <button className={styles.sideIcon} onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
              </div>
              <button className={styles.sideBack} onClick={onBackToPortfolio}><ArrowLeft size={15} /> Back to portfolio</button>
            </div>
          </aside>

          {/* Mobile-only top bar (the sidebar becomes a bottom tab bar) */}
          <header className={styles.mobileBar}>
            <span className={styles.brand}>
              <Logo size={32} />
              <span><strong>Clark VA 360</strong><small>Job Tracker</small></span>
            </span>
            <div>
              <button className={styles.mobileIcon} onClick={signOut} aria-label="Sign out"><LogOut size={17} /></button>
              <button className={styles.mobileIcon} onClick={onBackToPortfolio} aria-label="Back to portfolio"><ArrowLeft size={17} /></button>
            </div>
          </header>

          <main className={styles.content}>
            {reminder.show && <ReminderBanner text={reminder.text} onOpen={openNewApplication} onDismiss={reminder.dismiss} />}
            {tab === 'overview' && (
              <Overview username={username} memberSince={memberSince} applications={applications} bookmarks={bookmarks} onNavigate={go} />
            )}
            {tab === 'tracker' && (
              <Applications
                applications={applications}
                memberSince={memberSince}
                openNewAt={newAppAt}
                onOpenedNew={() => setNewAppAt(0)}
                onSave={saver(api.saveApplication, setApplications, byApplied, 'Application', (row, isNew) => goalMessage(applications, row, isNew))}
                onDelete={deleter(api.deleteApplication, setApplications, 'Application')}
              />
            )}
            {tab === 'bookmarks' && (
              <Bookmarks
                bookmarks={bookmarks}
                onSave={saver(api.saveBookmark, setBookmarks, byCreated, 'Bookmark')}
                onDelete={deleter(api.deleteBookmark, setBookmarks, 'Bookmark')}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
