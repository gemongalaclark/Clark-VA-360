import { useState } from 'react';
import { ArrowLeft, Mail, Eye, EyeOff, Loader, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import styles from './AuthPage.module.css';

export default function AuthPage({ mode, setMode, onSuccess, onBack }) {
  const [step, setStep] = useState('form'); // form | verify
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const isSignup = mode === 'signup';

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(v => { if (v <= 1) { clearInterval(t); return 0; } return v - 1; });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email address.'); return; }
    if (isSignup && (!firstName.trim() || !lastName.trim())) {
      setError('Please enter your first and last name.');
      return;
    }
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) { setError(otpError.message); return; }
    setStep('verify');
    startCooldown();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) { setError('Please enter the 6-digit code from your email.'); return; }
    setLoading(true);

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });

    if (verifyError) { setError(verifyError.message); setLoading(false); return; }

    const user = data.user ?? data.session?.user;
    if (!user) { setError('Verification failed. Please try again.'); setLoading(false); return; }

    /* Check existing profile */
    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (!prof) {
      const fn = firstName || user.user_metadata?.first_name || '';
      const ln = lastName || user.user_metadata?.last_name || '';
      const { data: newProf, error: profError } = await supabase
        .from('profiles')
        .insert({ id: user.id, first_name: fn, last_name: ln, email: user.email })
        .select()
        .single();
      if (profError) { setError('Could not save your profile: ' + profError.message); setLoading(false); return; }
      prof = newProf;
    }

    setLoading(false);
    onSuccess(prof);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    startCooldown();
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>TS</div>
          <span className={styles.logoName}>TeamSync <span>Workspace</span></span>
        </div>

        {step === 'form' ? (
          <>
            <h2 className={styles.title}>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
            <p className={styles.subtitle}>
              {isSignup
                ? 'Sign up with your email — we\'ll send a verification code.'
                : 'Enter your email and we\'ll send you a sign-in code.'}
            </p>

            <form className={styles.form} onSubmit={handleSendOtp}>
              {isSignup && (
                <div className={styles.nameRow}>
                  <div className={styles.formGroup}>
                    <label>First Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Clark"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
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
                      onChange={e => setLastName(e.target.value)}
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
                    required
                  />
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <Loader size={16} className={styles.spin} /> : null}
                {loading ? 'Sending code…' : 'Send Verification Code'}
              </button>
            </form>

            <p className={styles.switchMode}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button
                className={styles.switchBtn}
                onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(''); }}
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>

            <button className={styles.backBtn} onClick={onBack}>
              <ArrowLeft size={14} /> Back to Home
            </button>
          </>
        ) : (
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
                  maxLength={6}
                  className={`${styles.input} ${styles.codeInput}`}
                  placeholder="• • • • • •"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? <Loader size={16} className={styles.spin} /> : <CheckCircle size={16} />}
                {loading ? 'Verifying…' : 'Verify & Continue'}
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
              <ArrowLeft size={14} /> Change email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
