import { useState } from 'react';
import { ArrowLeft, Calendar, LogOut, Settings, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function SchedulerNav({
  user,
  onSignOut,
  onOpenSettings,
  onBackToPortfolio
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Brand / Logo */}
        <div className={styles.navBrand}>
          <button
            onClick={onBackToPortfolio}
            className={styles.backBtn}
            title="Return to Clark's Portfolio"
          >
            <ArrowLeft size={18} />
            <span>Portfolio</span>
          </button>
          <div className={styles.brandDivider} />
          <div className={styles.logoGroup} onClick={onBackToPortfolio} style={{ cursor: 'pointer' }}>
            <img
              src="/images/logo.png"
              alt="Clark VA 360 Logo"
              className={styles.navLogoImg}
            />
            <div className={styles.brandText}>
              <span className={styles.brandName}>Clark VA 360</span>
              <span className={styles.brandTag}>
                <Sparkles size={11} className={styles.sparkleIcon} />
                Auto Scheduler
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className={styles.navActions}>
          <button
            className={styles.settingsIconBtn}
            onClick={onOpenSettings}
            title="Configure Google OAuth & AI Settings"
          >
            <Settings size={18} />
          </button>

          {user ? (
            <div className={styles.userProfileWrapper}>
              <button
                className={styles.userBadgeBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className={styles.userAvatar} />
                ) : (
                  <div className={styles.userAvatarFallback}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                )}
                <div className={styles.userInfoCol}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
              </button>

              {dropdownOpen && (
                <div className={styles.userDropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.signedInAs}>Signed in with Gmail</div>
                    <div className={styles.dropdownEmail}>{user.email}</div>
                    <div className={styles.googleConnectedBadge}>
                      <ShieldCheck size={14} /> Google Calendar Access Granted
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenSettings();
                    }}
                  >
                    <Settings size={16} /> OAuth & API Settings
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${styles.signOutItem}`}
                    onClick={() => {
                      setDropdownOpen(false);
                      onSignOut();
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.guestBadge}>
              <Calendar size={15} />
              <span>Google Calendar AI Sync</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
