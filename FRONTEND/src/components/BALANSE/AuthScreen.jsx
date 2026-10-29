import { useState } from 'react';
import { Eye, EyeOff, Landmark, Target, PieChart } from 'lucide-react';
import styles from './Balanse.module.css';
import { api } from './blApi';
import { Field } from './ui';

/* New visitors land on Sign up; returning users switch to Sign in. Username + password only. */
export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('signup');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = String(f.get('username')).trim();
    const password = String(f.get('password'));
    if (isSignup && password !== f.get('confirm')) { setError('Passwords don’t match.'); return; }
    setBusy(true);
    setError('');
    try {
      onAuthed(await (isSignup ? api.signUp(username, password) : api.signIn(username, password)));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const switchMode = () => { setMode(isSignup ? 'signin' : 'signup'); setError(''); };

  return (
    <div className={styles.authWrap}>
      <section className={styles.authPitch}>
        <span className={styles.logoMark}>B</span>
        <h1>See your money in <em>balanse</em>.</h1>
        <p>Track every debt, set goals like your dream car, and see how close you are at a glance.</p>
        <ul>
          <li><PieChart size={18} /> One overview of what you owe and what you’ve saved</li>
          <li><Landmark size={18} /> A debt tracker that shows each loan getting paid off</li>
          <li><Target size={18} /> Goals with the monthly amount you need to hit them</li>
        </ul>
      </section>

      <form className={styles.authCard} onSubmit={submit} key={mode}>
        <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
        <p className={styles.muted}>
          {isSignup ? 'Just a username and password. No email needed.' : 'Sign in with your username and password.'}
        </p>

        <Field label="Username" hint={isSignup ? '3–24 characters: letters, numbers, dot or underscore.' : undefined}>
          <input
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_.]+"
            autoFocus
          />
        </Field>

        <Field label="Password" hint={isSignup ? 'At least 8 characters.' : undefined}>
          <div className={styles.pwWrap}>
            <input
              name="password"
              type={showPw ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={isSignup ? 8 : undefined}
            />
            <button type="button" className={styles.pwToggle} onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {isSignup && (
          <Field label="Confirm password">
            <input name="confirm" type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={8} />
          </Field>
        )}

        {error && <p className={styles.errorText} role="alert">{error}</p>}

        <button className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
        </button>

        <p className={styles.authSwitch}>
          {isSignup ? 'Already have an account?' : 'New to BALANSE?'}{' '}
          <button type="button" onClick={switchMode}>{isSignup ? 'Sign in' : 'Create an account'}</button>
        </p>
      </form>
    </div>
  );
}
