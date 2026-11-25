import { useState } from 'react';
import { Phone, CalendarCheck, BookmarkCheck, BellRing, Check, Repeat } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, Link } from '../ui.jsx';
import { telHref } from '../public/Home.jsx';
import { carTitle, formatPeso, formatKm, effectivePrice } from '../showroomRules.js';
import { todoList, withStatus, wishMatches } from '../autoRules.js';
import { TaskTag, TaskActions } from './TaskList.jsx';

const TYPES = [['', 'All'], ['test-drive', 'Test drives'], ['reserve', 'Reservations'], ['wish', 'Waitlist'], ['trade-in', 'Trade-ins']];
const TYPE_LABEL = { 'test-drive': 'Test drive', reserve: 'Reservation', wish: 'Waitlist', 'trade-in': 'Trade-in' };
const TYPE_ICON = { 'test-drive': CalendarCheck, reserve: BookmarkCheck, wish: BellRing, 'trade-in': Repeat };
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
  const { leads, cars, events, settings, agents, saveLead } = useShowroom();
  const { now } = useNav();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const list = leads
    .filter(l => (!type || l.type === type) && (!status || l.status === status))
    .sort((x, y) => STATUS_RANK[x.status] - STATUS_RANK[y.status] || Date.parse(y.createdAt) - Date.parse(x.createdAt));
  const newCount = leads.filter(l => l.status === 'new').length;
  const tasks = todoList({ leads, cars, events, settings, agents }, now);
  const changeStatus = (l, next) => saveLead(withStatus(l, next, new Date()));

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
            ? 'No leads yet. When a buyer books a test drive, reserves a car, joins the waitlist or offers a trade-in, it shows up here.'
            : 'No leads match these filters.'}
        </p>
      ) : (
        <ul className={a.leadList}>
          {list.map(l => {
            const car = cars.find(c => c.id === l.carId);
            const TypeIcon = TYPE_ICON[l.type] || BookmarkCheck;
            const task = tasks.find(x => x.lead?.id === l.id);
            const matches = l.type === 'wish' && l.status !== 'closed' ? wishMatches(l, cars, events, now) : [];
            return (
              <li key={l.id} className={`${a.leadCard} ${l.status === 'new' ? a.leadNew : ''}`}>
                <div className={a.leadTop}>
                  <span className={a.leadType}><TypeIcon size={16} strokeWidth={1.75} aria-hidden="true" />{TYPE_LABEL[l.type] || 'Request'}</span>
                  {l.status === 'new' && <span className={a.newDot}>New</span>}
                  {l.agentCode && <span className={a.daysChip}>via {agents.find(ag => ag.code === l.agentCode)?.name || l.agentCode}</span>}
                  <span className={`${s.muted} ${a.leadAgo}`}>{ago(l.createdAt, now)}</span>
                </div>
                <p className={a.leadName}>{l.name}</p>
                <a href={telHref(l.mobile)} className={a.leadPhone}><Phone size={16} strokeWidth={1.75} aria-hidden="true" />{l.mobile}</a>
                {l.type === 'wish' ? (
                  <>
                    <p className={s.muted}>Looking for <strong className={a.leadWish}>{l.carLabel}</strong></p>
                    {matches.length > 0 && (
                      <p className={s.muted}>
                        In stock now:{' '}
                        {matches.slice(0, 3).map((c, k) => (
                          <span key={c.id}>{k > 0 && ', '}<Link to={`/showroom/admin/cars/${c.id}`} className={a.inlineLink}>{carTitle(c)}</Link> ({formatPeso(effectivePrice(c, events, now).price)})</span>
                        ))}
                        {matches.length > 3 && ` and ${matches.length - 3} more`}
                      </p>
                    )}
                  </>
                ) : l.type === 'trade-in' ? (
                  <>
                    <p className={s.muted}>
                      Selling <strong className={a.leadWish}>{l.tradeIn?.car}</strong>
                      {l.tradeIn?.km ? ` · ${formatKm(l.tradeIn.km)}` : ''}
                      {l.tradeIn?.asking ? ` · asking ${formatPeso(l.tradeIn.asking)}` : ''}
                    </p>
                    {l.carId && (
                      <p className={s.muted}>
                        Toward {car ? <Link to={`/showroom/admin/cars/${car.id}`} className={a.inlineLink}>{l.carLabel}</Link> : <>{l.carLabel} <em>(car removed)</em></>}
                      </p>
                    )}
                  </>
                ) : (
                  <p className={s.muted}>
                    {car ? <Link to={`/showroom/admin/cars/${car.id}`} className={a.inlineLink}>{l.carLabel}</Link> : <>{l.carLabel} <em>(car removed)</em></>}
                  </p>
                )}
                {l.type === 'test-drive' && l.date && (
                  <p className={a.leadWhen}>{fmtDate(l.date)} · {l.slot === 'morning' ? 'Morning' : 'Afternoon'}</p>
                )}
                {l.budget?.max > 0 && (
                  <p className={s.muted}>
                    Can afford up to <strong className={a.leadWish}>{formatPeso(l.budget.max)}</strong>
                    {car && effectivePrice(car, events, now).price > l.budget.max ? ' · below this car’s price' : ''}
                    {' '}(pay {formatPeso(l.budget.income)}/mo, cash {formatPeso(l.budget.cash)})
                  </p>
                )}
                {l.note && <p className={a.leadNote}>“{l.note}”</p>}
                {task && (
                  <div className={a.leadTask}>
                    <TaskTag task={task} />
                    <TaskActions task={task} />
                  </div>
                )}
                <div className={a.leadActions}>
                  <label className={a.inlineSelect}>
                    <span className={s.srOnly}>Status for {l.name}</span>
                    <select className={s.select} value={l.status} onChange={(e) => changeStatus(l, e.target.value)}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  {l.status === 'new' && (
                    <button type="button" className={s.btnGhost} onClick={() => changeStatus(l, 'contacted')}>
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
