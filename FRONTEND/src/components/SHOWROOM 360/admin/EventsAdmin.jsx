import { useState } from 'react';
import { CalendarPlus, Pencil, Trash2, Tag, Gift } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { timeLeft } from '../i18n.js';
import { useNav, Link, Sheet, useToast } from '../ui.jsx';
import { eventStatus, canAddEvent } from '../showroomRules.js';

const ORDER = { live: 0, upcoming: 1, ended: 2 };
export const fmtDateTime = (iso) => new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function EventsAdmin({ role }) {
  const { events, deleteEvent } = useShowroom();
  const { now } = useNav();
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);

  const list = events
    .map(ev => ({ ev, status: eventStatus(ev, now) }))
    .sort((x, y) => ORDER[x.status] - ORDER[y.status] || Date.parse(x.ev.startsAt) - Date.parse(y.ev.startsAt));

  return (
    <div className={a.page}>
      <div className={a.pageHead}>
        <h1 className={s.h1}>Events</h1>
        <div className={a.headActions}>
          {/* phones have no Promos tab: it is reached from here (the sidebar has its own link) */}
          <Link to="/showroom/admin/promos" className={`${s.btnGhost} ${a.phoneOnly}`}><Gift size={18} strokeWidth={1.75} aria-hidden="true" />Promos</Link>
          {canAddEvent(role) && (
            <Link to="/showroom/admin/events/new" className={s.btnPrimary}><CalendarPlus size={18} strokeWidth={1.75} aria-hidden="true" />New event</Link>
          )}
        </div>
      </div>
      <p className={`${s.muted} ${a.intro}`}>While an event is live, its cars lead the home carousel and show the sale price with the old price crossed out.</p>

      {list.length === 0 ? (
        <p className={`${s.muted} ${a.emptyLine}`}>No events yet.{canAddEvent(role) && ' Try a Christmas Sale or a Payday Weekend.'}</p>
      ) : (
        <ul className={a.eventList}>
          {list.map(({ ev, status }) => (
            <li key={ev.id} className={a.eventCard}>
              <div className={a.eventTop}>
                <span className={`${a.statusChip} ${a[`status_${status}`]}`}>{status === 'live' ? 'Live' : status === 'upcoming' ? 'Upcoming' : 'Ended'}</span>
                <span className={s.muted}>
                  {status === 'live' && `Ends in ${timeLeft('en', ev.endsAt, now)}`}
                  {status === 'upcoming' && `Starts in ${timeLeft('en', ev.startsAt, now)}`}
                </span>
              </div>
              <h2 className={s.h3}><Tag size={16} aria-hidden="true" className={a.rowIconRed} /> {ev.name}</h2>
              <p className={s.muted}>{fmtDateTime(ev.startsAt)} – {fmtDateTime(ev.endsAt)} · {ev.items.length} car{ev.items.length === 1 ? '' : 's'}</p>
              <div className={a.iconRow}>
                <Link to={`/showroom/admin/events/${ev.id}`} className={s.btnGhost}><Pencil size={16} aria-hidden="true" />Edit</Link>
                <button type="button" className={s.iconBtn} aria-label={`Delete ${ev.name}`} onClick={() => setConfirm(ev)}>
                  <Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Delete this event?">
        {confirm && (
          <div className={s.formGrid}>
            <p><strong>{confirm.name}</strong></p>
            <p className={s.muted}>Its cars go back to their normal prices. The cars themselves are not touched.</p>
            <div className={s.sheetActions}>
              <button type="button" className={s.btnGhost} onClick={() => setConfirm(null)}>Cancel</button>
              <button
                type="button"
                className={`${s.btnPrimary} ${a.danger}`}
                onClick={async () => { const ev = confirm; setConfirm(null); await deleteEvent(ev.id); toast(`“${ev.name}” deleted.`); }}
              >
                Delete event
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
