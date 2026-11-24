/* History: every change made in this admin, newest first, grouped by day, with
   who made it and what changed. Superadmin only (the route is guarded in Admin.jsx). */
import { useState } from 'react';
import { CarFront, CalendarRange, Settings as SettingsIcon, Inbox, RotateCcw, History as HistoryIcon, Gift } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, Link } from '../ui.jsx';
import { groupByDay, HISTORY_KINDS, HISTORY_LIMIT } from '../historyRules.js';

const PAGE_SIZE = 50;
const KIND = {
  car: ['Car', CarFront], event: ['Event', CalendarRange], settings: ['Settings', SettingsIcon], promo: ['Promo', Gift],
  lead: ['Lead', Inbox], demo: ['Demo', RotateCcw],
};
const BY = { admin: 'Admin', superadmin: 'Superadmin' };

export const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

/* The time for today's entries, the date for older ones */
export function whenShort(iso, now) {
  const d = new Date(iso);
  return d.toDateString() === now.toDateString() ? timeOf(iso) : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/* Where an entry leads, while its car or event still exists */
function targetPath(e, cars, events) {
  if (e.kind === 'car' && e.targetId && cars.some(c => c.id === e.targetId)) return `/showroom/admin/cars/${e.targetId}`;
  if (e.kind === 'event' && e.targetId && events.some(v => v.id === e.targetId)) return `/showroom/admin/events/${e.targetId}`;
  if (e.kind === 'lead') return '/showroom/admin/leads';
  if (e.kind === 'settings') return '/showroom/admin/settings';
  if (e.kind === 'promo') return '/showroom/admin/promos';
  return null;
}

export default function History() {
  const { history, cars, events } = useShowroom();
  const { now } = useNav();
  const [kind, setKind] = useState('');
  const [shown, setShown] = useState(PAGE_SIZE);
  const list = kind ? history.filter(e => e.kind === kind) : history;
  const groups = groupByDay(list.slice(0, shown), now);

  return (
    <div className={a.page}>
      <div className={a.pageHead}>
        <h1 className={s.h1}>History <span className={a.count}>{history.length}</span></h1>
      </div>
      <p className={`${s.muted} ${a.intro}`}>
        Every change made in this admin, newest first, with who made it. Saved in this browser; the newest {HISTORY_LIMIT} are kept.
      </p>

      <div className={a.tabs} role="group" aria-label="Show changes to">
        {[['', 'All'], ...Object.entries(HISTORY_KINDS)].map(([id, label]) => (
          <button key={id || 'all'} type="button" aria-pressed={kind === id} onClick={() => { setKind(id); setShown(PAGE_SIZE); }}>
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className={`${s.muted} ${a.emptyLine}`}>
          {kind ? 'No changes of this kind yet.' : 'No changes yet. Edits to cars, events, leads and settings show up here with the time.'}
        </p>
      ) : (
        <>
          {groups.map(g => (
            <section key={g.key} className={a.historyDay} aria-labelledby={`hd-${g.key}`}>
              <h2 id={`hd-${g.key}`} className={a.historyDayHead}>{g.label}</h2>
              <ol className={a.historyList}>
                {g.entries.map(e => <HistoryItem key={e.id} entry={e} to={targetPath(e, cars, events)} />)}
              </ol>
            </section>
          ))}
          {list.length > shown && (
            <button type="button" className={`${s.btnGhost} ${a.showMore}`} onClick={() => setShown(n => n + PAGE_SIZE)}>
              Show more ({list.length - shown} older)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function HistoryItem({ entry: e, to }) {
  const [kindLabel, Icon] = KIND[e.kind] || ['Change', HistoryIcon];
  return (
    <li className={a.historyItem}>
      <time className={a.historyTime} dateTime={e.at} title={new Date(e.at).toLocaleString('en-PH')}>{timeOf(e.at)}</time>
      <div className={a.historyBody}>
        <p className={a.historyMeta}>
          <Icon size={14} strokeWidth={2} aria-hidden="true" />
          <span className={`${a.historyKind} ${e.action === 'Deleted' ? a.historyDeleted : ''}`}>{kindLabel} · {e.action}</span>
          {e.by && <span>by {BY[e.by] || e.by}</span>}
        </p>
        <p className={a.historyTitle}>{to ? <Link to={to}>{e.title}</Link> : e.title}</p>
        {e.changes.length > 0 && (
          <dl className={a.changeList}>
            {e.changes.map((c, i) => (
              <div key={`${c.label}-${i}`}>
                <dt>{c.label}</dt>
                <dd>
                  {c.note ? <span className={a.changeNote}>{c.note}</span> : c.from !== undefined ? (
                    <>
                      <span className={a.changeFrom}>{c.from}</span>
                      <span aria-hidden="true"> → </span><span className={s.srOnly}> changed to </span>
                      <span className={a.changeTo}>{c.to}</span>
                    </>
                  ) : <span className={a.changeTo}>{c.to}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}
