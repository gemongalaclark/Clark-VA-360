import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowRight, Link2 } from 'lucide-react';
import styles from './JobTracker.module.css';
import { api } from './jtApi';
import { Logo, domainOf, fmtDate, parseDay } from './ui';

/* Public, read-only page behind a share link (/job-tracker/s/<slug>).
   Shows only what jt_public_showcase returns: the username and each application's
   title, link and date applied. */
export default function Showcase({ slug }) {
  const [state, setState] = useState({ phase: 'loading' });   // loading | ready | error

  useEffect(() => {
    let alive = true;
    api.showcase(slug)
      .then(data => alive && setState({ phase: 'ready', ...data }))
      .catch(err => alive && setState({ phase: 'error', message: err.message }));
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (state.phase !== 'ready') return undefined;
    const prev = document.title;
    document.title = `${state.username}’s job applications · Clark VA 360`;
    return () => { document.title = prev; };
  }, [state.phase, state.username]);

  const groups = useMemo(() => {
    const out = [];
    for (const a of state.applications ?? []) {
      const key = a.applied_on.slice(0, 7);
      if (out.at(-1)?.key !== key) out.push({ key, label: parseDay(a.applied_on).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), items: [] });
      out.at(-1).items.push(a);
    }
    return out;
  }, [state.applications]);

  const apps = state.applications ?? [];
  const since = apps.length ? apps[apps.length - 1].applied_on : null;

  return (
    <div className={styles.root}>
      <header className={styles.showTop}>
        <span className={styles.brand}>
          <Logo size={34} />
          <span><strong>Clark VA 360</strong><small>Job Tracker</small></span>
        </span>
        <a className={styles.btnGhost} href="/job-tracker">Track your own job hunt <ArrowRight size={15} /></a>
      </header>

      <main className={styles.showMain}>
        {state.phase === 'loading' && (
          <div className={styles.loading} style={{ minHeight: '50vh' }}><span className={styles.loadingBar}><i /></span></div>
        )}

        {state.phase === 'error' && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><Link2 size={24} /></span>
            <h3>This link isn’t available</h3>
            <p>{state.message}</p>
            <a className={styles.btnPrimary} href="/job-tracker">Go to the Job Tracker</a>
          </div>
        )}

        {state.phase === 'ready' && (
          <div className={styles.page}>
            <div className={styles.showHero}>
              <span className={styles.eyebrow}>Job hunt showcase</span>
              <h1><span className={styles.showName}>{state.username}’s</span> <em>applications</em></h1>
              <div className={styles.showMeta}>
                <span><b>{apps.length}</b> job{apps.length === 1 ? '' : 's'} applied</span>
                {since && <span>since <b>{fmtDate(since)}</b></span>}
              </div>
            </div>

            {apps.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><Link2 size={24} /></span>
                <h3>No applications yet</h3>
                <p>Check back soon.</p>
              </div>
            ) : groups.map(g => (
              <section key={g.key} className={styles.group}>
                <h2 className={styles.groupHead}>{g.label} <span>{g.items.length}</span></h2>
                <ul className={styles.rows}>
                  {g.items.map((a, i) => {
                    const d = parseDay(a.applied_on);
                    return (
                      <li key={`${a.url}-${i}`} className={`${styles.row} ${styles.showRow}`}>
                        <time className={styles.dateStamp} dateTime={a.applied_on}>
                          <small>{d.toLocaleDateString('en-US', { month: 'short' })}</small>
                          <b>{String(d.getDate()).padStart(2, '0')}</b>
                        </time>
                        <span className={styles.rowMain}>
                          <strong>{a.title}</strong>
                          <span className={styles.showApplied}>Applied {fmtDate(a.applied_on, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </span>
                        <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className={styles.btnSoft}>
                          {domainOf(a.url)} <ArrowUpRight size={14} />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            <p className={styles.showFoot}>Tracked with <strong>Clark VA 360 Job Tracker</strong></p>
          </div>
        )}
      </main>
    </div>
  );
}
