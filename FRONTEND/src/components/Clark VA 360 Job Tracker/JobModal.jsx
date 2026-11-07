import { useState } from 'react';
import styles from './JobTracker.module.css';
import { Field, Modal, ModalForm, SourcePicker, isoDay, withScheme } from './ui';

/* Add / edit form for both pages.
   kind 'application' asks for the date applied; kind 'bookmark' asks for the requirements. */
export default function JobModal({ kind, job, onSave, onClose }) {
  const isApp = kind === 'application';
  const [source, setSource] = useState(job?.source ?? '');
  const [other, setOther] = useState(job?.source_other ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      ...(job?.id ? { id: job.id } : {}),
      title: String(f.get('title')).trim(),
      url: withScheme(f.get('url')),
      source,
      source_other: source === 'other' ? other.trim() : null,
      ...(isApp ? { applied_on: f.get('applied_on') } : { requirements: String(f.get('requirements') ?? '') }),
    };
    setBusy(true);
    const ok = await onSave(payload);
    setBusy(false);
    if (ok) onClose();
  };

  const noun = isApp ? 'application' : 'bookmark';

  return (
    <Modal title={job ? `Edit ${noun}` : isApp ? 'Log an application' : 'Bookmark a job'} eyebrow={isApp ? 'Job Tracker' : 'Bookmarks'} onClose={onClose}>
      <ModalForm
        onSubmit={submit}
        actions={<>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={busy}>{busy ? 'Saving…' : job ? 'Save changes' : isApp ? 'Log application' : 'Save bookmark'}</button>
        </>}
      >
        <Field label="Job title">
          <input name="title" defaultValue={job?.title ?? ''} required maxLength={120} placeholder="e.g. Executive Virtual Assistant" />
        </Field>

        <Field label="Job link" hint="Paste the link to the job post.">
          <input name="url" type="text" inputMode="url" defaultValue={job?.url ?? ''} required maxLength={2000} placeholder="https://www.linkedin.com/jobs/view/…" />
        </Field>

        {isApp && (
          <Field label="Date applied">
            <input name="applied_on" type="date" defaultValue={job?.applied_on ?? isoDay()} max={isoDay()} required />
          </Field>
        )}

        <SourcePicker value={source} other={other} onChange={setSource} onOtherChange={setOther} />

        {!isApp && (
          <Field label="Requirements to submit" hint="One per line, e.g. Resume, Loom video intro, Portfolio link.">
            <textarea name="requirements" rows={5} maxLength={2000} defaultValue={job?.requirements ?? ''} placeholder={'Updated resume\n2-minute Loom video\nSample work / portfolio'} />
          </Field>
        )}
      </ModalForm>
    </Modal>
  );
}
