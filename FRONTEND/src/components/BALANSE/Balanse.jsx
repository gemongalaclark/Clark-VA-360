import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LogOut, LayoutDashboard, Landmark, Target, Repeat, X, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './Balanse.module.css';
import { api, getToken, SessionExpiredError } from './blApi';
import { Logo, num } from './ui';
import AuthScreen from './AuthScreen';
import Overview from './Overview';
import Debts from './Debts';
import Goals from './Goals';
import Subscriptions from './Subscriptions';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'debts', label: 'Debts', icon: Landmark },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
];

/* Toast text for a saved row: celebrate the moment something is finished. */
const debtMsg = (prev, row) =>
  num(row.paid_amount) >= num(row.total_amount) && (!prev || num(prev.paid_amount) < num(prev.total_amount))
    ? `🎉 “${row.name}” is fully paid off! Moved to Past debts.` : prev ? 'Debt updated.' : 'Debt added.';
const goalMsg = (prev, row) =>
  num(row.saved_amount) >= num(row.target_amount) && (!prev || num(prev.saved_amount) < num(prev.target_amount))
    ? `🏆 You reached “${row.name}”! Moved to Past goals.` : prev ? 'Goal updated.' : 'Goal added.';

const subMsg = (prev) => (prev ? 'Subscription updated.' : 'Subscription added.');

/* BALANSE root: loading → auth (sign up / sign in) → dashboard.
   Owns the debts/goals/subscriptions lists; pages call onSave/onDelete, which resolve true on success. */
export default function Balanse({ onBackToPortfolio }) {
  const [phase, setPhase] = useState('loading');   // loading | auth | app
  const [username, setUsername] = useState(null);
  const [tab, setTab] = useState('overview');
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [toast, setToast] = useState(null);        // { kind: 'ok' | 'error', text }

  const notify = useCallback((kind, text) => setToast({ kind, text, at: Date.now() }), []);

  /* Success toasts fade on their own; errors stay until dismissed. */
  useEffect(() => {
    if (toast?.kind !== 'ok') return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const toAuth = useCallback(() => {
    setUsername(null); setDebts([]); setGoals([]); setSubscriptions([]); setTab('overview'); setPhase('auth');
  }, []);

  const fail = useCallback((err) => {
    if (err instanceof SessionExpiredError) toAuth();
    notify('error', err.message);
    return false;
  }, [toAuth, notify]);

  const enter = useCallback(async (name) => {
    try {
      const data = await api.load();
      setDebts(data.debts);
      setGoals(data.goals);
      setSubscriptions(data.subscriptions ?? []);
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

  /* Upsert-by-id helpers shared by debts and goals. */
  const saver = (call, list, setList, msg) => async (item) => {
    try {
      const prev = item.id ? list.find(x => x.id === item.id) : null;
      const row = await call(item);
      setList(l => (l.some(x => x.id === row.id) ? l.map(x => (x.id === row.id ? row : x)) : [...l, row]));
      notify('ok', msg(prev, row));
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
          <Logo size={52} />
          <span className={styles.loadingBar}><i /></span>
        </div>
      )}

      {phase === 'auth' && <AuthScreen onBack={onBackToPortfolio} onAuthed={(name) => { setToast(null); enter(name); }} />}

      {phase === 'app' && (
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <div className={styles.sideBrand}><Logo size={36} /> BALANSE</div>

            <nav className={styles.nav} aria-label="Dashboard">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`${styles.navItem} ${tab === id ? styles.navActive : ''}`}
                  onClick={() => go(id)}
                  aria-current={tab === id ? 'page' : undefined}
                >
                  <Icon size={18} /> <span>{label}</span>
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
            <span className={styles.sideBrand}><Logo size={30} /> BALANSE</span>
            <div>
              <button className={styles.mobileIcon} onClick={signOut} aria-label="Sign out"><LogOut size={17} /></button>
              <button className={styles.mobileIcon} onClick={onBackToPortfolio} aria-label="Back to portfolio"><ArrowLeft size={17} /></button>
            </div>
          </header>

          <main className={styles.content}>
            {tab === 'overview' && <Overview username={username} debts={debts} goals={goals} subscriptions={subscriptions} onNavigate={go} />}
            {tab === 'debts' && (
              <Debts debts={debts} onSave={saver(api.saveDebt, debts, setDebts, debtMsg)} onDelete={deleter(api.deleteDebt, setDebts, 'Debt')} />
            )}
            {tab === 'goals' && (
              <Goals goals={goals} onSave={saver(api.saveGoal, goals, setGoals, goalMsg)} onDelete={deleter(api.deleteGoal, setGoals, 'Goal')} />
            )}
            {tab === 'subscriptions' && (
              <Subscriptions
                subscriptions={subscriptions}
                onSave={saver(api.saveSubscription, subscriptions, setSubscriptions, subMsg)}
                onDelete={deleter(api.deleteSubscription, setSubscriptions, 'Subscription')}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
