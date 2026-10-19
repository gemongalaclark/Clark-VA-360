import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, LogOut, Zap, RotateCcw, LogIn, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './QuoteVelo.module.css';
import { getApi, isLiveAvailable } from './qvApi';
import { resetDemo } from './qvDemo';
import { Spinner } from './ui';
import LandingPage from './LandingPage';
import QuoteForm from './QuoteForm';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

/* QuoteVelo AI root.
     views: loading → home → form → thanks            (prospect side)
                       home → login → admin           (owner side, live Supabase auth)
                       home → admin (demo)            (in-browser demo dashboard)

   Visitors of the portfolio use the DEMO backend for the public form so they can watch the whole
   pipeline without anyone's real database filling with test leads. A real deployment sets
   VITE_QV_PUBLIC_MODE=live to send form submissions to Supabase instead. */

const PUBLIC_LIVE = isLiveAvailable && import.meta.env.VITE_QV_PUBLIC_MODE === 'live';

export default function QuoteVelo({ onBackToPortfolio }) {
  const [view, setView] = useState('loading');   // loading | home | form | thanks | login | admin | no-access
  const [adminMode, setAdminMode] = useState('live');
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const adminModeRef = useRef('live');
  const userIdRef = useRef(null);

  const publicApi = getApi(PUBLIC_LIVE ? 'live' : 'demo');
  const adminApi = getApi(adminMode);

  const checkAdmin = useCallback(async (user) => {
    userIdRef.current = user.id;
    try {
      if (await getApi('live').isAdmin(user.id)) {
        setProfile({ email: user.email });
        setAdminMode('live');
        adminModeRef.current = 'live';
        setView('admin');
      } else {
        setView('no-access');
      }
    } catch {
      setView('no-access');
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setView('home'); return undefined; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        /* A session from another Clark VA 360 app (TeamSync, OnboardBase) is not an admin here:
           only jump into the dashboard when it really is one, otherwise show the public page. */
        getApi('live').isAdmin(session.user.id)
          .then(ok => (ok ? checkAdmin(session.user) : setView(v => (v === 'loading' ? 'home' : v))))
          .catch(() => setView(v => (v === 'loading' ? 'home' : v)));
      } else {
        setView(v => (v === 'loading' ? 'home' : v));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (adminModeRef.current === 'demo') return;
      if (!session) {
        userIdRef.current = null;
        setProfile(null);
        setView(v => (v === 'admin' || v === 'no-access' ? 'home' : v));
      } else if (event === 'SIGNED_IN' && userIdRef.current !== session.user.id) {
        /* Supabase re-emits SIGNED_IN on tab focus; only react to a genuinely new user. */
        checkAdmin(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  const startAdminDemo = () => {
    adminModeRef.current = 'demo';
    setAdminMode('demo');
    setProfile({ email: 'demo@quotevelo.app', full_name: 'Demo owner' });
    setView('admin');
  };

  const signOut = async () => {
    if (adminMode === 'live' && supabase) await supabase.auth.signOut();
    adminModeRef.current = 'live';
    userIdRef.current = null;
    setAdminMode('live');
    setProfile(null);
    setView('home');
  };

  const restartDemo = () => {
    resetDemo();
    setProfile({ email: 'demo@quotevelo.app', full_name: 'Demo owner' });
  };

  const inAdmin = view === 'admin' && profile;

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <button className={styles.brand} onClick={() => (inAdmin ? undefined : setView('home'))} aria-label="QuoteVelo AI home">
          <span className={styles.brandMark}><Zap size={18} /></span>
          QuoteVelo <span className={styles.brandAi}>AI</span>
        </button>
        <div className={styles.topActions}>
          {inAdmin && adminMode === 'demo' && (
            <>
              <span className={styles.demoPill}>Demo mode</span>
              <button className={styles.btnText} onClick={restartDemo}><RotateCcw size={14} /> Reset demo</button>
            </>
          )}
          {inAdmin && (
            <button className={styles.btnText} onClick={signOut}><LogOut size={14} /> {adminMode === 'demo' ? 'Exit demo' : 'Sign out'}</button>
          )}
          {!inAdmin && view !== 'login' && isLiveAvailable && (
            <button className={styles.btnText} onClick={() => setView('login')}><LogIn size={14} /> Owner sign in</button>
          )}
          <button className={styles.btnText} onClick={onBackToPortfolio}><ArrowLeft size={14} /> Portfolio</button>
        </div>
      </header>

      <main className={styles.main}>
        {view === 'loading' && <Spinner label="Loading…" />}

        {view === 'home' && (
          <LandingPage
            demoPublic={!PUBLIC_LIVE}
            showOwner={isLiveAvailable}
            onRequest={() => setView('form')}
            onAdmin={() => setView('login')}
            onAdminDemo={PUBLIC_LIVE ? undefined : startAdminDemo}
          />
        )}

        {view === 'form' && (
          <QuoteForm
            api={publicApi}
            onCancel={() => setView('home')}
            onSubmitted={(name) => { setFirstName(name || ''); setView('thanks'); }}
          />
        )}

        {view === 'thanks' && (
          <div className={`${styles.card} ${styles.narrow} ${styles.thanks}`}>
            <span className={styles.thanksIcon}><CheckCircle2 size={34} /></span>
            <h1>Thank you{firstName ? `, ${firstName}` : ''}!</h1>
            <p className={styles.muted}>
              Your request is in. {PUBLIC_LIVE
                ? 'A tailored proposal will land in your inbox shortly.'
                : 'In a real deployment, the AI would now be scoring it and drafting your proposal.'}
            </p>
            <div className={styles.thanksActions}>
              {!PUBLIC_LIVE && (
                <button className={styles.btnPrimary} onClick={startAdminDemo}><LayoutDashboard size={16} /> Watch it in the owner dashboard</button>
              )}
              <button className={styles.btnGhost} onClick={() => setView('home')}>Back to home</button>
            </div>
          </div>
        )}

        {view === 'login' && (
          <AdminLogin onBack={() => setView('home')} onDemo={PUBLIC_LIVE ? undefined : startAdminDemo} />
        )}

        {view === 'no-access' && (
          <div className={`${styles.card} ${styles.narrow}`}>
            <h2>No access to the QuoteVelo dashboard</h2>
            <p className={styles.muted}>You're signed in, but this account isn't on the owner allow-list.</p>
            <button className={styles.btnPrimary} onClick={signOut}>Sign out</button>
          </div>
        )}

        {inAdmin && <AdminDashboard key={adminMode} api={adminApi} profile={profile} />}
      </main>
    </div>
  );
}
