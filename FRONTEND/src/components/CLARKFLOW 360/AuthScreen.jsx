import { useState } from 'react';
import { Mail, KeyRound, Loader2, Inbox, Gauge, PenLine } from 'lucide-react';
import styles from './ClarkFlow360.module.css';
import { api, isConfigured } from './cfApi';

const POINTS = [
  { icon: Inbox, text: 'New client email is pulled in and matched to the right client.' },
  { icon: Gauge, text: 'Gemini ranks each message high, medium or low, with a one-line summary.' },
  { icon: PenLine, text: 'A reply is drafted in each client’s tone. You review it, then send.' },
];

/* Email sign-in code (no passwords). On success onAuthStateChange fires and the parent takes over. */
export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState('idle');   // idle | sending | sent | verifying
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      await api.sendSignInCode(email.trim());
      /* Same message whether or not the address exists, so the form can't be used to probe accounts. */
      setState('sent');
    } catch (err) {
      setError(err.message);
      setState('idle');
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setState('verifying');
    setError('');
    try {
      await api.verifySignInCode(email.trim(), code.trim());
    } catch (err) {
      setError(err.message);
      setState('sent');
    }
  };

  return (
    <section className={styles.authCard}>
      <div className={styles.authPitch}>
        <span className={styles.eyebrow}>Private VA workspace</span>
        <h1>Your inbox, <em>triaged.</em></h1>
        <ul>
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text}><Icon size={17} aria-hidden="true" /> {text}</li>
          ))}
        </ul>
      </div>

      <div className={styles.authForm}>
        {!isConfigured ? (
          <p className={styles.muted}>Sign-in isn’t configured on this deployment (Supabase keys are missing).</p>
        ) : state === 'sent' || state === 'verifying' ? (
          <form onSubmit={verify}>
            <h2>Check your email</h2>
            <p className={styles.muted}>
              If <strong>{email}</strong> has an account, we’ve sent a sign-in link and a code.
              It comes from ClarkFlow 360. Click its sign-in button, or type the code here.
            </p>
            <label className={styles.label} htmlFor="cf-code">Sign-in code</label>
            <input
              id="cf-code" className={styles.input} inputMode="numeric" autoComplete="one-time-code" autoFocus
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {error && <p className={styles.errorText} role="alert">{error}</p>}
            <button className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={state === 'verifying' || code.length < 6}>
              {state === 'verifying' ? <Loader2 className={styles.spin} size={16} /> : <KeyRound size={16} />} Verify code
            </button>
            <button type="button" className={styles.btnText} onClick={() => { setState('idle'); setCode(''); setError(''); }}>
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={send}>
            <h2>Sign in</h2>
            <p className={styles.muted}>We’ll email you a one-time code. No password needed.</p>
            <label className={styles.label} htmlFor="cf-email">Email</label>
            <input
              id="cf-email" className={styles.input} type="email" required autoComplete="email" autoFocus
              placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className={styles.errorText} role="alert">{error}</p>}
            <button className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={state === 'sending'}>
              {state === 'sending' ? <Loader2 className={styles.spin} size={16} /> : <Mail size={16} />} Email me a sign-in code
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
