import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, LogOut, RotateCcw, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './BuhayvaCopilot.module.css';
import { getApi } from './bvApi';
import { resetDemo } from './bvDemo';
import { readIngestFromHash, readStashedIngest, clearStashedIngest } from './bvData';
import { Spinner } from './ui';
import LandingPage from './LandingPage';
import CopilotDashboard from './CopilotDashboard';

/* BuhayVA Copilot root. Owns the auth state machine:
     loading → landing → (live session | demo) → no-access | app
   Live mode signs in with a Supabase email code and requires a row in bv_members, so other
   users of this shared Supabase project can't spend the Make.com / Gemini quota.
   Demo mode swaps in an in-browser API with the same interface. */

export default function BuhayvaCopilot({ onBackToPortfolio }) {
  const [phase, setPhase] = useState('loading');   // loading | landing | no-access | app
  const [mode, setMode] = useState('live');        // live | demo
  const [profile, setProfile] = useState(null);
  const [ingest, setIngest] = useState(() => readIngestFromHash() || readStashedIngest());
  const [demoKey, setDemoKey] = useState(0);
  const modeRef = useRef('live');
  const userIdRef = useRef(null);

  const api = getApi(mode);

  /* A job sent by the bookmarklet while this tab is already open. */
  useEffect(() => {
    const onHash = () => { const next = readIngestFromHash(); if (next) setIngest(next); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const loadLive = useCallback(async (user) => {
    userIdRef.current = user.id;
    try {
      const live = getApi('live');
      if (!(await live.isMember())) { setPhase('no-access'); return; }
      setProfile(await live.getProfile());
      setMode('live');
      modeRef.current = 'live';
      setPhase('app');
    } catch {
      setPhase('no-access');
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setPhase('landing'); return undefined; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadLive(session.user);
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
        loadLive(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadLive]);

  const startDemo = async () => {
    modeRef.current = 'demo';
    setMode('demo');
    setPhase('loading');
    setProfile(await getApi('demo').getProfile());
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

  const restartDemo = async () => {
    resetDemo();
    setProfile(await getApi('demo').getProfile());
    setDemoKey(k => k + 1);
  };

  const consumeIngest = useCallback(() => { clearStashedIngest(); setIngest(null); }, []);

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <button className={styles.brand} onClick={phase === 'app' ? undefined : onBackToPortfolio} aria-label="BuhayVA Copilot">
          <span className={styles.brandMark}><Sparkles size={18} /></span>
          BuhayVA Copilot
        </button>
        <div className={styles.topActions}>
          {phase === 'app' && mode === 'demo' && (
            <>
              <span className={styles.demoPill}>Demo mode</span>
              <button className={styles.btnText} onClick={restartDemo}><RotateCcw size={14} /> Reset demo</button>
            </>
          )}
          {(phase === 'app' || phase === 'no-access') && (
            <button className={styles.btnText} onClick={signOut}><LogOut size={14} /> {mode === 'demo' ? 'Exit demo' : 'Sign out'}</button>
          )}
          <button className={styles.btnText} onClick={onBackToPortfolio}><ArrowLeft size={14} /> Portfolio</button>
        </div>
      </header>

      <main className={styles.main}>
        {phase === 'loading' && <Spinner label="Loading…" />}
        {phase === 'landing' && <LandingPage onDemo={startDemo} hasIngest={!!ingest} />}
        {phase === 'no-access' && (
          <div className={`${styles.card} ${styles.narrow}`}>
            <h2>Live mode isn't enabled for this account</h2>
            <p className={styles.muted}>
              You're signed in, but this account isn't on the BuhayVA Copilot member list, so it can't run
              live Gemini analyses. You can still try the full demo.
            </p>
            <div className={styles.rowGap}>
              <button className={styles.btnPrimary} onClick={startDemo}><Sparkles size={16} /> Try the demo</button>
              <button className={styles.btnGhost} onClick={signOut}>Sign out</button>
            </div>
          </div>
        )}
        {phase === 'app' && (
          <CopilotDashboard
            key={`${mode}-${demoKey}`}
            api={api}
            mode={mode}
            profile={profile}
            onProfileSaved={setProfile}
            ingest={ingest}
            onIngestConsumed={consumeIngest}
          />
        )}
      </main>
    </div>
  );
}
