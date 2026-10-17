import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import * as XLSX from 'xlsx';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage for handling file uploads (photo, pdf, spreadsheet)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Priority list of Gemini models to use
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-1.5-flash'
];

/**
 * Call Gemini API with automatic fallback across models
 */
async function callGemini(contents, jsonMode = true) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents,
        generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {}
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        lastError = new Error(`[${model}] ${data.error.message}`);
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { text, model };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

/**
 * Build Gemini prompt for extracting schedules
 */
function buildExtractionPrompt(referenceDate = new Date().toISOString().split('T')[0]) {
  return `
You are the Schedule Intelligence Engine for "Clark VA 360's Google Auto Scheduler".
Your job is to thoroughly analyze the provided schedule (image timetable, PDF roster, or spreadsheet table) and extract every single event, shift, or appointment into a clean JSON array.

Reference Date / Week Anchor: ${referenceDate} (Use this date or current week to calculate specific calendar dates YYYY-MM-DD if dates are relative like 'Monday' or 'Oct 15').

INSTRUCTIONS:
1. Scan for all days (Monday through Sunday or specific calendar dates).
2. For each scheduled item, extract:
   - "title": Clear event or shift name (e.g. "Client Meeting", "Admin & Inbox Shift", "Math Class", "Marketing Strategy").
   - "dayOfWeek": Day of week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday).
   - "date": Event date in "YYYY-MM-DD" format. If only day of week is provided, calculate the date in the current/upcoming week starting from ${referenceDate}.
   - "startTime": Start time in 24-hour "HH:MM" format (e.g. "09:00", "14:30").
   - "endTime": End time in 24-hour "HH:MM" format (e.g. "11:00", "17:00"). If no end time is specified, default to 1 hour after start time.
   - "description": Helpful details, notes, shift breakdown, or tasks listed.
   - "location": Room, Google Meet/Zoom, or physical location if mentioned (or empty string).
   - "category": One of: "Work", "Meeting", "Study", "Personal", "Shift", "Reminder".
3. If multiple events exist on the same day, include each as a distinct object.
4. Output STRICTLY a valid JSON array matching the structure below without additional markdown formatting:

[
  {
    "title": "Shift Onboarding",
    "dayOfWeek": "Monday",
    "date": "2026-10-12",
    "startTime": "09:00",
    "endTime": "11:00",
    "description": "Weekly client kickoff and task review",
    "location": "Google Meet",
    "category": "Work"
  }
]
`;
}

// Health check endpoint
app.get('/api/scheduler/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Clark VA 360 Google Auto Scheduler Backend',
    models: GEMINI_MODELS,
    hasApiKey: !!GEMINI_API_KEY
  });
});

