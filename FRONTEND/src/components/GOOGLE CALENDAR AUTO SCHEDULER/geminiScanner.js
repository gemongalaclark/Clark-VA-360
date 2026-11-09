import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

/* Schedules are read by the scheduler-scan Supabase Edge Function, which keeps the Gemini
   key on the server (BACKEND/GOOGLE CALENDAR AUTO SCHEDULER/functions/scheduler-scan).
   The local Express backend (server.js) is only a fallback for development. */
const SCHEDULER_API_BASE = (import.meta.env.VITE_SCHEDULER_API_URL || '').replace(/\/$/, '');

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = String(result).split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function parseSpreadsheetToCsv(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  return workbook.SheetNames.map((name) => {
    return `--- SHEET: ${name} ---\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`;
  }).join('\n\n');
}

function normalizeEvents(parsedEvents, referenceDate) {
  return (parsedEvents || []).map((evt, idx) => ({
    id: evt.id || `evt-${Date.now()}-${idx}`,
    title: evt.title || `Shift Event ${idx + 1}`,
    dayOfWeek: evt.dayOfWeek || 'Monday',
    date: evt.date || referenceDate,
    startTime: evt.startTime || '09:00',
    endTime: evt.endTime || '10:00',
    description: evt.description || 'Auto-scheduled by Clark VA 360',
    location: evt.location || '',
    category: evt.category || 'Work'
  }));
}

const isSpreadsheetFile = (file) => {
  const name = file.name.toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')
    || file.type.includes('spreadsheet') || file.type.includes('excel') || file.type === 'text/csv';
};

function fileMimeType(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  return file.type || 'image/png';
}

/* Throws with err.notDeployed when the Edge Function isn't there (e.g. local dev). */
async function scanWithEdgeFunction({ file, textData, referenceDate, onStatusUpdate }) {
  if (!supabase) throw Object.assign(new Error('Supabase is not configured.'), { notDeployed: true });

  const body = { reference_date: referenceDate };
  if (file && isSpreadsheetFile(file)) {
    onStatusUpdate('Extracting spreadsheet rows & columns...');
    body.text = `SPREADSHEET DATA (CSV):\n${await parseSpreadsheetToCsv(file)}`;
  } else if (file) {
    onStatusUpdate('Preparing your schedule file...');
    body.file = { data: await fileToBase64(file), mime_type: fileMimeType(file) };
  } else if (textData) {
    body.text = textData;
  } else {
    throw new Error('Please provide a file or schedule text to scan.');
  }

  onStatusUpdate('Reading your schedule with Gemini AI...');
  const { data, error } = await supabase.functions.invoke('scheduler-scan', { body });
  if (error) {
    const status = error.context?.status;
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* keep default */ }
    throw Object.assign(new Error(msg), { notDeployed: status === 404 || /failed to send/i.test(error.message) });
  }
  if (!data?.success) throw new Error(data?.error || 'Could not read this schedule.');

  return {
    success: true,
    modelUsed: data.modelUsed || 'Gemini AI',
    events: normalizeEvents(data.events, referenceDate)
  };
}

async function scanWithBackend({ file, textData, referenceDate, onStatusUpdate }) {
  onStatusUpdate('Sending schedule to Clark VA 360 scanner...');

  const form = new FormData();
  form.append('referenceDate', referenceDate);
  if (file) form.append('file', file);
  if (textData) form.append('textSchedule', textData);

  const response = await fetch(`${SCHEDULER_API_BASE}/api/scheduler/analyze`, {
    method: 'POST',
    body: form
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Scheduler backend could not read this file.');
  }

  return {
    success: true,
    modelUsed: data.modelUsed || 'Gemini AI',
    events: normalizeEvents(data.events, referenceDate)
  };
}

export async function scanScheduleWithGemini({
  file,
  textData,
  referenceDate = new Date().toISOString().split('T')[0],
  onStatusUpdate = () => {}
}) {
  try {
    return await scanWithEdgeFunction({ file, textData, referenceDate, onStatusUpdate });
  } catch (err) {
    if (!err.notDeployed) throw err;
    console.warn('scheduler-scan function not deployed, trying the local scheduler backend:', err.message);
    return scanWithBackend({ file, textData, referenceDate, onStatusUpdate });
  }
}

export const SAMPLE_SCHEDULES = {
  vaRoster: {
    name: 'VA Client Support Roster (Weekly)',
    description: 'Weekly virtual assistant work schedule with client standups, inbox management, and content planning.',
    text: `
CLARK VA 360 – WEEKLY CLIENT SUPPORT ROSTER
Monday:
- 08:30 - 09:30: Client Morning Standup & Task Prioritization (Zoom)
- 10:00 - 12:00: Email Inbox Zero & Customer Support Tickets
- 14:00 - 16:00: Shopify Product Inventory & Listing Updates

Tuesday:
- 09:00 - 11:30: Social Media Content Creation & Canva Graphics
- 13:00 - 15:00: Lead Generation & CRM Data Scrubbing (HubSpot)

Wednesday:
- 09:30 - 11:00: Weekly Team Sync & KPI Performance Review (Google Meet)
- 13:30 - 15:30: Email Marketing Campaign Setup (Mailchimp)

Thursday:
- 10:00 - 12:00: Calendar Audit & Executive Travel Scheduling
- 14:00 - 16:30: Monthly Bookkeeping & Expense Receipt Categorization

Friday:
- 09:00 - 11:00: Weekly Deliverables Wrap-up & Client Progress Report
- 14:00 - 15:00: VA Skill Development & Workflow Automation Practice
`
  },
  university: {
    name: 'University Class Timetable',
    description: 'Academic schedule with lectures, lab sessions, and study groups.',
    text: `
SEMESTER CLASS TIMETABLE
Monday:
- 08:00 - 10:00: CS301 Database Systems (Lecture Hall A)
- 13:00 - 15:00: MATH204 Discrete Mathematics (Hall B)

Tuesday:
- 10:00 - 12:00: CS305 Web Applications & APIs (Lab 3)
- 14:00 - 16:00: ENG202 Technical Communications

Wednesday:
- 08:00 - 10:00: CS301 Database Systems Lab (Lab 2)
- 13:00 - 15:00: MATH204 Tutorial Group

Thursday:
- 10:00 - 12:00: CS305 Project Workshop (Google Meet)
- 15:00 - 17:00: Capstone Project Team Sprint

Friday:
- 09:00 - 11:00: CS Seminar & Industry Speaker Series
`
  }
};
