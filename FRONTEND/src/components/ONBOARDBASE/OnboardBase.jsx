import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, LogOut, ClipboardCheck, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './OnboardBase.module.css';
import { getApi } from './obApi';
import { DEMO_CLIENT_ID, DEMO_ADMIN_ID, resetDemo } from './obDemo';
import { Spinner } from './ui';
import LandingPage from './LandingPage';
import ClientDashboard from './ClientDashboard';
import AdminDashboard from './AdminDashboard';

/* OnboardBase root. Owns the auth state machine:
     loading → landing → (live session | demo) → client | admin dashboard
   Live mode signs in with a Supabase magic link and loads the role from ob_profiles.
   Demo mode swaps in an in-browser API with the same interface. */

export default function OnboardBase({ onBackToPortfolio }) {
  const [phase, setPhase] = useState('loading');     // loading | landing | app | no-account
  const [mode, setMode] = useState('live');          // live | demo
  const [profile, setProfile] = useState(null);
  const modeRef = useRef('live');
  const userIdRef = useRef(null);

  const api = getApi(mode);

  const loadLiveProfile = useCallback(async (user) => {
    userIdRef.current = user.id;
    try {
      const prof = await getApi('live').getProfile(user.id);
      if (prof) { setProfile(prof); setMode('live'); modeRef.current = 'live'; setPhase('app'); }
      else setPhase('no-account');
    } catch {
      setPhase('no-account');
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setPhase('landing'); return undefined; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadLiveProfile(session.user);
      else setPhase(p => (p === 'loading' ? 'landing' : p));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (modeRef.current === 'demo') return;
      if (!session) {
        userIdRef.current = null;
        setProfile(null);
        setPhase('landing');
      } else if (event === 'SIGNED_IN' && userIdRef.current !== session.user.id) {
        /* Supabase re-emits SIGNED_IN on tab focus; only reload for a genuinely new user. */
        loadLiveProfile(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadLiveProfile]);

  const startDemo = async (role) => {
    modeRef.current = 'demo';
    setMode('demo');
    setPhase('loading');
    const demo = getApi('demo');
    setProfile(await demo.getProfile(role === 'admin' ? DEMO_ADMIN_ID : DEMO_CLIENT_ID));
    setPhase('app');
  };

  const signOut = async () => {
    if (mode === 'live' && supabase) await supabase.auth.signOut();
    modeRef.current = 'live';
    userIdRef.current = null;
    setMode('live');
    setProfile(null);
    setPhase('landing');
  };

  const restartDemo = () => {
    resetDemo();
    startDemo(profile?.role === 'admin' ? 'admin' : 'client');
  };

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <button className={styles.brand} onClick={phase === 'app' ? undefined : onBackToPortfolio} aria-label="OnboardBase">
          <span className={styles.brandMark}><ClipboardCheck size={18} /></span>
          OnboardBase
        </button>
        <div className={styles.topActions}>
          {phase === 'app' && mode === 'demo' && (
            <>
              <span className={styles.demoPill}>Demo mode</span>
              <button className={styles.btnText} onClick={restartDemo}><RotateCcw size={14} /> Reset demo</button>
            </>
          )}
          {phase === 'app' && (
            <button className={styles.btnText} onClick={signOut}><LogOut size={14} /> {mode === 'demo' ? 'Exit demo' : 'Sign out'}</button>
          )}
          <button className={styles.btnText} onClick={onBackToPortfolio}><ArrowLeft size={14} /> Portfolio</button>
        </div>
      </header>

      <main className={styles.main}>
        {phase === 'loading' && <Spinner label="Loading…" />}
        {phase === 'landing' && <LandingPage onDemo={startDemo} />}
        {phase === 'no-account' && (
          <div className={`${styles.card} ${styles.narrow}`}>
            <h2>No OnboardBase account found</h2>
            <p className={styles.muted}>You're signed in, but this email isn't linked to a client portal. Ask your VA to send you an invite.</p>
            <button className={styles.btnPrimary} onClick={signOut}>Sign out</button>
          </div>
        )}
        {phase === 'app' && profile && (
          profile.role === 'admin'
            ? <AdminDashboard api={api} profile={profile} />
            : <ClientDashboard api={api} profile={profile} />
        )}
      </main>
    </div>
  );
}
