import { Calendar, Upload, Sparkles, CheckCircle2, Clock, Zap, ArrowRight, FileSpreadsheet, PlusCircle } from 'lucide-react';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function SchedulerDashboard({
  user,
  history = [],
  onOpenUploadModal,
  onOpenSample,
  onViewPreviousBatch
}) {
  const hasHistory = history.length > 0;
  const totalEventsSynced = history.reduce((sum, item) => sum + (item.events?.length || 0), 0);

  return (
    <div className={styles.dashboardContainer}>
      {/* Welcome Banner */}
      <div className={styles.dashHeader}>
        <div>
          <h2 className={styles.dashGreeting}>
            Welcome, <span>{(user.name || 'VA Client').split(' ')[0]}</span>! 👋
          </h2>
          <p className={styles.dashSubtext}>
            {user.email} • {user.accessToken ? 'Connected to Google Calendar' : 'Signed in — reconnect Gmail to grant Calendar access'}
          </p>
        </div>
        <button
          onClick={onOpenUploadModal}
          className={styles.primaryUploadBtn}
          id="btn-upload-schedule"
        >
          <Upload size={18} />
          <span>Auto Schedule Timetable</span>
        </button>
      </div>

      {/* If first time (no history yet) */}
      {!hasHistory ? (
        <div className={styles.firstTimeCard}>
          <div className={styles.firstTimeBadge}>
            <Sparkles size={16} />
            <span>AI Automated Scheduling</span>
          </div>

          <h3 className={styles.firstTimeTitle}>
            First time here? <span>Auto schedule now!</span>
          </h3>

          <p className={styles.firstTimeDesc}>
            Transform your handwritten shift rotas, classroom timetables, work rosters, or Excel spreadsheets
            into clean Google Calendar events in seconds with Gemini AI.
          </p>

          <div className={styles.firstTimeCtaRow}>
            <button
              onClick={onOpenUploadModal}
              className={styles.firstTimeActionBtn}
              id="first-time-auto-schedule-btn"
            >
              <Upload size={20} />
              <span>Auto schedule now! (Upload File)</span>
            </button>

            <button
              onClick={() => onOpenSample('vaRoster')}
              className={styles.samplePresetBtn}
            >
              <Zap size={16} />
              <span>Try with Sample VA Roster</span>
            </button>
          </div>

          <div className={styles.guideStepsRow}>
            <div className={styles.guideStep}>
              <div className={styles.stepNum}>1</div>
              <h4>Upload</h4>
              <p>Upload a photo, PDF, or spreadsheet (.xlsx / .csv)</p>
            </div>
            <div className={styles.guideStepArrow}>→</div>
            <div className={styles.guideStep}>
              <div className={styles.stepNum}>2</div>
              <h4>Gemini AI Scans</h4>
              <p>AI extracts Monday–Sunday times, days, and tasks</p>
            </div>
            <div className={styles.guideStepArrow}>→</div>
            <div className={styles.guideStep}>
              <div className={styles.stepNum}>3</div>
              <h4>Review & Sync</h4>
              <p>Double-check the preview and send to Google Calendar</p>
            </div>
          </div>
        </div>
      ) : (
        /* If user already has schedules */
        <div className={styles.historyDashboard}>
          {/* Stats Bar */}
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statIconWrap}>
                <Calendar size={22} className={styles.statIcon} />
              </div>
              <div>
                <div className={styles.statValue}>{totalEventsSynced}</div>
                <div className={styles.statLabel}>Events Synced to Google</div>
              </div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statIconWrap}>
                <Sparkles size={22} className={styles.statIcon} />
              </div>
              <div>
                <div className={styles.statValue}>{history.length}</div>
                <div className={styles.statLabel}>Timetables Scanned</div>
              </div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statIconWrap}>
                <CheckCircle2 size={22} className={styles.statIcon} />
              </div>
              <div>
                <div className={styles.statValue}>Active</div>
                <div className={styles.statLabel}>Google Calendar Sync</div>
              </div>
            </div>
          </div>

          {/* New Schedule Quick Action */}
          <div className={styles.quickActionCard}>
            <div className={styles.quickActionInfo}>
              <h3>Ready to scan another schedule?</h3>
              <p>Upload an image, PDF or spreadsheet to add more events to your calendar.</p>
            </div>
            <button
              onClick={onOpenUploadModal}
              className={styles.quickActionBtn}
            >
              <PlusCircle size={18} />
              <span>Upload New Schedule</span>
            </button>
          </div>

          {/* Past Scanned Schedules */}
          <div className={styles.historySection}>
            <h3 className={styles.historySectionTitle}>Recent Schedule Scans</h3>
            <div className={styles.historyList}>
              {history.map((item, index) => (
                <div key={item.id || index} className={styles.historyCard}>
                  <div className={styles.historyCardHeader}>
                    <div className={styles.historyFileName}>
                      <FileSpreadsheet size={18} />
                      <span>{item.sourceName || `Schedule Batch #${index + 1}`}</span>
                    </div>
                    <span className={styles.historyBadge}>
                      {item.events?.length || 0} Events
                    </span>
                  </div>
                  <div className={styles.historyMeta}>
                    <span><Clock size={13} /> {new Date(item.timestamp).toLocaleDateString()}</span>
                    <span>AI Model: {item.modelUsed || 'Gemini 3.5'}</span>
                  </div>
                  <div className={styles.historyActions}>
                    <button
                      className={styles.historyViewBtn}
                      onClick={() => onViewPreviousBatch(item)}
                    >
                      <span>View & Edit Events</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
