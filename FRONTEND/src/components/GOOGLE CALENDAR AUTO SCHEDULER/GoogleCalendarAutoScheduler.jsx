import { useState, useEffect } from 'react';
import SchedulerNav from './SchedulerNav';
import SchedulerHero from './SchedulerHero';
import SchedulerDashboard from './SchedulerDashboard';
import UploadModal from './UploadModal';
import SchedulePreviewModal from './SchedulePreviewModal';
import GoogleOAuthModal from './GoogleOAuthModal';
import { scanScheduleWithGemini, SAMPLE_SCHEDULES } from './geminiScanner';
import {
  requestGoogleCalendarAccess,
  loginDemoUser,
  sendEventsToGoogleCalendar
} from './googleCalendarApi';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function GoogleCalendarAutoScheduler({ onBackToPortfolio }) {
  // Stored state
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('clark_scheduler_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('clark_scheduler_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('clark_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('clark_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });

  // UI state
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Scanning & Syncing state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [currentBatch, setCurrentBatch] = useState(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncResult, setSyncResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Save changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('clark_scheduler_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('clark_scheduler_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('clark_scheduler_history', JSON.stringify(history));
  }, [history]);

  // Auth Handlers
  const handleGoogleSignIn = () => {
    setIsSigningIn(true);
    setErrorMessage(null);

    // If no client ID configured yet, prompt or provide seamless demo fallback
    if (!googleClientId) {
      // Auto-fallback to Demo account with clear notice
      const demoAuth = loginDemoUser('visitor.clark360@gmail.com');
      setUser(demoAuth.user);
      setIsSigningIn(false);
      return;
    }

    requestGoogleCalendarAccess({
      clientId: googleClientId,
      onTokenReceived: (authData) => {
        setUser({
          ...authData.user,
          accessToken: authData.accessToken,
          isDemo: authData.isDemo
        });
        setIsSigningIn(false);
      },
      onError: (err) => {
        console.warn('Google OAuth error, falling back to instant demo:', err.message);
        // Fallback to demo mode so user isn't blocked
        const demoAuth = loginDemoUser('visitor.clark360@gmail.com');
        setUser(demoAuth.user);
        setIsSigningIn(false);
      }
    });
  };

  const handleDemoSignIn = () => {
    const demo = loginDemoUser('client.executive@gmail.com');
    setUser({
      ...demo.user,
      accessToken: demo.accessToken,
      isDemo: true
    });
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentBatch(null);
    setSyncResult(null);
  };

  // Scanning Handlers
  const handleAnalyzeFile = async (file, referenceDate) => {
    try {
      setIsScanning(true);
      setErrorMessage(null);

      const result = await scanScheduleWithGemini({
        file,
        referenceDate,
        apiKey: geminiApiKey,
        onStatusUpdate: (msg) => setScanStatus(msg)
      });

      const batch = {
        id: `batch-${Date.now()}`,
        sourceName: file.name,
        timestamp: new Date().toISOString(),
        modelUsed: result.modelUsed,
        events: result.events
      };

      setCurrentBatch(batch);
      setIsUploadOpen(false);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMessage(err.message || 'Failed to scan schedule with Gemini AI.');
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
  };

  const handleAnalyzeSample = async (sampleKey, referenceDate) => {
    try {
      setIsScanning(true);
      setErrorMessage(null);

      const sample = SAMPLE_SCHEDULES[sampleKey];
      const result = await scanScheduleWithGemini({
        textData: sample.text,
        referenceDate,
        apiKey: geminiApiKey,
        onStatusUpdate: (msg) => setScanStatus(msg)
      });

      const batch = {
        id: `batch-${Date.now()}`,
        sourceName: sample.name,
        timestamp: new Date().toISOString(),
        modelUsed: result.modelUsed,
        events: result.events
      };

      setCurrentBatch(batch);
      setIsUploadOpen(false);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error('Sample scan error:', err);
      setErrorMessage(err.message || 'Failed to scan sample schedule.');
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
  };

  // Google Calendar Sync Handler
  const handleSendToGoogleCalendar = async (eventsToSync) => {
    try {
      setIsSyncing(true);
      setSyncProgress('Initiating Google Calendar synchronization...');

      const result = await sendEventsToGoogleCalendar({
        accessToken: user?.accessToken,
        events: eventsToSync,
        isDemo: user?.isDemo !== false,
        onProgress: (current, total, title) => {
          setSyncProgress(`Adding event ${current} of ${total}: "${title}"`);
        }
      });

      setSyncResult(result);

      // Save to history
      if (currentBatch) {
        const updatedBatch = {
          ...currentBatch,
          events: eventsToSync,
          syncedAt: new Date().toISOString(),
          syncedCount: result.syncedCount
        };
        setHistory(prev => [updatedBatch, ...prev]);
      }
    } catch (err) {
      console.error('Calendar sync error:', err);
      setErrorMessage(err.message || 'Failed to sync events to Google Calendar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewPreviousBatch = (batch) => {
    setCurrentBatch(batch);
    setSyncResult(null);
    setIsPreviewOpen(true);
  };

  const handleResetPreview = () => {
    setIsPreviewOpen(false);
    setCurrentBatch(null);
    setSyncResult(null);
  };

  const handleSaveClientId = (newId) => {
    setGoogleClientId(newId);
    localStorage.setItem('clark_google_client_id', newId);
  };

  const handleSaveGeminiKey = (newKey) => {
    setGeminiApiKey(newKey);
    localStorage.setItem('clark_gemini_api_key', newKey);
  };

  return (
    <div className={styles.appWrapper}>
      {/* Navbar */}
      <SchedulerNav
        user={user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onBackToPortfolio={onBackToPortfolio}
      />

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {errorMessage && (
          <div className={styles.topErrorBanner}>
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}

        {!user ? (
          <SchedulerHero
            onGoogleSignIn={handleGoogleSignIn}
            onDemoSignIn={handleDemoSignIn}
            isSigningIn={isSigningIn}
          />
        ) : (
          <SchedulerDashboard
            user={user}
            history={history}
            onOpenUploadModal={() => setIsUploadOpen(true)}
            onOpenSample={(sampleKey) => handleAnalyzeSample(sampleKey, new Date().toISOString().split('T')[0])}
            onViewPreviousBatch={handleViewPreviousBatch}
          />
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAnalyzeFile={handleAnalyzeFile}
        onAnalyzeSample={handleAnalyzeSample}
        isScanning={isScanning}
        scanStatus={scanStatus}
      />

      {/* Schedule Preview & Edit Modal */}
      {currentBatch && (
        <SchedulePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          events={currentBatch.events}
          sourceName={currentBatch.sourceName}
          modelUsed={currentBatch.modelUsed}
          onSendToGoogleCalendar={handleSendToGoogleCalendar}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          syncResult={syncResult}
          onReset={handleResetPreview}
        />
      )}

      {/* Settings Modal */}
      <GoogleOAuthModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        clientId={googleClientId}
        onSaveClientId={handleSaveClientId}
        geminiKey={geminiApiKey}
        onSaveGeminiKey={handleSaveGeminiKey}
      />
    </div>
  );
}
