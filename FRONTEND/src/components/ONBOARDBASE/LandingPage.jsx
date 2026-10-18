import { useState } from 'react';
import { Mail, ArrowRight, UserRound, ShieldCheck, KeyRound, LayoutDashboard, Database, HardDrive, Loader2, Link2, Zap, Crown, RefreshCw } from 'lucide-react';
import styles from './OnboardBase.module.css';
import { supabase } from '../../lib/supabase';

const FLOW = [
  { icon: KeyRound, title: 'Magic-link login', text: 'Supabase Auth emails a one-tap link and issues a JWT. No passwords.' },
  { icon: LayoutDashboard, title: 'Vite SPA', text: 'The React dashboard sends the JWT as a Bearer token with every request.' },
  { icon: ShieldCheck, title: 'RLS check', text: 'Postgres policies compare auth.uid() to each row, so tenants never cross.' },
  { icon: Database, title: 'Postgres + JSONB', text: 'Steps, projects and flexible intake answers, all isolated per client.' },
  { icon: HardDrive, title: 'Private Storage', text: 'Brand assets and deliverables sit in a locked bucket behind signed URLs.' },
];

const IMPACT = [
  { icon: Link2, title: 'No more “where’s that link?”', text: 'Calendly, files and contacts live behind one permanent bookmark.' },
  { icon: Zap, title: 'Faster time-to-value', text: 'A motivated client can finish intake in 20 minutes on a Sunday night.' },
  { icon: Crown, title: 'Premium authority', text: 'A branded portal beats a generic form and justifies premium pricing.' },
  { icon: RefreshCw, title: 'Async alignment', text: 'Clients see who is waiting on whom, so status meetings disappear.' },
];

/* Live sign-in: magic link only. shouldCreateUser:false keeps strangers out; clients are provisioned by an admin. */
function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState('idle');   // idle | sending | sent | verifying
  const [error, setError] = useState('');

  if (!supabase) {
    return <p className={styles.muted}>Live sign-in isn't configured on this deployment. Try the demo instead.</p>;
  }

  const send = async (e) => {
    e.preventDefault();
    setState('sending');
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/onboardbase` },
    });
    if (err) {
      /* Don't reveal whether an address is registered: show a neutral message for the "user not found" case. */
      const notFound = /signups not allowed|user not found/i.test(err.message);
      if (notFound) setState('sent');
      else { setError(err.message); setState('idle'); }
      return;
    }
    setState('sent');
  };

  /* The project's email template may include a one-time code as well as the link (it is shared with
     other apps on this Supabase project), so accept either: click the link, or type the code here. */
  const verify = async (e) => {
    e.preventDefault();
    setState('verifying');
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (err) { setError('That code is invalid or has expired. Check it and try again.'); setState('sent'); }
    /* On success onAuthStateChange fires and the parent loads the portal. */
  };

  if (state === 'sent' || state === 'verifying') {
    return (
      <div>
        <p className={styles.callout}>
          <Mail size={18} />
          <span>
            If <strong>{email}</strong> has an account, we've emailed a sign-in link and a code.
            Click the link, or type the code below. (The email may mention another Clark VA 360 app. It works the same.)
          </span>
        </p>
        <form className={styles.loginForm} onSubmit={verify}>
          <label htmlFor="ob-login-code" className={styles.srOnly}>Sign-in code</label>
          <input
            id="ob-login-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter code from email"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button className={styles.btnPrimary} disabled={state === 'verifying' || code.length < 6}>
            {state === 'verifying' ? <Loader2 className={styles.spin} size={16} /> : <KeyRound size={16} />} Verify code
          </button>
          {error && <p className={styles.fieldError} role="alert">{error}</p>}
          <button type="button" className={styles.btnText} onClick={() => { setState('idle'); setCode(''); setError(''); }}>
            Use a different email
          </button>
        </form>
      </div>
    );
  }

  return (
    <form className={styles.loginForm} onSubmit={send}>
      <label htmlFor="ob-login-email" className={styles.srOnly}>Email address</label>
      <input id="ob-login-email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className={styles.btnPrimary} disabled={state === 'sending'}>
        {state === 'sending' ? <Loader2 className={styles.spin} size={16} /> : <Mail size={16} />} Email me a sign-in link
      </button>
      {error && <p className={styles.fieldError} role="alert">{error}</p>}
    </form>
  );
}

export default function LandingPage({ onDemo }) {
  return (
    <div className={styles.landing}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Client onboarding portal</span>
        <h1>Onboard clients in 20 minutes, not 2 weeks.</h1>
        <p>
          OnboardBase replaces email threads and Google Forms with one secure portal: progress tracking,
          a save-and-resume intake form, drag-and-drop brand assets, and a clean handoff to the live project.
        </p>

        <div className={styles.demoRow}>
          <button className={styles.btnPrimary} onClick={() => onDemo('client')}>
            <UserRound size={16} /> Try the client experience <ArrowRight size={16} />
          </button>
          <button className={styles.btnGhost} onClick={() => onDemo('admin')}>
            <ShieldCheck size={16} /> Try the admin view
          </button>
        </div>
        <p className={styles.muted}>The demo runs entirely in your browser. No account needed.</p>
      </section>

      <section className={`${styles.card} ${styles.signIn}`}>
        <h2>Already a client?</h2>
        <p className={styles.muted}>Enter your email and we'll send you a secure link.</p>
        <MagicLinkForm />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Architecture &amp; data flow</h2>
        <p className={styles.muted}>Vite + React on the front, Supabase for auth, data, security and files.</p>
        <ol className={styles.flow}>
          {FLOW.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={styles.flowStep}>
              <span className={styles.flowIcon}><Icon size={20} /></span>
              <strong>{i + 1}. {title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Why it matters</h2>
        <div className={styles.impactGrid}>
          {IMPACT.map(({ icon: Icon, title, text }) => (
            <div key={title} className={styles.card}>
              <span className={styles.flowIcon}><Icon size={20} /></span>
              <strong>{title}</strong>
              <p className={styles.muted}>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