// Endpoint to analyze schedule files (Image, PDF, or Spreadsheet)
app.post('/api/scheduler/analyze', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const bodyBase64 = req.body.base64;
    const bodyMimeType = req.body.mimeType;
    const bodyFileName = req.body.fileName;
    const referenceDate = req.body.referenceDate || new Date().toISOString().split('T')[0];

    const promptText = buildExtractionPrompt(referenceDate);
    const contents = [];

    // Case 1: Uploaded file via Multer
    if (file) {
      const mime = file.mimetype;
      const originalName = file.originalname.toLowerCase();

      // Spreadsheet handling (.xlsx, .xls, .csv)
      if (
        originalName.endsWith('.xlsx') ||
        originalName.endsWith('.xls') ||
        originalName.endsWith('.csv') ||
        mime.includes('spreadsheet') ||
        mime.includes('excel') ||
        mime === 'text/csv'
      ) {
        let sheetCsv = '';
        if (originalName.endsWith('.csv') || mime === 'text/csv') {
          sheetCsv = file.buffer.toString('utf-8');
        } else {
          const workbook = XLSX.read(file.buffer, { type: 'buffer' });
          sheetCsv = workbook.SheetNames.map((name) => {
            return `--- SHEET: ${name} ---\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`;
          }).join('\n\n');
        }

        contents.push({
          parts: [
            { text: promptText },
            { text: `\n\nSPREADSHEET DATA CONTENT (CSV FORMAT):\n${sheetCsv}` }
          ]
        });
      }
      // Image or PDF handling
      else {
        let resolvedMime = mime;
        if (originalName.endsWith('.pdf')) resolvedMime = 'application/pdf';
        else if (originalName.endsWith('.png')) resolvedMime = 'image/png';
        else if (originalName.endsWith('.jpg') || originalName.endsWith('.jpeg')) resolvedMime = 'image/jpeg';
        else if (originalName.endsWith('.webp')) resolvedMime = 'image/webp';

        contents.push({
          parts: [
            {
              inlineData: {
                mimeType: resolvedMime,
                data: file.buffer.toString('base64')
              }
            },
            { text: promptText }
          ]
        });
      }
    }
    // Case 2: Direct Base64 / Text payload
    else if (bodyBase64 && bodyMimeType) {
      if (bodyMimeType.includes('spreadsheet') || bodyFileName?.endsWith('.csv')) {
        const decoded = Buffer.from(bodyBase64, 'base64').toString('utf-8');
        contents.push({
          parts: [
            { text: promptText },
            { text: `\n\nSCHEDULE TEXT/CSV DATA:\n${decoded}` }
          ]
        });
      } else {
        contents.push({
          parts: [
            {
              inlineData: {
                mimeType: bodyMimeType,
                data: bodyBase64
              }
            },
            { text: promptText }
          ]
        });
      }
    } else if (req.body.textSchedule) {
      contents.push({
        parts: [
          { text: promptText },
          { text: `\n\nSCHEDULE TEXT:\n${req.body.textSchedule}` }
        ]
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'No schedule file or data provided. Please upload a photo, PDF, or spreadsheet.'
      });
    }

    const result = await callGemini(contents, true);
    let events = [];

    try {
      const parsed = JSON.parse(result.text);
      events = Array.isArray(parsed) ? parsed : (parsed.events || []);
    } catch {
      // Fallback clean extraction if markdown backticks were returned
      const match = result.text.match(/\[[\s\S]*\]/);
      if (match) {
        events = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse extracted events from AI response.');
      }
    }

    res.json({
      success: true,
      modelUsed: result.model,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Schedule Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during schedule scanning.'
    });
  }
});

// Endpoint to batch create events in Google Calendar via access token
app.post('/api/scheduler/send-to-calendar', async (req, res) => {
  try {
    const { accessToken, events, timeZone = 'Asia/Manila', reminderMinutes = null } = req.body;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Missing Google OAuth Access Token. Please sign in to Google first.'
      });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No events provided to sync.'
      });
    }

    const createdEvents = [];
    const errors = [];

    for (const evt of events) {
      try {
        const padTime = (value, fallback) => {
          const match = String(value || fallback).trim().match(/^(\d{1,2}):(\d{2})/);
          if (!match) return fallback;
          return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
        };
        const startDateTime = `${evt.date}T${padTime(evt.startTime, '09:00')}:00`;
        const endDateTime = `${evt.date}T${padTime(evt.endTime, '10:00')}:00`;

        const reminders = reminderMinutes != null
          ? { useDefault: false, overrides: [{ method: 'popup', minutes: Number(reminderMinutes) }] }
          : { useDefault: false, overrides: [] };

        const googleEventPayload = {
          summary: evt.title,
          description: `${evt.description || 'Auto-scheduled by Clark VA 360'}\n\nCategory: ${evt.category || 'General'}\nGenerated via Clark VA 360 Google Auto Scheduler`,
          location: evt.location || '',
          start: {
            dateTime: startDateTime,
            timeZone
          },
          end: {
            dateTime: endDateTime,
            timeZone
          },
          reminders
        };

        const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(googleEventPayload)
        });

        const calData = await calRes.json();

        if (calData.error) {
          errors.push({ title: evt.title, error: calData.error.message });
        } else {
          createdEvents.push(calData);
        }
      } catch (err) {
        errors.push({ title: evt.title, error: err.message });
      }
    }

    res.json({
      success: createdEvents.length > 0,
      syncedCount: createdEvents.length,
      failedCount: errors.length,
      createdEvents,
      errors
    });
  } catch (error) {
    console.error('Calendar Sync Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync events to Google Calendar.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Clark VA 360 Google Auto Scheduler backend running on port ${PORT}`);
});
