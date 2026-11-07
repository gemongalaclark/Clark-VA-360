import { useMemo } from 'react';
import { ArrowUpRight, ArrowRight, Send, Bookmark } from 'lucide-react';
import styles from './JobTracker.module.css';
import { SOURCES, SourceBadge, domainOf, fmtDate, isoDay, parseDay, relDay, reqList, sourceName } from './ui';

const WEEKS = 12;

/* Monday of the week containing d. */
function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Overview({ username, memberSince, applications, bookmarks, onNavigate }) {
  const stats = useMemo(() => {
    const today = new Date();
    const thisWeek = weekStart(today);
    const lastWeek = new Date(thisWeek); lastWeek.setDate(lastWeek.getDate() - 7);
    const monthKey = isoDay(today).slice(0, 7);

    /* Applications per week for the last WEEKS weeks, oldest first. */
    const weeks = Array.from({ length: WEEKS }, (_, i) => {
      const start = new Date(thisWeek); start.setDate(start.getDate() - (WEEKS - 1 - i) * 7);
      return { start, count: 0 };
    });
    let week = 0, prevWeek = 0, month = 0;
    const bySource = Object.fromEntries(SOURCES.map(s => [s.id, 0]));
    const otherNames = {};

    for (const a of applications) {
      const d = parseDay(a.applied_on);
      const ws = weekStart(d);
      if (+ws === +thisWeek) week++;
      if (+ws === +lastWeek) prevWeek++;
      if (a.applied_on.startsWith(monthKey)) month++;
      const idx = Math.round((ws - weeks[0].start) / (7 * 86400000));
      if (idx >= 0 && idx < WEEKS) weeks[idx].count++;
      bySource[a.source] = (bySource[a.source] ?? 0) + 1;
      if (a.source === 'other') otherNames[sourceName(a)] = (otherNames[sourceName(a)] ?? 0) + 1;
    }

    const top = SOURCES.reduce((best, s) => (bySource[s.id] > (bySource[best?.id] ?? 0) ? s : best), null);
    const topOther = Object.entries(otherNames).sort((x, y) => y[1] - x[1])[0]?.[0];
    const peak = Math.max(...weeks.map(w => w.count));
    return { week, prevWeek, month, weeks, bySource, top, topOther, peak, max: Math.max(1, peak) };
  }, [applications]);

  const total = applications.length;
  const delta = stats.week - stats.prevWeek;
  const topLabel = stats.top ? (stats.top.id === 'other' && stats.topOther ? stats.topOther : stats.top.label) : '—';
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>{todayLabel}</span>
          <h1>{greeting()}, <em>{username}.</em></h1>
          <p className={styles.muted}>
            {total === 0
              ? 'Your tracker is empty. Log your first application to start the count.'
              : stats.week > 0
                ? `You’ve sent ${stats.week} application${stats.week > 1 ? 's' : ''} this week. Keep the momentum going.`
                : 'No applications yet this week. A good day to send one.'}
          </p>
        </div>
        <div className={styles.headActions}>
          <button className={styles.btnGhost} onClick={() => onNavigate('bookmarks')}><Bookmark size={16} /> Bookmarks</button>
          <button className={styles.btnPrimary} onClick={() => onNavigate('tracker')}><Send size={16} /> Log application</button>
        </div>
      </header>

      {/* Account summary */}
      <section className={styles.statGrid} aria-label="Account summary">
        <div className={`${styles.stat} ${styles.statHero}`}>
          <span className={styles.statLabel}>Total applications</span>
          <strong className={styles.statValue}>{total}</strong>
          <span className={styles.statFoot}>
            {memberSince ? `Tracking since ${new Date(memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'All time'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>This week</span>
          <strong className={styles.statValue}>{stats.week}</strong>
          <span className={styles.statFoot}>
            {delta === 0 ? 'Same as last week' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs last week`}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>This month</span>
          <strong className={styles.statValue}>{stats.month}</strong>
          <span className={styles.statFoot}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Bookmarked</span>
          <strong className={styles.statValue}>{bookmarks.length}</strong>
          <span className={styles.statFoot}>Saved to apply later</span>
        </div>
      </section>

      <div className={styles.overGrid}>
        {/* Weekly activity — a single series, so the title names it and no legend is needed */}
        <section className={`${styles.card} ${styles.activityCard}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Weekly activity</h2>
              <p className={styles.muted}>Applications sent per week, last {WEEKS} weeks</p>
            </div>
            <span className={styles.cardMeta}>Peak <b>{stats.peak}</b></span>
          </div>
          <div className={styles.bars} role="list">
            {stats.weeks.map((w, i) => {
              const label = i === WEEKS - 1 ? 'This week' : `Week of ${fmtDate(isoDay(w.start), { month: 'short', day: 'numeric' })}`;
              const text = `${label}: ${w.count} application${w.count === 1 ? '' : 's'}`;
              return (
                <div key={i} className={styles.barCol} role="listitem" tabIndex={0} aria-label={text}>
                  <span className={styles.barTip}>{text}</span>
                  <span
                    className={`${styles.bar} ${w.count ? '' : styles.barEmpty} ${i === WEEKS - 1 ? styles.barNow : ''}`}
                    style={{ height: w.count ? `${(w.count / stats.max) * 100}%` : undefined }}
                  />
                </div>
              );
            })}
          </div>
          <div className={styles.barAxis} aria-hidden="true">
            <span>{fmtDate(isoDay(stats.weeks[0].start), { month: 'short', day: 'numeric' })}</span>
            <span>{fmtDate(isoDay(stats.weeks[WEEKS / 2].start), { month: 'short', day: 'numeric' })}</span>
            <span>This week</span>
          </div>
        </section>

        {/* Where applications come from */}
        <section className={`${styles.card} ${styles.sourceCard}`}>
          <div className={styles.cardHead}>
            <div>
              <h2>Where you apply</h2>
              <p className={styles.muted}>Top source: <b className={styles.ink}>{topLabel}</b></p>
            </div>
          </div>
          {total === 0 ? (
            <p className={styles.cardEmpty}>Your source mix appears once you log applications.</p>
          ) : (
            <>
              <div className={styles.stack} role="img" aria-label={SOURCES.map(s => `${s.label} ${stats.bySource[s.id]}`).join(', ')}>
                {SOURCES.filter(s => stats.bySource[s.id] > 0).map(s => (
                  <span key={s.id} style={{ flexGrow: stats.bySource[s.id], background: s.color }} title={`${s.label}: ${stats.bySource[s.id]}`} />
                ))}
              </div>
              <ul className={styles.legend}>
                {SOURCES.map(s => (
                  <li key={s.id}>
                    <i style={{ background: s.color }} aria-hidden="true" />
                    <span>{s.label}</span>
                    <b>{stats.bySource[s.id]}</b>
                    <small>{Math.round((stats.bySource[s.id] / total) * 100)}%</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Recent applications */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Recent applications</h2>
            <button className={styles.linkBtn} onClick={() => onNavigate('tracker')}>View all <ArrowRight size={14} /></button>
          </div>
          {applications.length === 0 ? (
            <p className={styles.cardEmpty}>Nothing logged yet.</p>
          ) : (
            <ul className={styles.miniList}>
              {applications.slice(0, 5).map(a => (
                <li key={a.id}>
                  <span className={styles.miniMain}>
                    <strong>{a.title}</strong>
                    <small><SourceBadge job={a} /> · {relDay(a.applied_on)}</small>
                  </span>
                  <a className={styles.iconBtn} href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${a.title} on ${domainOf(a.url)}`} title="Open job post"><ArrowUpRight size={16} /></a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bookmarks waiting */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>Saved for later</h2>
            <button className={styles.linkBtn} onClick={() => onNavigate('bookmarks')}>View all <ArrowRight size={14} /></button>
          </div>
          {bookmarks.length === 0 ? (
            <p className={styles.cardEmpty}>No bookmarks yet.</p>
          ) : (
            <ul className={styles.miniList}>
              {bookmarks.slice(0, 5).map(b => {
                const n = reqList(b.requirements).length;
                return (
                  <li key={b.id}>
                    <span className={styles.miniMain}>
                      <strong>{b.title}</strong>
                      <small><SourceBadge job={b} /> · {n ? `${n} requirement${n > 1 ? 's' : ''}` : 'No requirements listed'}</small>
                    </span>
                    <a className={styles.iconBtn} href={b.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${b.title} on ${domainOf(b.url)}`} title="Open job post"><ArrowUpRight size={16} /></a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
