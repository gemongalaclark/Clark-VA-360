import { useState, useEffect } from 'react';
import { X, Check, Circle, Save, Loader2 } from 'lucide-react';
import styles from './OnboardBase.module.css';
import { percentDone, daysIdle, fmtDate } from './obData';
import { FileDropzone, FileList, IntakeSummary } from './ui';

/* Admin review panel: tick steps, read intake answers, review uploads, publish deliverables,
   and fill in the contact details clients see once the project goes active. */
export default function ClientDetail({ api, admin, portal, onClose, onChanged, notify }) {
  const { profile, project, steps, intake, files } = portal;
  const [uploading, setUploading] = useState(false);
  const [busyStep, setBusyStep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [handoff, setHandoff] = useState({
    contact_name: project.contact_name || '',
    contact_email: project.contact_email || '',
    meeting_url: project.meeting_url || '',
  });

  /* Switching to another client must not carry the previous client's form values. */
  useEffect(() => {
    setHandoff({
      contact_name: project.contact_name || '',
      contact_email: project.contact_email || '',
      meeting_url: project.meeting_url || '',
    });
  }, [project.id, project.contact_name, project.contact_email, project.meeting_url]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleStep = async (step) => {
    setBusyStep(step.id);
    try {
      await api.setStepDone(step.id, !step.is_completed);
      await onChanged();
    } catch (e) {
      notify(e.message || 'Could not update step', 'error');
    } finally {
      setBusyStep(null);
    }
  };

  const uploadDeliverables = async (list) => {
    setUploading(true);
    try {
      for (const file of list) await api.uploadFile(profile.id, file, 'deliverable', admin.id);
      await onChanged();
      notify('Deliverable shared with client');
    } catch (e) {
      notify(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (file) => {
    try {
      await api.deleteFile(file);
      await onChanged();
    } catch (e) {
      notify(e.message || 'Could not delete file', 'error');
    }
  };

  const saveHandoff = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProject(project.id, {
        contact_name: handoff.contact_name.trim() || null,
        contact_email: handoff.contact_email.trim() || null,
        meeting_url: handoff.meeting_url.trim() || null,
      });
      await onChanged();
      notify('Project details saved');
    } catch (err) {
      notify(err.message || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const bind = (key) => ({ value: handoff[key], onChange: (e) => setHandoff(h => ({ ...h, [key]: e.target.value })) });

  return (
    <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={`${profile.company_name} details`}>
        <header className={styles.drawerHead}>
          <div>
            <h2>{profile.company_name}</h2>
            <p className={styles.muted}>
              {profile.full_name} · {profile.email} · started {fmtDate(project.created_at)}
            </p>
            <p className={styles.muted}>
              {project.status === 'active' ? 'Active project' : `${percentDone(steps)}% onboarded · last activity ${daysIdle(portal)}d ago`}
            </p>
          </div>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <section className={styles.drawerSection}>
          <h3>Onboarding steps</h3>
          <ul className={styles.adminSteps}>
            {steps.map(s => (
              <li key={s.id}>
                <button onClick={() => toggleStep(s)} disabled={busyStep === s.id} aria-pressed={s.is_completed}>
                  <span className={`${styles.stepIcon} ${s.is_completed ? styles.stepIconDone : ''}`}>
                    {busyStep === s.id ? <Loader2 className={styles.spin} size={12} /> : s.is_completed ? <Check size={14} /> : <Circle size={10} />}
                  </span>
                  <span>
                    <strong>{s.step_name}</strong>
                    <small>{s.is_completed ? `Completed ${fmtDate(s.completed_at)}` : 'Pending'}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.muted}>Completing every step switches the client to their Active Project view.</p>
        </section>

        <section className={styles.drawerSection}>
          <h3>Intake form {intake?.submitted_at ? <span className={styles.badgeGreen}>Submitted {fmtDate(intake.submitted_at)}</span> : <span className={styles.badgeGrey}>Not submitted</span>}</h3>
          <IntakeSummary intake={intake} />
        </section>

        <section className={styles.drawerSection}>
          <h3>Files from client</h3>
          <FileList files={files.filter(f => f.file_type === 'brand_asset')} api={api} notify={notify} onDelete={deleteFile} emptyText="No brand assets uploaded." />
        </section>

        <section className={styles.drawerSection}>
          <h3>Deliverables</h3>
          <FileList files={files.filter(f => f.file_type === 'deliverable')} api={api} notify={notify} onDelete={deleteFile} emptyText="No deliverables shared yet." />
          <FileDropzone onFiles={uploadDeliverables} busy={uploading} hint="Anything you upload here appears in the client's Active Project view" />
        </section>

        <form className={styles.drawerSection} onSubmit={saveHandoff}>
          <h3>Active project details</h3>
          <div className={styles.field}>
            <label htmlFor="cd-name">Key contact name</label>
            <input id="cd-name" type="text" {...bind('contact_name')} />
          </div>
          <div className={styles.field}>
            <label htmlFor="cd-email">Key contact email</label>
            <input id="cd-email" type="email" {...bind('contact_email')} />
          </div>
          <div className={styles.field}>
            <label htmlFor="cd-url">Meeting link (also used for the kickoff call)</label>
            <input id="cd-url" type="url" placeholder="https://calendly.com/…" {...bind('meeting_url')} />
          </div>
          <button type="submit" className={styles.btnPrimary} disabled={saving}>
            {saving ? <Loader2 className={styles.spin} size={16} /> : <Save size={16} />} Save details
          </button>
        </form>
      </aside>
    </div>
  );
}
