import { useState, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, FileSpreadsheet, Sparkles, AlertCircle, Calendar, Check, Zap, Bell, BellOff } from 'lucide-react';
import styles from './GoogleCalendarAutoScheduler.module.css';

function toISODateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMondayISO(weekOffset = 0) {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday + weekOffset * 7);
  return toISODateLocal(monday);
}

export default function UploadModal({
  isOpen,
  onClose,
  onAnalyzeFile,
  onAnalyzeSample,
  isScanning,
  scanStatus
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [referenceDate, setReferenceDate] = useState(() => getMondayISO(0));
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFile = (file) => {
    if (!file) return;
    setErrorMessage(null);

    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.xlsx', '.xls', '.csv'];
    const name = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => name.endsWith(ext)) || file.type.startsWith('image/');

    if (!isValid) {
      setErrorMessage('Please upload a supported format: Image (PNG, JPG, WEBP), PDF, or Spreadsheet (.xlsx, .csv).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25MB limit. Please upload a smaller document.');
      return;
    }

    setSelectedFile(file);

    // Create preview thumbnail if image
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      setErrorMessage('Please choose or drop a schedule file first.');
      return;
    }
    onAnalyzeFile(selectedFile, referenceDate, reminderEnabled ? reminderMinutes : null);
  };

  const handleSampleClick = (key) => {
    onAnalyzeSample(key, referenceDate, reminderEnabled ? reminderMinutes : null);
  };

  const setWeekOffset = (weeks) => {
    setReferenceDate(getMondayISO(weeks));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderTitle}>
            <div className={styles.modalHeaderIcon}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3>Upload & Scan Schedule</h3>
              <p>Upload a photo, PDF timetable, or spreadsheet for Gemini AI to read</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={isScanning}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* File Dropzone */}
          {!selectedFile ? (
            <div
              className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className={styles.hiddenInput}
                accept=".png,.jpg,.jpeg,.webp,.pdf,.xlsx,.xls,.csv"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className={styles.dropzoneIconWrap}>
                <Upload size={32} />
              </div>
              <h4>Drag & drop your schedule file here</h4>
              <p>or click to browse from your device</p>
              <div className={styles.supportedFormats}>
                <span className={styles.formatTag}><ImageIcon size={13} /> Photo (PNG, JPG)</span>
                <span className={styles.formatTag}><FileText size={13} /> PDF Document</span>
                <span className={styles.formatTag}><FileSpreadsheet size={13} /> Excel (.xlsx) / CSV</span>
              </div>
            </div>
          ) : (
            <div className={styles.fileSelectedCard}>
              <div className={styles.filePreviewRow}>
                {filePreview ? (
                  <img src={filePreview} alt="Schedule preview" className={styles.previewThumb} />
                ) : (
                  <div className={styles.docIconThumb}>
                    {selectedFile.name.endsWith('.pdf') ? (
                      <FileText size={32} color="#cb2525" />
                    ) : (
                      <FileSpreadsheet size={32} color="#257bcb" />
                    )}
                  </div>
                )}
                <div className={styles.fileDetailsCol}>
                  <div className={styles.fileName}>{selectedFile.name}</div>
                  <div className={styles.fileSize}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for Gemini AI
                  </div>
                  <div className={styles.fileStatusReady}>
                    <Check size={14} /> Ready to scan Monday–Sunday schedule
                  </div>
                </div>
                <button
                  className={styles.removeFileBtn}
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  disabled={isScanning}
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Reference Week / Date Anchor */}
          <div className={styles.referenceDateSection}>
            <label className={styles.fieldLabel}>
              <Calendar size={15} />
              <span>Target Week (Monday Anchor Date):</span>
            </label>
            <div className={styles.dateControlRow}>
              <input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className={styles.dateInput}
                disabled={isScanning}
              />
              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setWeekOffset(0)}
                disabled={isScanning}
              >
                This Week
              </button>
              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setWeekOffset(1)}
                disabled={isScanning}
              >
                Next Week
              </button>
            </div>
            <p className={styles.fieldHelper}>
              Gemini will assign Monday–Sunday shifts to specific calendar dates based on this week anchor.
            </p>
          </div>

          {/* Reminder Settings */}
          <div className={styles.referenceDateSection}>
            <label className={styles.fieldLabel}>
              {reminderEnabled ? <Bell size={15} /> : <BellOff size={15} />}
              <span>Event Reminders:</span>
            </label>
            <div className={styles.dateControlRow}>
              <label className={styles.reminderToggleLabel}>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  disabled={isScanning}
                />
                <span>{reminderEnabled ? 'Enabled' : 'Disabled'}</span>
              </label>
              {reminderEnabled && (
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className={styles.reminderSelect}
                  disabled={isScanning}
                >
                  <option value={10}>10 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                  <option value={1440}>1 day before</option>
                </select>
              )}
            </div>
            <p className={styles.fieldHelper}>
              {reminderEnabled
                ? `A popup reminder will fire ${reminderMinutes >= 1440 ? '1 day' : reminderMinutes >= 60 ? `${reminderMinutes / 60} hour(s)` : `${reminderMinutes} minutes`} before each event.`
                : 'No reminders will be added to the calendar events.'}
            </p>
          </div>

          {/* Quick preset samples */}
          <div className={styles.sampleSection}>
            <span className={styles.sampleLabel}>Or test drive with a ready-made schedule:</span>
            <div className={styles.sampleButtonsRow}>
              <button
                type="button"
                className={styles.sampleChip}
                onClick={() => handleSampleClick('vaRoster')}
                disabled={isScanning}
              >
                <Zap size={14} />
                <span>Sample VA Work Roster</span>
              </button>
              <button
                type="button"
                className={styles.sampleChip}
                onClick={() => handleSampleClick('university')}
                disabled={isScanning}
              >
                <FileText size={14} />
                <span>Sample Academic Timetable</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className={styles.errorAlert}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Live Scanning Progress */}
          {isScanning && (
            <div className={styles.scanningProgressCard}>
              <div className={styles.scanningSpinner} />
              <div className={styles.scanningStatusText}>
                <strong>Gemini AI Intelligence Scanning...</strong>
                <p>{scanStatus || 'Reading image pixels, PDF text, and table cells...'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isScanning}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.analyzeBtn}
            onClick={handleAnalyze}
            disabled={!selectedFile || isScanning}
            id="start-gemini-analysis-btn"
          >
            <Sparkles size={18} />
            <span>{isScanning ? 'Scanning Schedule...' : 'Analyze with Gemini AI'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
