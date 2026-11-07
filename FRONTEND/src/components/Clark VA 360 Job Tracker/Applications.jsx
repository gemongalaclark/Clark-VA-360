import { useEffect, useMemo, useState } from 'react';
import { Plus, Send, ArrowUpRight, Pencil, Trash2, SearchX } from 'lucide-react';
import styles from './JobTracker.module.css';
import { ConfirmModal, EmptyState, SourceBadge, StatusPicker, STATUSES, Toolbar, domainOf, matches, parseDay } from './ui';
import JobModal from './JobModal';
import { GoalBar } from './Goal';

/* Job Tracker page: every job applied to, grouped by month, newest first. */
export default function Applications({ applications, memberSince, openNewAt, onOpenedNew, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);     // null | 'new' | application
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [updating, setUpdating] = useState(null);   // id whose status is being saved

  /* The reminder's "Log application" button opens the form straight away. */
  useEffect(() => { if (openNewAt) { setEditing('new'); onOpenedNew(); } }, [openNewAt, onOpenedNew]);

  const setStatus = async (a, status) => {
    setUpdating(a.id);
    const label = STATUSES.find(s => s.id === status).label;
    await onSave({ ...a, status }, status === 'hired' ? `🎉 Congrats! “${a.title}” marked as ${label}.` : `“${a.title}” marked as ${label}.`);
    setUpdating(null);
  };

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

      <GoalBar applications={applications} memberSince={memberSince} />

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
                      <span className={styles.rowMeta}>
                        <SourceBadge job={a} />
                        <StatusPicker value={a.status} title={a.title} disabled={updating === a.id} onChange={(s) => setStatus(a, s)} />
                      </span>
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
