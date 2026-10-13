import { useState } from 'react';
import { X, Mail, Key, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function GoogleSignInModal({
  isOpen,
  onClose,
  onConfirmPersonalLogin,
  googleClientId,
  onSaveClientId,
  onRequestGoogleOAuth
}) {
  const [tab, setTab] = useState('gmail'); // 'gmail' | 'oauth'
  const [customName, setCustomName] = useState('Clark Gemongala');
  const [customEmail, setCustomEmail] = useState('gemongalaclark.official@gmail.com');
  const [tempClientId, setTempClientId] = useState(googleClientId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handlePersonalSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      setErrorMsg('Please enter a valid Gmail address.');
      return;
    }
    onConfirmPersonalLogin(customName.trim() || 'Google User', customEmail.trim());
    onClose();
  };

  const handleOAuthSubmit = (e) => {
    e.preventDefault();
    if (!tempClientId.trim()) {
      setErrorMsg('Please provide your Google OAuth 2.0 Web Client ID.');
      return;
    }
    onSaveClientId(tempClientId.trim());
    onRequestGoogleOAuth(tempClientId.trim());
    onClose();
  };

  const handleSupabaseGoogle = async () => {
    if (!supabase) {
      setErrorMsg('Supabase is not configured.');
      return;
    }
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.events',
          redirectTo: window.location.href
        }
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message || 'Supabase Google Sign-In failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalCard} ${styles.settingsModalCard}`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <div className={styles.modalHeaderIcon}>
              <Mail size={20} />
            </div>
            <div>
              <h3>Sign in with your Gmail</h3>
              <p>Connect your account to Clark VA 360 Google Auto Scheduler</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={styles.dayFilterScroll} style={{ padding: '12px 24px', background: '#fdf5f5' }}>
          <button
            type="button"
            className={`${styles.dayTab} ${tab === 'gmail' ? styles.dayTabActive : ''}`}
            onClick={() => { setTab('gmail'); setErrorMsg(null); }}
          >
            <Mail size={14} />
            <span>Use Your Gmail Address</span>
          </button>
          <button
            type="button"
            className={`${styles.dayTab} ${tab === 'oauth' ? styles.dayTabActive : ''}`}
            onClick={() => { setTab('oauth'); setErrorMsg(null); }}
          >
            <Key size={14} />
            <span>Google Cloud OAuth (Live API)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {errorMsg && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {tab === 'gmail' ? (
            <form onSubmit={handlePersonalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.settingsField}>
                <label className={styles.fieldLabel}>Your Full Name:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Clark Gemongala"
                  className={styles.settingsInput}
                  required
                />
              </div>

              <div className={styles.settingsField}>
                <label className={styles.fieldLabel}>Your Gmail Account:</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className={styles.settingsInput}
                  required
                />
                <p className={styles.fieldHelper}>
                  Your exact Gmail address and name will be used to label and sync all your calendar schedules and export .ICS calendar files.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className={styles.analyzeBtn}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <ShieldCheck size={18} />
                  <span>Continue with {customEmail || 'Your Gmail'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSupabaseGoogle}
                  disabled={isSubmitting}
                  className={styles.samplePresetBtn}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Sparkles size={16} />
                  <span>Try Supabase Live Google Sign-In</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.settingsField}>
                <label className={styles.fieldLabel}>Google Cloud OAuth 2.0 Web Client ID:</label>
                <input
                  type="text"
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                  placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                  className={styles.settingsInput}
                  required
                />
                <p className={styles.fieldHelper}>
                  Google requires web applications to register a Client ID to open the official Google account picker popup.
                </p>
              </div>

              <div className={styles.oauthHelpBox}>
                <strong>How to get a Client ID (Free):</strong>
                <ol className={styles.helpList} style={{ marginTop: '6px' }}>
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Credentials</a>.</li>
                  <li>Click <em>Create Credentials &gt; OAuth client ID</em> (Web application).</li>
                  <li>Add <code>{window.location.origin}</code> under Authorized JavaScript origins.</li>
                  <li>Copy and paste the Client ID above!</li>
                </ol>
              </div>

              <button
                type="submit"
                className={styles.analyzeBtn}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Key size={18} />
                <span>Launch Google OAuth Window</span>
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
