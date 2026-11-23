import { useState } from 'react';
import { Phone, CalendarCheck, BookmarkCheck, Check } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, Link } from '../ui.jsx';
import { telHref } from '../public/Home.jsx';

const TYPES = [['', 'All'], ['test-drive', 'Test drives'], ['reserve', 'Reservations']];
const STATUSES = [['', 'Any status'], ['new', 'New'], ['contacted', 'Contacted'], ['closed', 'Closed']];
const STATUS_RANK = { new: 0, contacted: 1, closed: 2 };

function ago(iso, now) {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

const fmtDate = (ymd) => {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
};

export default function Leads() {
  const { leads, cars, saveLead } = useShowroom();
  const { now } = useNav();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const list = leads
    .filter(l => (!type || l.type === type) && (!status || l.status === status))
    .sort((x, y) => STATUS_RANK[x.status] - STATUS_RANK[y.status] || Date.parse(y.createdAt) - Date.parse(x.createdAt));
  const newCount = leads.filter(l => l.status === 'new').length;

  return (
    <div className={a.page}>
      <div className={a.pageHead}>
        <h1 className={s.h1}>Leads {newCount > 0 && <span className={a.newDot}>{newCount} new</span>}</h1>
      </div>

      <div className={a.toolbar}>
        <div className={a.tabs} role="group" aria-label="Filter by type">
          {TYPES.map(([id, label]) => (
            <button key={id || 'all'} type="button" aria-pressed={type === id} onClick={() => setType(id)}>{label}</button>
          ))}
        </div>
        <label className={a.inlineSelect}>
          <span className={s.srOnly}>Filter by status</span>
          <select className={s.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map(([id, label]) => <option key={id || 'any'} value={id}>{label}</option>)}
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <p className={`${s.muted} ${a.emptyLine}`}>
          {leads.length === 0
            ? 'No leads yet. When a buyer books a test drive or reserves a car, it shows up here.'
            : 'No leads match these filters.'}
        </p>
      ) : (
        <ul className={a.leadList}>
          {list.map(l => {
            const car = cars.find(c => c.id === l.carId);
            const TypeIcon = l.type === 'test-drive' ? CalendarCheck : BookmarkCheck;
            return (
              <li key={l.id} className={`${a.leadCard} ${l.status === 'new' ? a.leadNew : ''}`}>
                <div className={a.leadTop}>
                  <span className={a.leadType}><TypeIcon size={16} strokeWidth={1.75} aria-hidden="true" />{l.type === 'test-drive' ? 'Test drive' : 'Reservation'}</span>
                  {l.status === 'new' && <span className={a.newDot}>New</span>}
                  <span className={`${s.muted} ${a.leadAgo}`}>{ago(l.createdAt, now)}</span>
                </div>
                <p className={a.leadName}>{l.name}</p>
                <a href={telHref(l.mobile)} className={a.leadPhone}><Phone size={16} strokeWidth={1.75} aria-hidden="true" />{l.mobile}</a>
                <p className={s.muted}>
                  {car ? <Link to={`/showroom/admin/cars/${car.id}`} className={a.inlineLink}>{l.carLabel}</Link> : <>{l.carLabel} <em>(car removed)</em></>}
                </p>
                {l.type === 'test-drive' && l.date && (
                  <p className={a.leadWhen}>{fmtDate(l.date)} · {l.slot === 'morning' ? 'Morning' : 'Afternoon'}</p>
                )}
                {l.note && <p className={a.leadNote}>“{l.note}”</p>}
                <div className={a.leadActions}>
                  <label className={a.inlineSelect}>
                    <span className={s.srOnly}>Status for {l.name}</span>
                    <select className={s.select} value={l.status} onChange={(e) => saveLead({ ...l, status: e.target.value })}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  {l.status === 'new' && (
                    <button type="button" className={s.btnGhost} onClick={() => saveLead({ ...l, status: 'contacted' })}>
                      <Check size={16} aria-hidden="true" />Mark contacted
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
