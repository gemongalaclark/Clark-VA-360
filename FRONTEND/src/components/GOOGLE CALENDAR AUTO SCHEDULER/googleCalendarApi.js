/**
 * Google Identity Services & Google Calendar API helper for Clark VA 360 Auto Scheduler
 */

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Request Google Calendar OAuth Access Token via Google Identity Services (GIS)
 */
export function requestGoogleCalendarAccess({ clientId, onTokenReceived, onError }) {
  if (!window.google?.accounts?.oauth2) {
    onError(new Error('Google Identity Services SDK is not loaded. Check internet connection.'));
    return;
  }

  if (!clientId) {
    onError(new Error('Google Client ID is missing. You can enter your Google Client ID or use Demo Mode.'));
    return;
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: `${CALENDAR_SCOPE} email profile openid`,
      prompt: 'consent',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          onError(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }

        const accessToken = tokenResponse.access_token;
        try {
          // Fetch user profile info
          const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const profile = await profileRes.json();

          onTokenReceived({
            accessToken,
            user: {
              name: profile.name || 'Google User',
              email: profile.email || 'user@gmail.com',
              picture: profile.picture || null,
              id: profile.sub
            },
            isDemo: false
          });
        } catch (err) {
          // Fallback user object
          onTokenReceived({
            accessToken,
            user: {
              name: 'Connected Google Account',
              email: 'connected.user@gmail.com',
              picture: null
            },
            isDemo: false
          });
        }
      }
    });

    tokenClient.requestAccessToken();
  } catch (err) {
    onError(err);
  }
}

/**
 * Personal / Demo sign in helper for testing without requiring Google Cloud Console OAuth setup
 */
export function loginDemoUser(name = 'Clark Gemongala', email = 'gemongalaclark.official@gmail.com') {
  return {
    accessToken: 'demo_token_' + Math.random().toString(36).substring(2),
    user: {
      name: name || 'Clark Gemongala',
      email: email || 'gemongalaclark.official@gmail.com',
      picture: null,
      id: 'user-' + Date.now()
    },
    isDemo: true
  };
}

/**
 * Send events directly to Google Calendar API
 */
export async function sendEventsToGoogleCalendar({
  accessToken,
  events,
  isDemo = false,
  onProgress = () => {}
}) {
  if (isDemo) {
    // Simulate real Google Calendar sync with realistic delay and real ICS generation
    const synced = [];
    for (let i = 0; i < events.length; i++) {
      onProgress(i + 1, events.length, events[i].title);
      await new Promise(r => setTimeout(r, 450));
      synced.push({
        id: `demo-cal-${i}`,
        title: events[i].title,
        htmlLink: 'https://calendar.google.com/calendar/r'
      });
    }
    return {
      success: true,
      syncedCount: synced.length,
      failedCount: 0,
      events: synced,
      isDemo: true
    };
  }

  const synced = [];
  const errors = [];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    onProgress(i + 1, events.length, evt.title);

    try {
      const startDateTime = `${evt.date}T${evt.startTime}:00`;
      const endDateTime = `${evt.date}T${evt.endTime}:00`;

      const payload = {
        summary: evt.title,
        description: `${evt.description || 'Auto-scheduled by Clark VA 360'}\n\nCategory: ${evt.category || 'General'}\nGenerated with Clark VA 360 Google Auto Scheduler`,
        location: evt.location || '',
        start: {
          dateTime: new Date(startDateTime).toISOString(),
          timeZone
        },
        end: {
          dateTime: new Date(endDateTime).toISOString(),
          timeZone
        },
        reminders: {
          useDefault: true
        }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.error) {
        errors.push({ title: evt.title, error: data.error.message });
      } else {
        synced.push(data);
      }
    } catch (err) {
      errors.push({ title: evt.title, error: err.message });
    }
  }

  return {
    success: synced.length > 0,
    syncedCount: synced.length,
    failedCount: errors.length,
    events: synced,
    errors,
    isDemo: false
  };
}

/**
 * Generate standard .ics (iCalendar) file for download and offline import
 */
export function generateIcsFile(events, calendarName = 'Clark VA 360 Auto Schedule') {
  const formatUtc = (dateStr, timeStr) => {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clark VA 360//Google Auto Scheduler//EN',
    `X-WR-CALNAME:${calendarName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach((evt, idx) => {
    const dtStart = formatUtc(evt.date, evt.startTime);
    const dtEnd = formatUtc(evt.date, evt.endTime);
    const now = formatUtc(new Date().toISOString().split('T')[0], '12:00');

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:clark-va-360-${Date.now()}-${idx}@clarkva360.com`);
    ics.push(`DTSTAMP:${now}`);
    ics.push(`DTSTART:${dtStart}`);
    ics.push(`DTEND:${dtEnd}`);
    ics.push(`SUMMARY:${evt.title.replace(/\n/g, ' ')}`);
    ics.push(`DESCRIPTION:${(evt.description || 'Clark VA 360 Auto Scheduled Event').replace(/\n/g, '\\n')}`);
    if (evt.location) ics.push(`LOCATION:${evt.location}`);
    ics.push('STATUS:CONFIRMED');
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

/**
 * Trigger download of .ics file
 */
export function downloadIcsFile(events, filename = 'clark_va_schedule.ics') {
  const icsData = generateIcsFile(events);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
