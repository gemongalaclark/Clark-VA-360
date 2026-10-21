import { useState } from 'react';
import { Mail, ArrowRight, KeyRound, Loader2, Sparkles, ClipboardPaste, Database, Workflow, Bot, KanbanSquare, Target, ShieldAlert, PenLine, Timer, Inbox } from 'lucide-react';
import styles from './BuhayvaCopilot.module.css';
import { supabase } from '../../lib/supabase';

const FLOW = [
  { icon: ClipboardPaste, title: 'Paste or 1-click', text: 'Paste a job post, or send it from the Upwork / OLJ tab with the bookmarklet.' },
  { icon: Database, title: 'Supabase', text: 'The job is saved under your account. Row Level Security keeps it private.' },
  { icon: Workflow, title: 'Make.com', text: 'A webhook verifies your session, then pulls your master resume and the job.' },
  { icon: Bot, title: 'Gemini 2.5 Flash', text: 'Scores the fit, finds hidden attention checks and red flags, drafts the pitch.' },
  { icon: KanbanSquare, title: 'Application CRM', text: 'Copy the pitch, apply, then track it from Applied to Offer.' },
];

const IMPACT = [
  { icon: Target, title: 'Apply where you can win', text: 'A 0–100 fit score tells you which posts deserve your time.' },
  { icon: ShieldAlert, title: 'Never miss a code word', text: '“Put BANANA in the subject” gets flagged before you hit send.' },
  { icon: PenLine, title: 'Pitches that sound human', text: 'Specific proof from your resume, no AI clichés, a smart closing question.' },
  { icon: Timer, title: '20 minutes → 20 seconds', text: 'Per application, from reading the post to a ready-to-send proposal.' },
];

/* Email sign-in. shouldCreateUser:false keeps strangers from creating accounts on this shared
   Supabase project; access to live mode is further gated by bv_members. */
function SignInForm() {
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
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/buhayva-copilot` },
    });
    if (err && !/signups not allowed|user not found/i.test(err.message)) {
      setError(err.message);
      setState('idle');
      return;
    }
    /* Same message whether or not the address exists, so the form can't be used to probe accounts. */
    setState('sent');
  };

  const verify = async (e) => {
    e.preventDefault();
    setState('verifying');
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (err) { setError('That code is invalid or has expired. Check it and try again.'); setState('sent'); }
    /* On success onAuthStateChange fires and the parent loads the dashboard. */
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
          <label htmlFor="bv-login-code" className={styles.srOnly}>Sign-in code</label>
          <input
            id="bv-login-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter code from email"
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
      <label htmlFor="bv-login-email" className={styles.srOnly}>Email address</label>
      <input id="bv-login-email" type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className={styles.btnPrimary} disabled={state === 'sending'}>
        {state === 'sending' ? <Loader2 className={styles.spin} size={16} /> : <Mail size={16} />} Email me a sign-in code
      </button>
      {error && <p className={styles.fieldError} role="alert">{error}</p>}
    </form>
  );
}

export default function LandingPage({ onDemo, hasIngest }) {
  return (
    <div className={styles.landing}>
      {hasIngest && (
        <p className={styles.callout}>
          <Inbox size={18} />
          <span>A job post is waiting from the bookmarklet. Sign in (or open the demo) and it will be ready to analyze.</span>
        </p>
      )}

      <section className={styles.hero}>
        <span className={styles.eyebrow}>AI job analyzer · pitch generator · application CRM</span>
        <h1>Score the job. Draft the pitch. Track the deal.</h1>
        <p>
          BuhayVA Copilot reads an Upwork or OnlineJobs.ph post against your master resume, scores how well you fit,
          catches hidden attention checks and red flags, and writes a tailored proposal you can send in one click.
        </p>
        <div className={styles.demoRow}>
          <button className={styles.btnPrimary} onClick={onDemo}>
            <Sparkles size={16} /> Try the live demo <ArrowRight size={16} />
          </button>
        </div>
        <p className={styles.muted}>The demo runs entirely in your browser with a sample resume. No account needed.</p>
      </section>

      <section className={`${styles.card} ${styles.signIn}`}>
        <h2>Sign in to your Copilot</h2>
        <p className={styles.muted}>Live mode uses Gemini AI and saves your pipeline to your account.</p>
        <SignInForm />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Architecture &amp; data flow</h2>
        <p className={styles.muted}>Vite + React on the front, Supabase for data and auth, Make.com orchestrating Gemini.</p>
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
