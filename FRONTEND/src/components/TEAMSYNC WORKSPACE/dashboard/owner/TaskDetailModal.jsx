import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarClock, CalendarPlus, Pencil, ClipboardCheck, Sparkles, MessageSquareQuote } from 'lucide-react';
import StatusBadge, { UrgentBadge, getName } from '../StatusBadge';
import SubmissionTable from '../SubmissionTable';
import AttachmentList from '../AttachmentList';
import Avatar from '../../profile/Avatar';
import { deadlineInfo, formatDeadline, isActionable } from '../taskUtils';
import styles from '../SharedPages.module.css';

/* Read-only view of one task: the full brief, files, submission and decision, with shortcuts to edit or review */
export default function TaskDetailModal({ task, aiReview, onClose, onEdit, onReview }) {
  const closeRef = useRef(null);
  const info = deadlineInfo(task);
  const created = new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  /* Portal to <body>: the dashboard page keeps an animated transform, which would otherwise trap a
     position:fixed overlay inside the content area (under the top bar, sidebar not dimmed) */
  return createPortal(
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${styles.detailModal}`} role="dialog" aria-modal="true" aria-labelledby="task-detail-title">
        <div className={styles.modalHeader}>
          <div className={styles.detailHeadText}>
            <span className={styles.fullDescLabel}>Task details</span>
            <h3 className={styles.modalTitle} id="task-detail-title">{task.title}</h3>
          </div>
          <button ref={closeRef} className={styles.modalClose} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className={styles.detailBody}>
          <div className={styles.detailMeta}>
            <span className={styles.assignerChip}>
              <Avatar profile={task.profiles} className={styles.assignerAvatar} />
              <span>Assigned to <strong>{getName(task.profiles)}</strong></span>
            </span>
            <span className={styles.deadlineChip}><CalendarPlus size={13} /> Created {created}</span>
            {task.deadline ? (
              <span className={`${styles.deadlineChip} ${info?.urgent ? styles.deadlineUrgent : ''}`}>
                <CalendarClock size={13} /> Due {formatDeadline(task.deadline)}{info && !info.done && <em>· {info.label}</em>}
              </span>
            ) : (
              <span className={styles.deadlineChip}><CalendarClock size={13} /> No deadline</span>
            )}
            {info?.urgent && <UrgentBadge overdue={info.overdue} />}
            {task.status === 'submitted' && aiReview && (
              <span className={styles.aiChip} title="AI QA match score"><Sparkles size={11} /> {aiReview.score}% match</span>
            )}
            <StatusBadge status={task.status} />
          </div>

          <section className={styles.detailSection}>
            <span className={styles.fullDescLabel}>Task description</span>
            {task.description
              ? <div className={styles.detailDesc}>{task.description}</div>
              : <p className={styles.detailEmpty}>No description was added to this task.</p>}
          </section>

          {task.attachments?.length > 0 && (
            <section className={styles.detailSection}>
              <span className={styles.fullDescLabel}>Attachments</span>
              <AttachmentList items={task.attachments} />
            </section>
          )}

          {task.submission?.length > 0 && (
            <section className={styles.detailSection}>
              <span className={styles.fullDescLabel}>Submission</span>
              <SubmissionTable rows={task.submission} />
            </section>
          )}

          {task.reviewer_notes && (task.status === 'approved' || task.status === 'rejected') && (
            <div className={`${styles.feedback} ${task.status === 'approved' ? styles.feedbackApproved : styles.feedbackRejected}`}>
              <MessageSquareQuote size={15} />
              <div><strong>{task.status === 'approved' ? 'Your approval note' : 'Revision you requested'}</strong>{task.reviewer_notes}</div>
            </div>
          )}

        </div>

        <div className={styles.detailFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Close</button>
          {isActionable(task) && (
            <button className={styles.cancelBtn} onClick={onEdit}><Pencil size={13} /> Edit task</button>
          )}
          {task.status === 'submitted' && (
            <button className={styles.acceptBtn} onClick={onReview}><ClipboardCheck size={14} /> Review submission</button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
