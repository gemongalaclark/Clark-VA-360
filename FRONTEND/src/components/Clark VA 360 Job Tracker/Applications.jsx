import { useEffect, useMemo, useState } from 'react';
import { Share2, Plus, Send, ArrowUpRight, Pencil, Trash2, SearchX, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './JobTracker.module.css';
import { ConfirmModal, EmptyState, SourceBadge, StatusPicker, STATUSES, Toolbar, domainOf, matches, parseDay } from './ui';
import JobModal from './JobModal';
import { GoalBar } from './Goal';
import ShareModal from './Share';

const PAGE_SIZE = 10;

/* Job Tracker page: every job applied to, grouped by month, newest first. */
export default function Applications({ applications, memberSince, openNewAt, onOpenedNew, shareSlug, onSetShare, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);     // null | 'new' | application
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [updating, setUpdating] = useState(null);   // id whose status is being saved
  const [sharing, setSharing] = useState(false);
  const [page, setPage] = useState(1);

  /* The reminder's "Log application" button opens the form straight away. */
  useEffect(() => { if (openNewAt) { setEditing('new'); onOpenedNew(); } }, [openNewAt, onOpenedNew]);

  const setStatus = async (a, status) => {
    setUpdating(a.id);
    const label = STATUSES.find(s => s.id === status).label;
    await onSave({ ...a, status }, status === 'hired' ? `🎉 Congrats! “${a.title}” marked as ${label}.` : `“${a.title}” marked as ${label}.`);
    setUpdating(null);
  };

  const filtered = useMemo(
    () => applications.filter(a => (source === 'all' || a.source === source) && matches(a, query.trim())),
    [applications, query, source]
  );

  /* New search or filter starts back on page 1. */
  useEffect(() => { setPage(1); }, [query, source]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);   // stays valid after deletes

  /* Month groups for the current page; the count shows the month's full total. */
  const groups = useMemo(() => {
    const totals = {};
    for (const a of filtered) { const k = a.applied_on.slice(0, 7); totals[k] = (totals[k] || 0) + 1; }
    const out = [];
    for (const a of filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)) {
      const key = a.applied_on.slice(0, 7);
      if (out.at(-1)?.key !== key) {
        out.push({ key, label: parseDay(a.applied_on).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), total: totals[key], items: [] });
      }
      out.at(-1).items.push(a);
    }
    return out;
  }, [filtered, current]);

  const goTo = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Job Tracker</span>
          <h1>Jobs you’ve <em>applied to</em></h1>
          <p className={styles.muted}>Log each application with its link, the date you applied and where you found it.</p>
        </div>
        <div className={styles.headActions}>
          <button className={styles.btnGhost} onClick={() => setSharing(true)}>
            <Share2 size={16} /> Share {shareSlug && <span className={styles.liveDot} aria-label="(link is on)" />}
          </button>
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
              <h2 className={styles.groupHead}>{g.label} <span>{g.total}</span></h2>
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

          {pageCount > 1 && (
            <nav className={styles.pager} aria-label="Applications pages">
              <button className={styles.btnGhost} disabled={current === 1} onClick={() => goTo(current - 1)}><ChevronLeft size={16} /> Prev</button>
              <span className={styles.pagerInfo}>
                Page <b>{current}</b> of {pageCount} · {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <button className={styles.btnGhost} disabled={current === pageCount} onClick={() => goTo(current + 1)}>Next <ChevronRight size={16} /></button>
            </nav>
          )}
        </>
      )}

      {editing && (
        <JobModal kind="application" job={editing === 'new' ? null : editing} existing={applications} onSave={onSave} onClose={() => setEditing(null)} />
      )}
      {sharing && <ShareModal slug={shareSlug} onSetShare={onSetShare} onClose={() => setSharing(false)} />}
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
