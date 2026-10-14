/**
 * Google Calendar API helper for Clark VA 360 Auto Scheduler
 */

const SCHEDULER_API_BASE = (import.meta.env.VITE_SCHEDULER_API_URL || '').replace(/\/$/, '');

export function normalizeTime(value, fallback = '09:00') {
  if (!value) return fallback;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const hours = String(Math.min(23, Number(match[1]))).padStart(2, '0');
  return `${hours}:${match[2]}`;
}

function toLocalDateTime(date, time) {
  const safeTime = normalizeTime(time);
  return `${date}T${safeTime}:00`;
}

function buildGoogleEventPayload(evt, timeZone) {
  return {
    summary: evt.title,
    description: `${evt.description || 'Auto-scheduled by Clark VA 360'}\n\nCategory: ${evt.category || 'General'}\nGenerated with Clark VA 360 Google Auto Scheduler`,
    location: evt.location || '',
    start: {
      dateTime: toLocalDateTime(evt.date, evt.startTime),
      timeZone
    },
    end: {
      dateTime: toLocalDateTime(evt.date, evt.endTime),
      timeZone
    },
    reminders: {
      useDefault: true
    }
  };
}

/**
 * Send events to Google Calendar (backend first, then browser Calendar API)
 */
export async function sendEventsToGoogleCalendar({
  accessToken,
  events,
  isDemo = false,
  onProgress = () => {}
}) {
  if (isDemo) {
    throw new Error('Demo accounts cannot write to Google Calendar. Sign in with Gmail first.');
  }

  if (!accessToken) {
    throw new Error('Missing Google Calendar access token. Sign in with Gmail and allow Calendar access.');
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';

  try {
    const res = await fetch(`${SCHEDULER_API_BASE}/api/scheduler/send-to-calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, events, timeZone })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return { ...data, isDemo: false };
    }
  } catch {
    // Backend optional — fall through to direct Calendar API
  }

  const synced = [];
  const errors = [];

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    onProgress(i + 1, events.length, evt.title);

    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildGoogleEventPayload(evt, timeZone))
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

export function generateIcsFile(events, calendarName = 'Clark VA 360 Auto Schedule') {
  const formatLocal = (dateStr, timeStr) => {
    const [h, m] = normalizeTime(timeStr).split(':');
    return `${dateStr.replace(/-/g, '')}T${h}${m}00`;
  };

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clark VA 360//Google Auto Scheduler//EN',
    `X-WR-CALNAME:${calendarName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  events.forEach((evt, idx) => {
    ics.push('BEGIN:VEVENT');
    ics.push(`UID:clark-va-360-${Date.now()}-${idx}@clarkva360.com`);
    ics.push(`DTSTAMP:${stamp}`);
    ics.push(`DTSTART:${formatLocal(evt.date, evt.startTime)}`);
    ics.push(`DTEND:${formatLocal(evt.date, evt.endTime)}`);
    ics.push(`SUMMARY:${String(evt.title || '').replace(/\n/g, ' ')}`);
    ics.push(`DESCRIPTION:${(evt.description || 'Clark VA 360 Auto Scheduled Event').replace(/\n/g, '\\n')}`);
    if (evt.location) ics.push(`LOCATION:${evt.location}`);
    ics.push('STATUS:CONFIRMED');
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

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
