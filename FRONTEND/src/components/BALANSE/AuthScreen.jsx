import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Target, Landmark } from 'lucide-react';
import styles from './Balanse.module.css';
import { api } from './blApi';
import { Field, Logo } from './ui';

/* 0–4: length plus character variety. Only a nudge; the server enforces the 8-char minimum. */
function strength(pw) {
  if (pw.length < 8) return pw ? 1 : 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length;
  return Math.min(4, 1 + (pw.length >= 12 ? 1 : 0) + (kinds >= 2 ? 1 : 0) + (kinds >= 3 ? 1 : 0));
}
const STRENGTH = ['', 'Too short', 'Okay', 'Good', 'Strong'];

/* New visitors land on Sign up; returning users switch to Sign in. Username + password only. */
export default function AuthScreen({ onAuthed, onBack }) {
  const [mode, setMode] = useState('signup');
  const [showPw, setShowPw] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';
  const level = strength(pw);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = String(f.get('username')).trim();
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

  const switchTo = (m) => { setMode(m); setError(''); setPw(''); };

  return (
    <div className={styles.authWrap}>
      <section className={styles.authPanel}>
        <div className={styles.authPanelTop}>
          <span className={styles.authBrand}><Logo size={38} /> BALANSE</span>
          <button className={styles.authBack} onClick={onBack}><ArrowLeft size={15} /> Portfolio</button>
        </div>

        <div className={styles.authPitch}>
          <span className={styles.eyebrowLight}>Personal finance, made calm</span>
          <h1>Keep your money in <em>balanse.</em></h1>
          <p>Put every debt on one side, every dream on the other, and watch the scale tip in your favour.</p>
        </div>

        {/* Sample cards: an illustration of the app, not real data */}
        <div className={styles.authStack} aria-hidden="true">
          <div className={`${styles.sampleCard} ${styles.sampleGoal}`}>
            <div className={styles.sampleHead}><Target size={14} /> Goal</div>
            <strong>Montero Sport</strong>
            <span className={styles.sampleAmt}>₱252,000 <small>of ₱600,000</small></span>
            <span className={styles.sampleBar}><i style={{ width: '42%' }} /></span>
            <span className={styles.sampleFoot}>42% saved · ₱29,000/mo</span>
          </div>
          <div className={`${styles.sampleCard} ${styles.sampleDebt}`}>
            <div className={styles.sampleHead}><Landmark size={14} /> Debt</div>
            <strong>Credit card</strong>
            <span className={styles.sampleAmt}>₱18,500 <small>left</small></span>
            <span className={styles.sampleBar}><i style={{ width: '63%' }} /></span>
            <span className={styles.sampleFoot}>63% paid · due every 15th</span>
          </div>
        </div>
      </section>

      <section className={styles.authSide}>
        <form className={styles.authCard} onSubmit={submit}>
          <div className={styles.segmented} role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? styles.segOn : ''} onClick={() => switchTo('signup')}>Sign up</button>
            <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? styles.segOn : ''} onClick={() => switchTo('signin')}>Sign in</button>
          </div>

          <div>
            <h2>{isSignup ? <>Start your <em>balanse</em></> : <>Welcome <em>back</em></>}</h2>
            <p className={styles.muted}>
              {isSignup ? 'All you need is a username and a password. No email, no fuss.' : 'Sign in with your username and password.'}
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
            <div className={styles.pwWrap}>
              <input
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={isSignup ? 8 : undefined}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={isSignup ? 'At least 8 characters' : ''}
              />
              <button type="button" className={styles.pwToggle} onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isSignup && pw && (
              <span className={styles.strength} data-level={level}>
                <span className={styles.strengthBars} aria-hidden="true"><i /><i /><i /><i /></span>
                {STRENGTH[level]}
              </span>
            )}
          </Field>

          {isSignup && (
            <Field label="Confirm password">
              <input name="confirm" type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={8} />
            </Field>
          )}

          {error && <p className={styles.errorText} role="alert">{error}</p>}

          <button className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>
            {busy ? 'Please wait…' : isSignup ? 'Create my account' : 'Sign in'} {!busy && <ArrowRight size={16} />}
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
