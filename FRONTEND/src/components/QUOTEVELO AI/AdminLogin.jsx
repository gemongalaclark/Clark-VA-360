import { useState } from 'react';
import { LogIn, Loader2, LayoutDashboard, ArrowLeft } from 'lucide-react';
import styles from './QuoteVelo.module.css';
import { supabase, setRememberMe } from '../../lib/supabase';

/* Owner sign-in (live mode): Supabase email + password. Being signed in isn't enough; the app then
   checks the qv_admins allow-list, and RLS enforces the same on the server. */

export default function AdminLogin({ onBack, onDemo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setRememberMe(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(/invalid login/i.test(err.message) ? 'Wrong email or password.' : err.message);
      setBusy(false);
    }
    /* On success onAuthStateChange fires and the parent verifies admin access. */
  };

  return (
    <div className={`${styles.card} ${styles.narrow}`}>
      <h2>Owner sign in</h2>
      <p className={styles.muted}>Private dashboard for reviewing leads and approving proposals.</p>

      {supabase ? (
        <form className={styles.loginForm} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="qv-login-email">Email</label>
            <input id="qv-login-email" type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="qv-login-pw">Password</label>
            <input id="qv-login-pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className={styles.fieldError} role="alert">{error}</p>}
          <button className={styles.btnPrimary} disabled={busy || !email || !password}>
            {busy ? <Loader2 className={styles.spin} size={16} /> : <LogIn size={16} />} Sign in
          </button>
        </form>
      ) : (
        <p className={styles.callout}>Live sign-in isn't configured on this deployment.</p>
      )}

      <div className={styles.loginAlt}>
        {onDemo && <button className={styles.btnGhost} onClick={onDemo}><LayoutDashboard size={16} /> Open the demo dashboard</button>}
        <button className={styles.btnText} onClick={onBack}><ArrowLeft size={14} /> Back</button>
      </div>
    </div>
  );
}
