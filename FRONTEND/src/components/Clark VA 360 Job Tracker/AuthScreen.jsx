import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import styles from './JobTracker.module.css';
import { api } from './jtApi';
import { Field, Logo, SOURCES } from './ui';

/* Sample rows for the left panel: an illustration of the app, not real data. */
const SAMPLE = [
  { day: 'NOV 06', title: 'Executive Virtual Assistant', source: 0 },
  { day: 'NOV 04', title: 'Social Media Manager', source: 1 },
  { day: 'NOV 03', title: 'Customer Support VA', source: 2 },
];

/* New visitors land on Sign up; returning users switch to Sign in. Username + password only. */
export default function AuthScreen({ onAuthed, onBack }) {
  const [mode, setMode] = useState('signup');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = String(f.get('username')).trim();
    const pw = String(f.get('password'));
    if (isSignup && pw !== f.get('confirm')) { setError('Passwords don’t match.'); return; }
    setBusy(true);
    setError('');
    try {
      onAuthed(await (isSignup ? api.signUp(username, pw) : api.signIn(username, pw)));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const switchTo = (m) => { setMode(m); setError(''); };

  return (
    <div className={styles.authWrap}>
      <section className={styles.authPanel}>
        <div className={styles.authTop}>
          <span className={styles.brand}>
            <Logo size={40} />
            <span><strong>Clark VA 360</strong><small>Job Tracker</small></span>
          </span>
          <button className={styles.authBack} onClick={onBack}><ArrowLeft size={15} /> Portfolio</button>
        </div>

        <div className={styles.authPitch}>
          <span className={styles.eyebrowLight}>Your job hunt, in one place</span>
          <h1>Every application, <em>accounted for.</em></h1>
          <p>Log the jobs you apply to, bookmark the ones you’re saving for later, and see where your best leads come from.</p>
        </div>

        <ol className={styles.authLog} aria-hidden="true">
          {SAMPLE.map((r) => (
            <li key={r.title}>
              <time>{r.day}</time>
              <strong>{r.title}</strong>
              <span className={styles.authLogSrc}><i style={{ background: r.source === 0 ? '#fff' : SOURCES[r.source].color }} />{SOURCES[r.source].label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.authSide}>
        <form className={styles.authCard} onSubmit={submit}>
          <div className={styles.segmented} role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? styles.segOn : ''} onClick={() => switchTo('signup')}>Sign up</button>
            <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? styles.segOn : ''} onClick={() => switchTo('signin')}>Sign in</button>
          </div>

          <div>
            <h2>{isSignup ? <>Create your <em>account</em></> : <>Welcome <em>back</em></>}</h2>
            <p className={styles.muted}>
              {isSignup ? 'Just a username and a password. No email needed.' : 'Sign in with your username and password.'}
            </p>
          </div>

          <Field label="Username" hint={isSignup ? '3–24 characters: letters, numbers, dot or underscore.' : undefined}>
            <input
              key={`u-${mode}`}
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_.]+"
              autoFocus
              placeholder="e.g. juan.dc"
            />
          </Field>

          <Field label="Password">
            <span className={styles.pwWrap}>
              <input
                key={`p-${mode}`}
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={isSignup ? 8 : undefined}
                placeholder={isSignup ? 'At least 8 characters' : ''}
              />
              <button type="button" className={styles.pwToggle} onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </Field>

          {isSignup && (
            <Field label="Confirm password">
              <input name="confirm" type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={8} />
            </Field>
          )}

          {error && <p className={styles.errorText} role="alert">{error}</p>}

          <button className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={16} />}
          </button>

          <p className={styles.authFine}>
            {isSignup
              ? 'There’s no email, so there’s no password reset. Pick one you’ll remember.'
              : <>New here? <button type="button" onClick={() => switchTo('signup')}>Create an account</button></>}
          </p>
        </form>
      </section>
    </div>
  );
}
