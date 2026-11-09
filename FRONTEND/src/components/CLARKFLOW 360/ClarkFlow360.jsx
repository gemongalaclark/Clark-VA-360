import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LogOut, Loader2, ShieldOff, CheckCircle2, AlertCircle, X } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { supabase } from '../../lib/supabase';
import { api, isConfigured, APP_PATH, CONNECT_ERRORS } from './cfApi';
import AuthScreen from './AuthScreen';
import ConnectGmail from './ConnectGmail';

/* cf-google-callback sends the browser back with ?gmail=connected or ?gmail=error&reason=….
   Read it once, then clean the address bar so a refresh doesn't repeat the message. */
function takeConnectResult() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('gmail');
  if (!result) return null;
  window.history.replaceState({}, '', APP_PATH);
  return result === 'connected'
    ? { kind: 'ok', text: 'Gmail connected. ClarkFlow can now read and reply to your email.' }
    : { kind: 'error', text: CONNECT_ERRORS[params.get('reason')] ?? CONNECT_ERRORS.google_error };
}

/* ClarkFlow 360 root: loading → sign in → (members only) Gmail connection.
   The triage workspace is added on top of this in the next phases. */
export default function ClarkFlow360({ onBackToPortfolio }) {
  const [phase, setPhase] = useState('loading');   // loading | signin | no-access | app
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);      // { kind: 'ok' | 'error', text }
  const userIdRef = useRef(null);

  useEffect(() => {
    const result = takeConnectResult();
    if (result) setNotice(result);
  }, []);

  /* Success notices fade on their own; errors stay until dismissed. */
  useEffect(() => {
    if (notice?.kind !== 'ok') return undefined;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const enter = useCallback(async (user) => {
    userIdRef.current = user.id;
    setEmail(user.email ?? '');
    try {
      setPhase((await api.isMember()) ? 'app' : 'no-access');
    } catch (err) {
      setNotice({ kind: 'error', text: /cf_is_member/.test(err.message)
        ? 'ClarkFlow’s database isn’t set up yet. Run BACKEND/CLARKFLOW 360/schema.sql in Supabase.'
        : err.message });
      setPhase('no-access');
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) { setPhase('signin'); return undefined; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) enter(session.user);
      else setPhase('signin');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        userIdRef.current = null;
        setPhase('signin');
      } else if (event === 'SIGNED_IN' && userIdRef.current !== session.user.id) {
        /* Supabase re-emits SIGNED_IN on tab focus; only reload for a genuinely new user. */
        enter(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [enter]);

  const signedIn = phase === 'app' || phase === 'no-access';

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <span className={styles.logoTile} aria-hidden="true"><img src="/images/logo.png" alt="" /></span>
          <span><strong>ClarkFlow 360</strong><small>AI email triage</small></span>
        </span>
        <div className={styles.topActions}>
          {signedIn && <span className={styles.who} title={email}>{email}</span>}
          {signedIn && (
            <button className={styles.btnGhost} onClick={() => api.signOut()} aria-label="Sign out">
              <LogOut size={15} /> <span className={styles.btnLabel}>Sign out</span>
            </button>
          )}
          <button className={styles.btnGhost} onClick={onBackToPortfolio} aria-label="Back to portfolio">
            <ArrowLeft size={15} /> <span className={styles.btnLabel}>Portfolio</span>
          </button>
        </div>
      </header>

      {notice && (
        <div className={`${styles.notice} ${notice.kind === 'ok' ? styles.noticeOk : styles.noticeError}`} role={notice.kind === 'ok' ? 'status' : 'alert'}>
          {notice.kind === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notice.text}</span>
          <button className={styles.iconBtn} onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      <main className={styles.main}>
        {phase === 'loading' && <Loader2 className={styles.spin} size={28} aria-label="Loading" />}

        {phase === 'signin' && <AuthScreen />}

        {phase === 'no-access' && (
          <section className={styles.card}>
            <span className={styles.cardIcon}><ShieldOff size={22} /></span>
            <h2>ClarkFlow isn’t enabled for this account</h2>
            <p className={styles.muted}>
              ClarkFlow 360 is private. <strong>{email}</strong> is signed in but isn’t on the members list.
              Sign in with a different email, or add this account in Supabase (schema.sql, section 7).
            </p>
            <button className={styles.btnPrimary} onClick={() => api.signOut()}><LogOut size={16} /> Use a different email</button>
          </section>
        )}

        {phase === 'app' && <ConnectGmail onNotice={setNotice} />}
      </main>
    </div>
  );
}
