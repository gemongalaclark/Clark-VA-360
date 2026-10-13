import { useState, useRef } from 'react';
import { X, Upload, FileText, Image as ImageIcon, FileSpreadsheet, Sparkles, AlertCircle, Calendar, Check, Zap } from 'lucide-react';
import { SAMPLE_SCHEDULES } from './geminiScanner';
import styles from './GoogleCalendarAutoScheduler.module.css';

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
  const [referenceDate, setReferenceDate] = useState(() => {
    const today = new Date();
    // Default to this week's Monday
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
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
    onAnalyzeFile(selectedFile, referenceDate);
  };

  const handleSampleClick = (key) => {
    onAnalyzeSample(key, referenceDate);
  };

  const setWeekOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setReferenceDate(d.toISOString().split('T')[0]);
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
                onClick={() => setWeekOffset(7)}
                disabled={isScanning}
              >
                Next Week
              </button>
            </div>
            <p className={styles.fieldHelper}>
              Gemini will assign Monday–Sunday shifts to specific calendar dates based on this week anchor.
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
