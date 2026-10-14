import { Calendar, Sparkles, ShieldCheck, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function SchedulerHero({
  onGoogleSignIn,
  isSigningIn
}) {
  return (
    <div className={styles.heroWrapper}>
      <div className={styles.heroBackgroundGlow} />

      <div className={styles.heroCard}>
        <div className={styles.heroLogoWrap}>
          <img
            src="/images/logo.png"
            alt="Clark VA 360 Logo"
            className={styles.heroLogoImg}
          />
          <div className={styles.aiBadgeFloating}>
            <Sparkles size={14} />
            <span>Powered by Gemini AI</span>
          </div>
        </div>

        <h1 className={styles.heroTitle}>
          Clark VA 360&apos;s <span>Google Auto Scheduler</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Sign in with Gmail, upload a photo, PDF, or Excel timetable, preview what Gemini extracted,
          then tap Go to add the events to your Google Calendar.
        </p>

        <div className={styles.permissionsBanner}>
          <ShieldCheck size={18} className={styles.shieldIcon} />
          <div>
            <strong>Google Calendar permission:</strong>
            <p>Your Gmail account is registered in Supabase, and Calendar access is used only to create the events you approve.</p>
          </div>
        </div>

        <div className={styles.authButtonsCol}>
          <button
            onClick={onGoogleSignIn}
            disabled={isSigningIn}
            className={styles.googleSignInBtn}
            id="google-signin-btn"
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isSigningIn ? 'Opening Google...' : 'Sign in with Gmail'}</span>
          </button>
        </div>

        <div className={styles.featuresRow}>
          <div className={styles.featurePill}>
            <ImageIcon size={15} />
            <span>Photo OCR</span>
          </div>
          <div className={styles.featurePill}>
            <FileText size={15} />
            <span>PDF Scanning</span>
          </div>
          <div className={styles.featurePill}>
            <FileSpreadsheet size={15} />
            <span>Excel / CSV</span>
          </div>
          <div className={styles.featurePill}>
            <Calendar size={15} />
            <span>Mon–Sun Timetables</span>
          </div>
        </div>
      </div>
    </div>
  );
}
