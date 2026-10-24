import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ExternalLink, FileText, MapPin, GraduationCap, Briefcase, Award } from 'lucide-react';
import styles from './CvViewer.module.css';

export const CV_URL = '/files/Gemongala_Resume.pdf';
const CV_FILENAME = 'Clark_Gemongala_Resume.pdf';

const facts = [
  { icon: Briefcase, label: 'Experience', value: 'Web Developer Intern · Knowles Training Institute' },
  { icon: GraduationCap, label: 'Education', value: 'BS Information Technology · CIT, 2026' },
  { icon: Award, label: 'Certifications', value: 'TESDA AI Prompting L-III · AWS Academy' },
  { icon: MapPin, label: 'Based in', value: 'Cebu, Philippines · Remote-ready' },
];

const skills = ['React', 'Supabase', 'PostgreSQL', 'Node.js', 'Gemini API', 'WordPress', 'AWS', 'Figma'];

/* Phones (Android Chrome, most in-app browsers) can't render a PDF inside a frame */
const canEmbedPdf = () =>
  typeof navigator !== 'undefined' && navigator.pdfViewerEnabled !== false && !window.matchMedia('(max-width: 700px)').matches;

export default function CvViewer({ open, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const trigger = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      trigger?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const embed = canEmbedPdf();

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cv-title">
        {/* ── Header ── */}
        <header className={styles.header}>
          <span className={styles.fileIcon} aria-hidden="true"><FileText size={18} /></span>
          <div className={styles.titleWrap}>
            <h2 id="cv-title" className={styles.title}>Clark Gemongala — Résumé</h2>
            <p className={styles.sub}>PDF · 2 pages · Updated Oct 2026</p>
          </div>
          <div className={styles.actions}>
            <a className={styles.ghostBtn} href={CV_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> <span>Open</span>
            </a>
            <a className={styles.primaryBtn} href={CV_URL} download={CV_FILENAME}>
              <Download size={15} /> <span>Download</span>
            </a>
            <button ref={closeRef} type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close résumé">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {/* ── Document ── */}
          <div className={styles.viewer}>
            {embed ? (
              <iframe className={styles.frame} src={`${CV_URL}#view=FitH`} title="Clark Gemongala résumé (PDF)" />
            ) : (
              <div className={styles.fallback}>
                <div className={styles.paper} aria-hidden="true">
                  <span className={styles.paperName}>Clark Gemongala</span>
                  <span className={styles.paperLine} style={{ width: '78%' }} />
                  <span className={styles.paperHead} />
                  <span className={styles.paperLine} />
                  <span className={styles.paperLine} style={{ width: '88%' }} />
                  <span className={styles.paperLine} style={{ width: '64%' }} />
                  <span className={styles.paperHead} />
                  <span className={styles.paperLine} />
                  <span className={styles.paperLine} style={{ width: '82%' }} />
                </div>
                <p className={styles.fallbackText}>Tap below to view the full résumé, or save a copy.</p>
                <div className={styles.fallbackActions}>
                  <a className={styles.ghostBtn} href={CV_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={15} /> View full résumé
                  </a>
                  <a className={styles.primaryBtn} href={CV_URL} download={CV_FILENAME}>
                    <Download size={15} /> Download PDF
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ── At a glance ── */}
          <aside className={styles.side}>
            <p className={styles.eyebrow}>At a glance</p>
            <p className={styles.role}>Virtual Assistant &amp; Web Developer</p>
            <p className={styles.summary}>
              IT graduate building full-stack apps with React &amp; Supabase and putting AI to work in real workflows.
            </p>
            <ul className={styles.facts}>
              {facts.map(({ icon: Icon, label, value }) => (
                <li key={label}>
                  <span className={styles.factIcon} aria-hidden="true"><Icon size={14} /></span>
                  <span>
                    <span className={styles.factLabel}>{label}</span>
                    <span className={styles.factValue}>{value}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.eyebrow}>Core skills</p>
            <ul className={styles.chips}>
              {skills.map(s => <li key={s}>{s}</li>)}
            </ul>
            <a className={`${styles.primaryBtn} ${styles.sideCta}`} href={CV_URL} download={CV_FILENAME}>
              <Download size={15} /> Download résumé
            </a>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
}
