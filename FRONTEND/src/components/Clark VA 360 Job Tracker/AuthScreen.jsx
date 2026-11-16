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

/* Sign in only. Sign-up is closed: new accounts are added by the owner in Supabase
   (see BACKEND/JOB TRACKER/schema.sql). Username + password only. */
export default function AuthScreen({ onAuthed, onBack }) {
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = String(f.get('username')).trim();
    const pw = String(f.get('password'));
    setBusy(true);
    setError('');
    try {
      onAuthed(await api.signIn(username, pw));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

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
          <div>
            <h2>Welcome <em>back</em></h2>
            <p className={styles.muted}>Sign in with your username and password.</p>
          </div>

          <Field label="Username">
            <input
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
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
              />
              <button type="button" className={styles.pwToggle} onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </Field>

          {error && <p className={styles.errorText} role="alert">{error}</p>}

          <button className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>
            {busy ? 'Please wait…' : 'Sign in'} {!busy && <ArrowRight size={16} />}
          </button>

          <p className={styles.authFine}>Accounts are invite-only, so there’s no sign-up here.</p>
        </form>
      </section>
    </div>
  );
}
