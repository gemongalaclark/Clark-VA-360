import { useMemo, useState } from 'react';
import { Plus, Bookmark, ArrowUpRight, Pencil, Trash2, SearchX } from 'lucide-react';
import styles from './JobTracker.module.css';
import { ConfirmModal, EmptyState, SourceBadge, Toolbar, domainOf, matches, reqList } from './ui';
import JobModal from './JobModal';

/* Bookmarks page: jobs saved for later, each with what the application needs. */
export default function Bookmarks({ bookmarks, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);     // null | 'new' | bookmark
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');

  const shown = useMemo(
    () => bookmarks.filter(b => (source === 'all' || b.source === source) && (matches(b, query.trim()) || String(b.requirements ?? '').toLowerCase().includes(query.trim().toLowerCase()))),
    [bookmarks, query, source],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Bookmarks</span>
          <h1>Saved to <em>apply later</em></h1>
          <p className={styles.muted}>Keep promising jobs here with everything you need to prepare before you apply.</p>
        </div>
        <div className={styles.headActions}>
          <button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Bookmark a job</button>
        </div>
      </header>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          text="Found a job you’ll apply to later? Save it with its requirements so nothing slips."
          action={<button className={styles.btnPrimary} onClick={() => setEditing('new')}><Plus size={16} /> Bookmark your first job</button>}
        />
      ) : (
        <>
          <Toolbar query={query} onQuery={setQuery} source={source} onSource={setSource} items={bookmarks} placeholder="Search title, link, site or requirement…" />

          {shown.length === 0 ? (
            <EmptyState icon={SearchX} title="No matches" text="Try another search or source filter." />
          ) : (
            <div className={styles.bookGrid}>
              {shown.map(b => {
                const reqs = reqList(b.requirements);
                return (
                  <article key={b.id} className={styles.bookCard}>
                    <div className={styles.bookTop}>
                      <SourceBadge job={b} />
                      <span className={styles.bookSaved}>
                        Saved {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h3>{b.title}</h3>
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className={styles.rowLink}>{domainOf(b.url)} <ArrowUpRight size={12} /></a>

                    <div className={styles.reqBlock}>
                      <span className={styles.reqHead}>Requirements <b>{reqs.length}</b></span>
                      {reqs.length ? (
                        <ol className={styles.reqList}>
                          {reqs.map((r, i) => <li key={i}>{r}</li>)}
                        </ol>
                      ) : (
                        <p className={styles.reqNone}>None listed yet.</p>
                      )}
                    </div>

                    <div className={styles.bookActions}>
                      <a className={styles.btnSoft} href={b.url} target="_blank" rel="noopener noreferrer">Open job post <ArrowUpRight size={14} /></a>
                      <span>
                        <button className={styles.iconBtn} onClick={() => setEditing(b)} aria-label={`Edit ${b.title}`} title="Edit"><Pencil size={15} /></button>
                        <button className={`${styles.iconBtn} ${styles.iconDanger}`} onClick={() => setDeleting(b)} aria-label={`Delete ${b.title}`} title="Delete"><Trash2 size={15} /></button>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {editing && (
        <JobModal kind="bookmark" job={editing === 'new' ? null : editing} onSave={onSave} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmModal
          title="Delete this bookmark?"
          text={`“${deleting.title}” will be removed from your bookmarks. This can’t be undone.`}
          onConfirm={async () => { if (await onDelete(deleting.id)) setDeleting(null); }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
