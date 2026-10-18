import { useState, useEffect, useCallback } from 'react';
import { Check, Circle, Calendar, Mail, ExternalLink, PartyPopper, Hourglass, FileSignature } from 'lucide-react';
import styles from './OnboardBase.module.css';
import { doneCount, percentDone, currentStep } from './obData';
import { ProgressBar, FileDropzone, FileList, IntakeSummary, Spinner, useToast } from './ui';
import IntakeForm from './IntakeForm';

export default function ClientDashboard({ api, profile }) {
  const [portal, setPortal] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeKey, setActiveKey] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [busyStep, setBusyStep] = useState(false);
  const [toastNode, notify] = useToast();

  const refresh = useCallback(async () => {
    try {
      const next = await api.getPortal(profile.id);
      setPortal(next);
      setLoadError('');
    } catch (e) {
      setLoadError(e.message || 'Could not load your portal');
    }
  }, [api, profile.id]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loadError) return <div className={styles.card}><p className={styles.fieldError}>{loadError}</p></div>;
  if (!portal) return <Spinner label="Loading your portal…" />;

  const { project, steps, intake, files } = portal;
  if (!project) {
    return (
      <div className={styles.card}>
        <h2>Your project is being set up</h2>
        <p className={styles.muted}>We haven't created your onboarding checklist yet. Please check back shortly.</p>
      </div>
    );
  }

  const stepByKey = (key) => steps.find(s => s.step_key === key);
  const focus = steps.find(s => s.step_key === activeKey) || currentStep(steps) || steps[steps.length - 1];
  const brandFiles = files.filter(f => f.file_type === 'brand_asset');

  const complete = async (step, done = true) => {
    setBusyStep(true);
    try {
      await api.setStepDone(step.id, done);
      await refresh();
    } catch (e) {
      notify(e.message || 'Could not update step', 'error');
    } finally {
      setBusyStep(false);
    }
  };

  const handleUpload = async (list) => {
    setUploading(true);
    try {
      for (const file of list) await api.uploadFile(profile.id, file, 'brand_asset', profile.id);
      const step = stepByKey('brand_assets');
      if (step && !step.is_completed) await api.setStepDone(step.id, true);
      await refresh();
      notify(list.length > 1 ? `${list.length} files uploaded` : 'File uploaded');
    } catch (e) {
      notify(e.message || 'Upload failed', 'error');
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    try {
      await api.deleteFile(file);
      const remaining = brandFiles.filter(f => f.id !== file.id);
      const step = stepByKey('brand_assets');
      if (step?.is_completed && !remaining.length && project.status !== 'active') await api.setStepDone(step.id, false);
      await refresh();
    } catch (e) {
      notify(e.message || 'Could not delete file', 'error');
    }
  };

  const handleIntakeSave = async ({ data, currentStep: cs, submit }) => {
    await api.saveIntake(profile.id, { data, currentStep: cs, submit });
    if (submit) {
      const step = stepByKey('intake');
      if (step && !step.is_completed) await api.setStepDone(step.id, true);
    }
    await refresh();
  };

  /* ── Handoff: everything done → Active Project view ───────── */
  if (project.status === 'active') {
    const deliverables = files.filter(f => f.file_type === 'deliverable');
    return (
      <div className={`${styles.dashGrid} ${styles.dashGridActive}`}>
        {toastNode}
        <header className={styles.welcome}>
          <span className={styles.badgeGreen}><PartyPopper size={14} /> Onboarding complete</span>
          <h1>Welcome aboard, {profile.full_name?.split(' ')[0] || 'there'}!</h1>
          <p className={styles.muted}>{project.title} is now <strong>active</strong>. Everything you need lives on this page.</p>
        </header>

        <section className={styles.card}>
          <h2>Your key contact</h2>
          <p className={styles.contactName}>{project.contact_name || 'Your VA'}</p>
          {project.contact_email && (
            <a className={styles.linkRow} href={`mailto:${project.contact_email}`}><Mail size={16} /> {project.contact_email}</a>
          )}
          {project.meeting_url && (
            <a className={styles.btnPrimary} href={project.meeting_url} target="_blank" rel="noopener noreferrer">
              <Calendar size={16} /> Weekly meeting link <ExternalLink size={14} />
            </a>
          )}
        </section>

        <section className={styles.card}>
          <h2>Current deliverables</h2>
          <FileList files={deliverables} api={api} notify={notify} emptyText="Nothing delivered yet. Your first deliverable will show up here." />
        </section>

        <section className={styles.card}>
          <h2>Your brand assets</h2>
          <FileList files={brandFiles} api={api} notify={notify} />
        </section>

        <section className={styles.card}>
          <h2>Your intake answers</h2>
          <IntakeSummary intake={intake} />
        </section>
      </div>
    );
  }

  /* ── Onboarding view ──────────────────────────────────────── */
  return (
    <div className={styles.dashGrid}>
      {toastNode}
      <header className={styles.welcome}>
        <h1>Hi {profile.full_name?.split(' ')[0] || 'there'}, let's get you set up</h1>
        <p className={styles.muted}>{profile.company_name} · {project.title}. Finish the steps below and we'll start billable work right away.</p>
        <ProgressBar steps={steps} done={doneCount(steps)} total={steps.length} pct={percentDone(steps)} />
      </header>

      <nav className={`${styles.card} ${styles.stepList}`} aria-label="Onboarding steps">
        {steps.map((s, i) => (
          <button
            key={s.id}
            className={`${styles.stepItem} ${s.id === focus.id ? styles.stepItemActive : ''}`}
            onClick={() => setActiveKey(s.step_key)}
            aria-current={s.id === focus.id ? 'step' : undefined}
          >
            <span className={`${styles.stepIcon} ${s.is_completed ? styles.stepIconDone : ''}`}>
              {s.is_completed ? <Check size={14} /> : <Circle size={10} />}
            </span>
            <span>
              <strong>{i + 1}. {s.step_name}</strong>
              <small>{s.is_completed ? 'Completed' : s.description}</small>
            </span>
          </button>
        ))}
      </nav>

      <section className={`${styles.card} ${styles.stepPanel}`}>
        <h2>{focus.step_name}</h2>
        <p className={styles.muted}>{focus.description}</p>

        {focus.step_key === 'contract' && (
          <>
            <p>Your service agreement was sent to <strong>{profile.email || 'your email'}</strong>. Once you've signed it, confirm below.</p>
            {focus.is_completed
              ? <p className={styles.badgeGreen}><Check size={14} /> Agreement signed</p>
              : (
                <button className={styles.btnPrimary} onClick={() => complete(focus)} disabled={busyStep}>
                  <FileSignature size={16} /> I've signed the agreement
                </button>
              )}
          </>
        )}

        {focus.step_key === 'brand_assets' && (
          <>
            <FileDropzone onFiles={handleUpload} busy={uploading} hint="Logos, headshots, brand guidelines · PNG, JPG, SVG, WebP, PDF or ZIP · up to 10 MB" />
            <h3>Uploaded files</h3>
            <FileList files={brandFiles} api={api} notify={notify} onDelete={handleDelete} emptyText="Nothing uploaded yet." />
          </>
        )}

        {focus.step_key === 'intake' && (
          focus.is_completed && intake?.submitted_at
            ? <><p className={styles.badgeGreen}><Check size={14} /> Submitted</p><IntakeSummary intake={intake} /></>
            : <IntakeForm intake={intake} onSave={handleIntakeSave} notify={notify} />
        )}

        {focus.step_key === 'kickoff' && (
          <>
            {project.meeting_url
              ? (
                <a className={styles.btnPrimary} href={project.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Calendar size={16} /> Pick a time <ExternalLink size={14} />
                </a>
              )
              : <p className={styles.muted}>Your scheduling link will appear here shortly.</p>}
            {focus.is_completed
              ? <p className={styles.badgeGreen}><Check size={14} /> Call booked</p>
              : (
                <button className={styles.btnGhost} onClick={() => complete(focus)} disabled={busyStep}>
                  <Check size={16} /> I've booked my call
                </button>
              )}
          </>
        )}

        {focus.step_key === 'review' && (
          <p className={styles.callout}>
            <Hourglass size={18} />
            {focus.is_completed
              ? 'Review complete.'
              : doneCount(steps) === steps.length - 1
                ? "You're all done on your side! We're doing a final review and will switch your project on shortly."
                : 'We review everything once your other steps are complete. Nothing to do here yet.'}
          </p>
        )}
      </section>
    </div>
  );
}
