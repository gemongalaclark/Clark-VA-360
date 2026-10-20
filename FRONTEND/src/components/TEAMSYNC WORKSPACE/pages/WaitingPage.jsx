import { Clock, LogOut } from 'lucide-react';
import styles from './WaitingPage.module.css';

export default function WaitingPage({ profile, room, onSignOut }) {
  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase() : 'U';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src="/images/teamsync/teamsync-logo.png" alt="TeamSync Workspace" className={styles.logoImg} />
        </div>
        <button className={styles.signOutBtn} onClick={onSignOut}>
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.pulseWrap}>
            <div className={styles.pulseRing} />
            <div className={styles.clockIcon}><Clock size={32} /></div>
          </div>
          <h1 className={styles.title}>Waiting for Approval</h1>
          <p className={styles.desc}>
            Your request to join <strong>{room?.name ?? 'the room'}</strong> has been sent.<br />
            The room owner will review your request shortly.
          </p>

          <div className={styles.roomInfoCard}>
            <div className={styles.roomInfoRow}>
              <span className={styles.roomInfoLabel}>Room Name</span>
              <span className={styles.roomInfoValue}>{room?.name ?? '—'}</span>
            </div>
            <div className={styles.roomInfoRow}>
              <span className={styles.roomInfoLabel}>Room ID</span>
              <span className={styles.roomInfoCode}>{room?.room_code ?? '—'}</span>
            </div>
            <div className={styles.roomInfoRow}>
              <span className={styles.roomInfoLabel}>Your Name</span>
              <div className={styles.userRow}>
                <div className={styles.miniAvatar}>{initials}</div>
                <span className={styles.roomInfoValue}>
                  {profile ? `${profile.first_name} ${profile.last_name}` : '—'}
                </span>
              </div>
            </div>
          </div>

          <p className={styles.hint}>
            This page will automatically update when the owner accepts your request.<br />
            You'll also receive an email notification.
          </p>

          <div className={styles.statusDot}>
            <span className={styles.dot} />
            <span>Waiting for owner response…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
