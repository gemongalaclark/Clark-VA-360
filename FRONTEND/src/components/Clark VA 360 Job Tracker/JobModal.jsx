import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './JobTracker.module.css';
import { Field, Modal, ModalForm, SourcePicker, domainOf, fmtDate, isoDay, withScheme } from './ui';

const normTitle = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/* Add / edit form for both pages.
   kind 'application' asks for the date applied; kind 'bookmark' asks for the requirements.
   `existing` (the user's saved applications, as loaded from the database) powers the duplicate-title warning. */
export default function JobModal({ kind, job, existing = [], onSave, onClose }) {
  const isApp = kind === 'application';
  const [source, setSource] = useState(job?.source ?? '');
  const [other, setOther] = useState(job?.source_other ?? '');
  const [title, setTitle] = useState(job?.title ?? '');
  const [busy, setBusy] = useState(false);

  /* Same title (ignoring case and extra spaces), other than the row being edited. */
  const dupes = normTitle(title) ? existing.filter(x => x.id !== job?.id && normTitle(x.title) === normTitle(title)) : [];

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
          <input name="title" value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} placeholder="e.g. Executive Virtual Assistant" />
          {dupes.length > 0 && (
            <span className={styles.fieldWarn} role="status">
              <AlertTriangle size={14} />
              <span>
                Already logged{dupes.length > 1 ? ` ${dupes.length} times` : ''}:{' '}
                {dupes.slice(0, 3).map(d => `${fmtDate(d.applied_on)} · ${domainOf(d.url)}`).join('; ')}
                {dupes.length > 3 ? '; …' : ''}. Check it's not the same post.
              </span>
            </span>
          )}
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
