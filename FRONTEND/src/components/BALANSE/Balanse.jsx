import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LogOut, LayoutDashboard, Landmark, Target, X } from 'lucide-react';
import styles from './Balanse.module.css';
import { api, getToken, SessionExpiredError } from './blApi';
import AuthScreen from './AuthScreen';
import Overview from './Overview';
import Debts from './Debts';
import Goals from './Goals';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'debts', label: 'Debt tracker', icon: Landmark },
  { id: 'goals', label: 'Goals', icon: Target },
];

/* BALANSE root: loading → auth (sign up / sign in) → dashboard.
   Owns the debts/goals lists; pages call onSave/onDelete, which return true on success. */
export default function Balanse({ onBackToPortfolio }) {
  const [phase, setPhase] = useState('loading');   // loading | auth | app
  const [username, setUsername] = useState(null);
  const [tab, setTab] = useState('overview');
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState('');

  const toAuth = () => { setUsername(null); setDebts([]); setGoals([]); setTab('overview'); setPhase('auth'); };

  const fail = useCallback((err) => {
    if (err instanceof SessionExpiredError) toAuth();
    setError(err.message);
    return false;
  }, []);

  const enter = useCallback(async (name) => {
    try {
      const data = await api.load();
      setDebts(data.debts);
      setGoals(data.goals);
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
  const saver = (call, setList) => async (item) => {
    try {
      const row = await call(item);
      setList(list => (list.some(x => x.id === row.id) ? list.map(x => (x.id === row.id ? row : x)) : [...list, row]));
      setError('');
      return true;
    } catch (err) { return fail(err); }
  };
  const deleter = (call, setList) => async (id) => {
    try {
      await call(id);
      setList(list => list.filter(x => x.id !== id));
      return true;
    } catch (err) { return fail(err); }
  };

  const signOut = async () => { await api.signOut(); setError(''); toAuth(); };

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>B</span>
          BALANSE
        </div>
        <div className={styles.topActions}>
          {phase === 'app' && (
            <>
              <span className={styles.userChip}>@{username}</span>
              <button className={styles.btnText} onClick={signOut}><LogOut size={15} /> Sign out</button>
            </>
          )}
          <button className={styles.btnText} onClick={onBackToPortfolio}><ArrowLeft size={15} /> Portfolio</button>
        </div>
      </header>

      {error && (
        <div className={styles.toast} role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button>
        </div>
      )}

      {phase === 'loading' && <div className={styles.loading}><span className={styles.spinner} /> Loading…</div>}

      {phase === 'auth' && <AuthScreen onAuthed={(name) => { setError(''); enter(name); }} />}

      {phase === 'app' && (
        <div className={styles.shell}>
          <nav className={styles.sidebar} aria-label="Dashboard">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`${styles.navItem} ${tab === id ? styles.navActive : ''}`}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
              >
                <Icon size={18} /> <span>{label}</span>
              </button>
            ))}
          </nav>
          <main className={styles.content}>
            {tab === 'overview' && <Overview username={username} debts={debts} goals={goals} onNavigate={setTab} />}
            {tab === 'debts' && (
              <Debts debts={debts} onSave={saver(api.saveDebt, setDebts)} onDelete={deleter(api.deleteDebt, setDebts)} />
            )}
            {tab === 'goals' && (
              <Goals goals={goals} onSave={saver(api.saveGoal, setGoals)} onDelete={deleter(api.deleteGoal, setGoals)} />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
