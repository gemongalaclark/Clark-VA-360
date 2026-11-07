import { useMemo, useState } from 'react';
import { Plus, Send, ArrowUpRight, Pencil, Trash2, SearchX } from 'lucide-react';
import styles from './JobTracker.module.css';
import { ConfirmModal, EmptyState, SourceBadge, Toolbar, domainOf, matches, parseDay } from './ui';
import JobModal from './JobModal';

/* Job Tracker page: every job applied to, grouped by month, newest first. */
export default function Applications({ applications, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);     // null | 'new' | application
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');

  const groups = useMemo(() => {
    const out = [];
    for (const a of applications) {
      if (source !== 'all' && a.source !== source) continue;
      if (!matches(a, query.trim())) continue;
      const key = a.applied_on.slice(0, 7);
      if (out.at(-1)?.key !== key) {
        out.push({ key, label: parseDay(a.applied_on).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), items: [] });
      }
      out.at(-1).items.push(a);
    }
    return out;
  }, [applications, query, source]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Job Tracker</span>
          <h1>Jobs you’ve <em>applied to</em></h1>
          <p className={styles.muted}>Log each application with its link, the date you applied and where you found it.</p>
        </div>
        <div className={styles.headActions}>
          <button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Log application</button>
        </div>
      </header>

      {applications.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No applications yet"
          text="Every job you apply to goes here, so you always know what you sent and when."
          action={<button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Log your first application</button>}
        />
      ) : (
        <>
          <Toolbar query={query} onQuery={setQuery} source={source} onSource={setSource} items={applications} placeholder="Search job title, link or site…" />

          {groups.length === 0 ? (
            <EmptyState icon={SearchX} title="No matches" text="Try another search or source filter." />
          ) : groups.map(g => (
            <section key={g.key} className={styles.group}>
              <h2 className={styles.groupHead}>{g.label} <span>{g.items.length}</span></h2>
              <ul className={styles.rows}>
                {g.items.map(a => {
                  const d = parseDay(a.applied_on);
                  return (
                    <li key={a.id} className={styles.row}>
                      <time className={styles.dateStamp} dateTime={a.applied_on}>
                        <small>{d.toLocaleDateString('en-US', { month: 'short' })}</small>
                        <b>{String(d.getDate()).padStart(2, '0')}</b>
                      </time>
                      <span className={styles.rowMain}>
                        <strong>{a.title}</strong>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.rowLink}>{domainOf(a.url)} <ArrowUpRight size={12} /></a>
                      </span>
                      <SourceBadge job={a} />
                      <span className={styles.rowActions}>
                        <a className={styles.iconBtn} href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${a.title}`} title="Open job post"><ArrowUpRight size={16} /></a>
                        <button className={styles.iconBtn} onClick={() => setEditing(a)} aria-label={`Edit ${a.title}`} title="Edit"><Pencil size={15} /></button>
                        <button className={`${styles.iconBtn} ${styles.iconDanger}`} onClick={() => setDeleting(a)} aria-label={`Delete ${a.title}`} title="Delete"><Trash2 size={15} /></button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      {editing && (
        <JobModal kind="application" job={editing === 'new' ? null : editing} onSave={onSave} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this application?"
          text={`“${deleting.title}” will be removed from your tracker. This can’t be undone.`}
          onConfirm={async () => { if (await onDelete(deleting.id)) setDeleting(null); }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
