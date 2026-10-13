import * as XLSX from 'xlsx';

const FALLBACK_GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash'
];

/**
 * Convert a File object to base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Parse an Excel / CSV file into CSV text
 */
export async function parseSpreadsheetToCsv(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_csv(worksheet);
}

/**
 * Build Gemini extraction prompt
 */
function buildSchedulePrompt(referenceDate) {
  return `
You are the AI Schedule Extraction Intelligence Engine for "Clark VA 360's Google Auto Scheduler".
Analyze the provided schedule (image timetable, PDF roster, or spreadsheet data) and extract every event/task/shift from Monday through Sunday.

Anchor Date / Week start reference: ${referenceDate}
(If days are relative like "Monday", "Tuesday", calculate the exact calendar date YYYY-MM-DD for this week starting around ${referenceDate}).

EXTRACT ALL ITEMS WITH THIS EXACT JSON STRUCTURE:
[
  {
    "id": "evt-1",
    "title": "Clear event or shift name (e.g. Client Onboarding, Social Media Planning)",
    "dayOfWeek": "Monday",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "description": "Short summary or notes from the schedule",
    "location": "Zoom / Google Meet / Office / Room if mentioned",
    "category": "Work | Meeting | Study | Personal | Shift"
  }
]

RULES:
- Use 24-hour format for startTime and endTime (e.g. 09:00, 14:30). If no end time is written, make it 1 hour after start.
- If multiple events happen on the same day, output each as a separate item.
- Ensure date is valid YYYY-MM-DD.
- Output ONLY valid JSON array with NO markdown wrapping.
`;
}

/**
 * Scan schedule file or text with Gemini AI
 */
export async function scanScheduleWithGemini({
  file,
  textData,
  referenceDate = new Date().toISOString().split('T')[0],
  apiKey = null,
  onStatusUpdate = () => {}
}) {
  const activeKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || FALLBACK_GEMINI_KEY;

  onStatusUpdate('Preparing schedule file...');

  const promptText = buildSchedulePrompt(referenceDate);
  const parts = [];

  if (file) {
    const fileName = file.name.toLowerCase();
    const isSpreadsheet =
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel') ||
      file.type === 'text/csv';

    if (isSpreadsheet) {
      onStatusUpdate('Extracting spreadsheet rows & columns...');
      const csvContent = await parseSpreadsheetToCsv(file);
      parts.push({ text: promptText });
      parts.push({ text: `\n\nSPREADSHEET DATA CONTENT (CSV FORMAT):\n${csvContent}` });
    } else {
      onStatusUpdate('Encoding visual document for Gemini multimodal OCR...');
      const base64Data = await fileToBase64(file);
      let mimeType = file.type || 'image/png';
      if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (fileName.endsWith('.png')) mimeType = 'image/png';
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (fileName.endsWith('.webp')) mimeType = 'image/webp';

      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
      parts.push({ text: promptText });
    }
  } else if (textData) {
    parts.push({ text: promptText });
    parts.push({ text: `\n\nSCHEDULE TEXT TO SCAN:\n${textData}` });
  } else {
    throw new Error('Please provide a file or schedule text to scan.');
  }

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      onStatusUpdate(`Analyzing schedule with ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      const data = await response.json();

      if (data.error) {
        lastError = new Error(`[${model}] ${data.error.message}`);
        console.warn(`Gemini model ${model} skipped:`, data.error.message);
        continue; // Try next model in priority cascade
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No text generated by Gemini.');
      }

      let parsedEvents = [];
      try {
        const parsed = JSON.parse(text);
        parsedEvents = Array.isArray(parsed) ? parsed : (parsed.events || []);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          parsedEvents = JSON.parse(match[0]);
        } else {
          throw new Error('Could not parse JSON array from Gemini response.');
        }
      }

      // Add unique IDs and normalize fields
      const normalizedEvents = parsedEvents.map((evt, idx) => ({
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

      return {
        success: true,
        modelUsed: model,
        events: normalizedEvents
      };
    } catch (err) {
      lastError = err;
      console.warn(`Error using model ${model}:`, err.message);
    }
  }

  throw lastError || new Error('All Gemini AI models failed. Please verify your connection or try again.');
}

/**
 * Built-in sample schedules for instant 1-click test runs
 */
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
