import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader, CheckCircle, Check, KeyRound } from 'lucide-react';
import { supabase, setRememberMe, getRememberMe } from '../../../lib/supabase';
import styles from './AuthPage.module.css';

/* Uppercase the first letter of every word ("mary ann" -> "Mary Ann") so names are uniform */
const capitalizeName = (v) => v.replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase());

const EMAIL_KEY = 'ts-remembered-email';
const readSaved = () => { try { return localStorage.getItem(EMAIL_KEY) || ''; } catch { return ''; } };
const writeSaved = (v) => {
  try { v ? localStorage.setItem(EMAIL_KEY, v) : localStorage.removeItem(EMAIL_KEY); } catch { /* ignore */ }
};

/* Strong password rules */
const PW_RULES = [
  { key: 'len',   label: 'At least 8 characters',     test: p => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter',      test: p => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter',      test: p => /[a-z]/.test(p) },
  { key: 'num',   label: 'One number',                test: p => /\d/.test(p) },
  { key: 'sym',   label: 'One symbol (e.g. ! @ # $)', test: p => /[^A-Za-z0-9\s]/.test(p) },
];
const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
const isStrong = (p) => PW_RULES.every(r => r.test(p));

function PasswordField({ label, value, onChange, show, onToggle, placeholder, autoComplete, autoFocus }) {
  return (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <div className={styles.inputWrap}>
        <Lock size={16} className={styles.inputIcon} />
        <input
          type={show ? 'text' : 'password'}
          className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'} tabIndex={-1}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const passed = PW_RULES.filter(r => r.test(password)).length;
  return (
    <div className={styles.pwMeter} aria-live="polite">
      <div className={styles.pwBars}>
        {PW_RULES.map((r, i) => (
          <span key={r.key} className={`${styles.pwBar} ${i < passed ? styles[`pwLvl${Math.min(passed, 5)}`] : ''}`} />
        ))}
      </div>
      <p className={styles.pwLabel}>{password ? STRENGTH[passed] : 'Use a strong password'}</p>
      <ul className={styles.pwRules}>
        {PW_RULES.map(r => {
          const ok = r.test(password);
          return (
            <li key={r.key} className={ok ? styles.pwOk : ''}>
              <span className={styles.pwTick}>{ok && <Check size={10} strokeWidth={3} />}</span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AuthPage({ mode, setMode, onSuccess, onBack }) {
  const [step, setStep] = useState('form'); // form | verify | setpw
  const [useCode, setUseCode] = useState(false); // login via emailed code instead of password
  const [email, setEmail] = useState(readSaved);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(getRememberMe);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingProfile, setPendingProfile] = useState(null);

  const isSignup = mode === 'signup';
  const passwordLogin = !isSignup && !useCode;

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(v => { if (v <= 1) { clearInterval(t); return 0; } return v - 1; });
    }, 1000);
  };

  const applyRemember = (cleanEmail) => {
    setRememberMe(remember);
    writeSaved(remember ? cleanEmail : '');
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setUseCode(false); setError(''); setPassword(''); setConfirm('');
  };

  /* Load (or, for brand-new accounts, create) the profile for a signed-in user */
  const loadOrCreateProfile = async (user) => {
    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    let created = false;
    if (!prof) {
      const fn = capitalizeName((firstName || user.user_metadata?.first_name || '').trim());
      const ln = capitalizeName((lastName || user.user_metadata?.last_name || '').trim());
      const { data: newProf, error: profError } = await supabase
        .from('profiles')
        .insert({ id: user.id, first_name: fn, last_name: ln, email: user.email })
        .select()
        .single();
      if (profError) throw new Error('Could not save your profile: ' + profError.message);
      prof = newProf;
      created = true;
    }
    return { prof, created };
  };

  /* ── Step 1: form submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) { setError('Please enter your email address.'); return; }

    if (isSignup) {
      if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return; }
      if (!isStrong(password)) { setError('Please choose a stronger password — it must meet every requirement below.'); return; }
      if (password !== confirm) { setError('Passwords do not match.'); return; }
    }

    applyRemember(cleanEmail);
    setLoading(true);

    /* Password sign-in */
    if (passwordLogin) {
      if (!password) { setLoading(false); setError('Please enter your password.'); return; }
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signErr) {
        setLoading(false);
        setError(/invalid login/i.test(signErr.message)
          ? 'Incorrect email or password. If you forgot it, sign in with an email code instead.'
          : signErr.message);
        return;
      }
      try {
        const { prof } = await loadOrCreateProfile(data.user);
        setLoading(false);
        onSuccess(prof);
      } catch (err) { setLoading(false); setError(err.message); }
      return;
    }

    /* Email-code flow (sign-up verification, or "forgot password" login) */
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: isSignup },
    });
    setLoading(false);
    if (otpError) {
      const msg = otpError.message && otpError.message !== '{}' ? otpError.message : null;
      setError(msg || 'Failed to send verification code. Make sure your email is correct and try again.');
      return;
    }
    setStep('verify');
    startCooldown();
  };

  /* ── Step 2: verify emailed code ── */
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (code.length < 6) { setError('Please enter the verification code from your email.'); return; }
    setLoading(true);
    setRememberMe(remember);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    if (verifyError) { setError(verifyError.message); setLoading(false); return; }

    const user = data.user ?? data.session?.user;
    if (!user) { setError('Verification failed. Please try again.'); setLoading(false); return; }

    try {
      /* New sign-up: store the password they chose */
      if (isSignup && password) {
        const { error: pwErr } = await supabase.auth.updateUser({ password });
        if (pwErr) throw new Error('Could not save your password: ' + pwErr.message);
      }
      const { prof, created } = await loadOrCreateProfile(user);
      setLoading(false);

      /* Signed in by code from the login screen → let them set a (new) password */
      if (!isSignup && useCode) { setPendingProfile(prof); setPassword(''); setConfirm(''); setStep('setpw'); return; }
      void created;
      onSuccess(prof);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  /* ── Step 3 (code login only): set a new password ── */
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!isStrong(password)) { setError('Please choose a stronger password — it must meet every requirement below.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error: pwErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (pwErr) { setError(pwErr.message); return; }
    onSuccess(pendingProfile);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: isSignup } });
    startCooldown();
  };

  const submitLabel = () => {
    if (loading) return passwordLogin ? 'Signing in…' : 'Sending code…';
    if (passwordLogin) return 'Sign In';
    return isSignup ? 'Send Verification Code' : 'Send Sign-in Code';
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <img src="/images/teamsync/teamsync-logo.png" alt="TeamSync Workspace" className={styles.logoImg} />
        </div>

        {step === 'form' && (
          <>
            <h2 className={styles.title}>{isSignup ? 'Create your account' : useCode ? 'Sign in with a code' : 'Welcome back'}</h2>
            <p className={styles.subtitle}>
              {isSignup
                ? 'Sign up with your email and a strong password — we\'ll send a verification code to confirm your email.'
                : useCode
                  ? 'Forgot your password? We\'ll email you a one-time code to sign in, then you can set a new password.'
                  : 'Sign in with your email and password.'}
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              {isSignup && (
                <div className={styles.nameRow}>
                  <div className={styles.formGroup}>
                    <label>First Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Clark"
                      value={firstName}
                      onChange={e => setFirstName(capitalizeName(e.target.value))}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Last Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Gemongala"
                      value={lastName}
                      onChange={e => setLastName(capitalizeName(e.target.value))}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Email Address</label>
                <div className={styles.inputWrap}>
                  <Mail size={16} className={styles.inputIcon} />
                  <input
                    type="email"
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {isSignup && (
                <>
                  <PasswordField
                    label="Password" value={password} onChange={setPassword}
                    show={showPw} onToggle={() => setShowPw(v => !v)}
                    placeholder="Create a strong password" autoComplete="new-password"
                  />
                  <PasswordStrength password={password} />
                  <PasswordField
                    label="Confirm Password" value={confirm} onChange={setConfirm}
                    show={showPw} onToggle={() => setShowPw(v => !v)}
                    placeholder="Re-enter your password" autoComplete="new-password"
                  />
                  {confirm && password !== confirm && <p className={styles.fieldHint}>Passwords do not match yet.</p>}
                </>
              )}

              {passwordLogin && (
                <PasswordField
                  label="Password" value={password} onChange={setPassword}
                  show={showPw} onToggle={() => setShowPw(v => !v)}
                  placeholder="Enter your password" autoComplete="current-password"
                />
              )}

              {!isSignup && (
                <div className={styles.optionsRow}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    <span>Remember me</span>
                  </label>
                  {passwordLogin ? (
                    <button type="button" className={styles.linkBtn} onClick={() => { setUseCode(true); setError(''); setPassword(''); }}>
                      Forgot password?
                    </button>
                  ) : (
                    <button type="button" className={styles.linkBtn} onClick={() => { setUseCode(false); setError(''); }}>
                      Use password instead
                    </button>
                  )}
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <Loader size={16} className={styles.spin} /> : null}
                {submitLabel()}
              </button>
            </form>

            <p className={styles.switchMode}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button className={styles.switchBtn} onClick={switchMode}>
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>

            <button className={styles.backBtn} onClick={onBack}>
              <ArrowLeft size={14} /> Back to Home
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className={styles.checkIcon}><Mail size={28} /></div>
            <h2 className={styles.title}>Check your inbox</h2>
            <p className={styles.subtitle}>
              We sent a 6-digit code to <strong>{email}</strong>.<br />
              Enter it below to verify your identity.
            </p>

            <form className={styles.form} onSubmit={handleVerify}>
              <div className={styles.formGroup}>
                <label>Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  className={`${styles.input} ${styles.codeInput}`}
                  placeholder="• • • • • •"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  autoFocus
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <Loader size={16} className={styles.spin} /> : <CheckCircle size={16} />}
                {loading ? 'Verifying…' : isSignup ? 'Verify & Create Account' : 'Verify & Continue'}
              </button>
            </form>

            <p className={styles.resendRow}>
              Didn't receive it?{' '}
              <button
                className={`${styles.switchBtn} ${resendCooldown > 0 ? styles.disabled : ''}`}
                onClick={handleResend}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </p>

            <button className={styles.backBtn} onClick={() => { setStep('form'); setCode(''); setError(''); }}>
              <ArrowLeft size={14} /> {isSignup ? 'Back' : 'Change email'}
            </button>
          </>
        )}

        {step === 'setpw' && (
          <>
            <div className={styles.checkIcon}><KeyRound size={28} /></div>
            <h2 className={styles.title}>Set a new password</h2>
            <p className={styles.subtitle}>
              You're signed in. Choose a strong password so you can sign in with it next time — no code needed.
            </p>

            <form className={styles.form} onSubmit={handleSetPassword}>
              <PasswordField
                label="New Password" value={password} onChange={setPassword}
                show={showPw} onToggle={() => setShowPw(v => !v)}
                placeholder="Create a strong password" autoComplete="new-password" autoFocus
              />
              <PasswordStrength password={password} />
              <PasswordField
                label="Confirm Password" value={confirm} onChange={setConfirm}
                show={showPw} onToggle={() => setShowPw(v => !v)}
                placeholder="Re-enter your password" autoComplete="new-password"
              />
              {confirm && password !== confirm && <p className={styles.fieldHint}>Passwords do not match yet.</p>}

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <Loader size={16} className={styles.spin} /> : <CheckCircle size={16} />}
                {loading ? 'Saving…' : 'Save Password & Continue'}
              </button>
            </form>

            <button className={styles.backBtn} onClick={() => onSuccess(pendingProfile)}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
