import { useState, useEffect } from 'react';
import SchedulerNav from './SchedulerNav';
import SchedulerHero from './SchedulerHero';
import SchedulerDashboard from './SchedulerDashboard';
import UploadModal from './UploadModal';
import SchedulePreviewModal from './SchedulePreviewModal';
import GoogleOAuthModal from './GoogleOAuthModal';
import { scanScheduleWithGemini, SAMPLE_SCHEDULES } from './geminiScanner';
import { sendEventsToGoogleCalendar } from './googleCalendarApi';
import { supabase } from '../../lib/supabase';
import {
  mapSessionToSchedulerUser,
  registerSchedulerUser,
  signInWithGoogle,
  signOutScheduler
} from './schedulerAuth';
import styles from './GoogleCalendarAutoScheduler.module.css';

export default function GoogleCalendarAutoScheduler({ onBackToPortfolio }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

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

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [currentBatch, setCurrentBatch] = useState(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncResult, setSyncResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};

    const applySession = async (session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      const mapped = mapSessionToSchedulerUser(session);
      setUser(mapped);
      await registerSchedulerUser(session);
    };

    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await applySession(session);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      await applySession(session);
    });

    unsubscribe = () => data.subscription.unsubscribe();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('clark_scheduler_history', JSON.stringify(history));
  }, [history]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMessage(err.message || 'Google sign-in failed. Enable the Google provider in Supabase.');
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setUser(null);
    setCurrentBatch(null);
    setSyncResult(null);
    localStorage.removeItem('clark_scheduler_user');
    try {
      await signOutScheduler();
    } catch {
      // local sign-out is enough if the network request fails
    }
  };

  const handleAnalyzeFile = async (file, referenceDate, reminderMinutes) => {
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
        events: result.events,
        reminderMinutes: reminderMinutes ?? null
      };

      setCurrentBatch(batch);
      setIsUploadOpen(false);
      setIsPreviewOpen(true);
      setSyncResult(null);
    } catch (err) {
      console.error('Scan error:', err);
      setErrorMessage(err.message || 'Failed to scan schedule with Gemini AI.');
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
  };

  const handleAnalyzeSample = async (sampleKey, referenceDate, reminderMinutes) => {
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
        events: result.events,
        reminderMinutes: reminderMinutes ?? null
      };

      setCurrentBatch(batch);
      setIsUploadOpen(false);
      setIsPreviewOpen(true);
      setSyncResult(null);
    } catch (err) {
      console.error('Sample scan error:', err);
      setErrorMessage(err.message || 'Failed to scan sample schedule.');
    } finally {
      setIsScanning(false);
      setScanStatus('');
    }
  };

  const handleSendToGoogleCalendar = async (eventsToSync, reminderMinutes) => {
    try {
      setIsSyncing(true);
      setSyncProgress('Uploading events to your Google Calendar...');

      if (!user?.accessToken) {
        throw new Error('Google Calendar access is missing. Sign out and sign in with Gmail again, then grant Calendar permission.');
      }

      const result = await sendEventsToGoogleCalendar({
        accessToken: user.accessToken,
        events: eventsToSync,
        reminderMinutes: reminderMinutes ?? currentBatch?.reminderMinutes ?? null,
        isDemo: false,
        onProgress: (current, total, title) => {
          setSyncProgress(`Adding event ${current} of ${total}: "${title}"`);
        }
      });

      if (!result.success) {
        const firstError = result.errors?.[0]?.error;
        throw new Error(firstError || 'Google Calendar rejected the events. Sign in again and retry.');
      }

      setSyncResult(result);

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
      <SchedulerNav
        user={user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onBackToPortfolio={onBackToPortfolio}
      />

      <main className={styles.mainContent}>
        {errorMessage && (
          <div className={styles.topErrorBanner}>
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}

        {!authReady ? (
          <div className={styles.heroWrapper}>
            <p className={styles.heroSubtitle}>Checking your Gmail session...</p>
          </div>
        ) : !user ? (
          <SchedulerHero
            onGoogleSignIn={handleGoogleSignIn}
            isSigningIn={isSigningIn}
          />
        ) : (
          <SchedulerDashboard
            user={user}
            history={history}
            onOpenUploadModal={() => setIsUploadOpen(true)}
            onOpenSample={(sampleKey) => handleAnalyzeSample(sampleKey, new Date().toISOString().split('T')[0], 30)}
            onViewPreviousBatch={handleViewPreviousBatch}
          />
        )}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAnalyzeFile={handleAnalyzeFile}
        onAnalyzeSample={handleAnalyzeSample}
        isScanning={isScanning}
        scanStatus={scanStatus}
      />

      {currentBatch && (
        <SchedulePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          events={currentBatch.events}
          sourceName={currentBatch.sourceName}
          modelUsed={currentBatch.modelUsed}
          reminderMinutes={currentBatch.reminderMinutes}
          onSendToGoogleCalendar={handleSendToGoogleCalendar}
          isSyncing={isSyncing}
          syncProgress={syncProgress}
          syncResult={syncResult}
          onReset={handleResetPreview}
        />
      )}

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
