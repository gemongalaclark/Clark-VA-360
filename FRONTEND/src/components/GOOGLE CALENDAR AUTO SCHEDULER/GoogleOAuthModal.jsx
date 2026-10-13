import { useState } from 'react';
import { X, Key, Shield, HelpCircle, Check, Sparkles } from 'lucide-react';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function GoogleOAuthModal({
  isOpen,
  onClose,
  clientId,
  onSaveClientId,
  geminiKey,
  onSaveGeminiKey
}) {
  const [tempClientId, setTempClientId] = useState(clientId || '');
  const [tempGeminiKey, setTempGeminiKey] = useState(geminiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveClientId(tempClientId.trim());
    onSaveGeminiKey(tempGeminiKey.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalCard} ${styles.settingsModalCard}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <div className={styles.modalHeaderIcon}>
              <Shield size={20} />
            </div>
            <div>
              <h3>API & OAuth Settings</h3>
              <p>Configure Google Cloud OAuth and Gemini AI parameters</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Gemini API Key */}
          <div className={styles.settingsField}>
            <label className={styles.fieldLabel}>
              <Sparkles size={15} />
              <span>Gemini API Key:</span>
            </label>
            <input
              type="password"
              value={tempGeminiKey}
              onChange={(e) => setTempGeminiKey(e.target.value)}
              placeholder="Enter Gemini API Key"
              className={styles.settingsInput}
            />
            <p className={styles.fieldHelper}>
              Active Key preloaded with Google Plus Student plan. Supports multimodal image, PDF, and spreadsheet OCR.
            </p>
          </div>

          {/* Google OAuth Client ID */}
          <div className={styles.settingsField}>
            <label className={styles.fieldLabel}>
              <Key size={15} />
              <span>Google Cloud OAuth 2.0 Web Client ID:</span>
            </label>
            <input
              type="text"
              value={tempClientId}
              onChange={(e) => setTempClientId(e.target.value)}
              placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
              className={styles.settingsInput}
            />
            <p className={styles.fieldHelper}>
              Leave blank to use the built-in Instant Demo Account, or add your Google Cloud Console Client ID to connect real personal accounts.
            </p>
          </div>

          {/* How to configure guide */}
          <div className={styles.oauthHelpBox}>
            <div className={styles.helpHeader}>
              <HelpCircle size={16} />
              <strong>Quick Guide: Real Google Calendar OAuth</strong>
            </div>
            <ol className={styles.helpList}>
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a>.</li>
              <li>Create OAuth 2.0 Client ID (Web Application).</li>
              <li>Add <code>{window.location.origin}</code> under Authorized JavaScript Origins.</li>
              <li>Enable &ldquo;Google Calendar API&rdquo; in Library.</li>
            </ol>
          </div>

          {savedSuccess && (
            <div className={styles.savedAlert}>
              <Check size={16} />
              <span>Settings saved successfully!</span>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Close
          </button>
          <button type="button" className={styles.analyzeBtn} onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
