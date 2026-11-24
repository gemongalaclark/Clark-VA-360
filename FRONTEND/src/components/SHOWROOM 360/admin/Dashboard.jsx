import { Plus, CalendarPlus, Clock, ChevronRight, Tag } from 'lucide-react';
import { whenShort } from './History.jsx';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { timeLeft } from '../i18n.js';
import { useNav, Link, CarPhoto } from '../ui.jsx';
import { liveEvents, daysInStock, AGING_DAYS, carTitle, canAddEvent } from '../showroomRules.js';
import { todoList } from '../autoRules.js';
import TaskList from './TaskList.jsx';
import WeekReport from './WeekReport.jsx';

export default function Dashboard({ role }) {
  const { cars, events, leads, history, settings } = useShowroom();
  const { now } = useNav();

  const available = cars.filter(c => c.status === 'available');
  const reserved = cars.filter(c => c.status === 'reserved');
  const soldThisMonth = cars.filter(c => {
    if (c.status !== 'sold' || !c.soldAt) return false;
    const d = new Date(c.soldAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const inStock = [...available, ...reserved];
  const avgDays = inStock.length ? Math.round(inStock.reduce((n, c) => n + daysInStock(c, now), 0) / inStock.length) : 0;
  const newLeads = leads.filter(l => l.status === 'new');
  const live = liveEvents(events, now);
  const aging = inStock
    .map(c => ({ car: c, days: daysInStock(c, now) }))
    .filter(x => x.days >= AGING_DAYS)
    .sort((x, y) => y.days - x.days)
    .slice(0, 5);
  const tasks = todoList({ leads, cars, events, settings }, now);
  /* the price-drop rule's "Drop price?" tasks replace the aging list */
  const showAging = !settings.priceRule?.on;

  const stats = [
    { label: 'Available', value: available.length, to: '/showroom/admin/cars?status=available' },
    { label: 'Reserved', value: reserved.length, to: '/showroom/admin/cars?status=reserved' },
    { label: 'Sold this month', value: soldThisMonth.length, to: '/showroom/admin/cars?status=sold' },
    { label: 'Avg. days in stock', value: avgDays, to: '/showroom/admin/cars' },
    { label: 'New leads', value: newLeads.length, to: '/showroom/admin/leads', accent: newLeads.length > 0 },
  ];

  return (
    <div className={a.page}>
      <div className={a.pageHead}>
        <h1 className={s.h1}>Dashboard</h1>
        <div className={a.headActions}>
          <Link to="/showroom/admin/cars/new" className={s.btnPrimary}><Plus size={18} aria-hidden="true" />Add car</Link>
          {canAddEvent(role) && (
            <Link to="/showroom/admin/events/new" className={s.btnGhost}><CalendarPlus size={18} strokeWidth={1.75} aria-hidden="true" />New event</Link>
          )}
        </div>
      </div>

      <section className={`${a.block} ${a.todoBlock}`} aria-labelledby="ad-todo">
        <div className={a.blockHead}>
          <h2 id="ad-todo" className={s.h3}>To do</h2>
          <span className={s.muted}>{tasks.length ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : 'Nothing waiting'}</span>
        </div>
        <TaskList tasks={tasks} />
      </section>

      <ul className={a.stats}>
        {stats.map(st => (
          <li key={st.label}>
            <Link to={st.to} className={`${a.stat} ${st.accent ? a.statAccent : ''}`}>
              <span className={a.statValue}>{st.value}</span>
              <span className={a.statLabel}>{st.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className={a.block} aria-labelledby="ad-events">
        <div className={a.blockHead}>
          <h2 id="ad-events" className={s.h3}>Live events</h2>
          <Link to="/showroom/admin/events" className={a.more}>All events<ChevronRight size={16} aria-hidden="true" /></Link>
        </div>
        {live.length === 0 ? (
          <p className={s.muted}>
            No sale is running.
            {canAddEvent(role) && <> <Link to="/showroom/admin/events/new" className={a.inlineLink}>Create one</Link> to put cars on the home carousel with sale prices.</>}
          </p>
        ) : (
          <ul className={a.rows}>
            {live.map(ev => (
              <li key={ev.id}>
                <Link to={`/showroom/admin/events/${ev.id}`} className={a.row}>
                  <Tag size={18} strokeWidth={1.75} aria-hidden="true" className={a.rowIconRed} />
                  <span className={a.rowMain}>
                    <strong>{ev.name}</strong>
                    <span className={s.muted}>{ev.items.length} car{ev.items.length === 1 ? '' : 's'} · ends in {timeLeft('en', ev.endsAt, now)}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className={a.rowChevron} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={showAging ? a.twoCol : undefined}>
        <section className={a.block} aria-labelledby="ad-leads">
          <div className={a.blockHead}>
            <h2 id="ad-leads" className={s.h3}>Latest leads</h2>
            <Link to="/showroom/admin/leads" className={a.more}>All leads<ChevronRight size={16} aria-hidden="true" /></Link>
          </div>
          {leads.length === 0 ? (
            <p className={s.muted}>Test-drive and reservation requests from the car pages land here.</p>
          ) : (
            <ul className={a.rows}>
              {[...leads].sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt)).slice(0, 4).map(l => (
                <li key={l.id}>
                  <Link to="/showroom/admin/leads" className={a.row}>
                    <span className={a.rowMain}>
                      <strong>{l.name} {l.status === 'new' && <span className={a.newDot}>New</span>}</strong>
                      <span className={s.muted}>{l.type === 'test-drive' ? 'Test drive' : l.type === 'wish' ? 'Waitlist' : 'Reservation'} · {l.carLabel}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className={a.rowChevron} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {showAging && <section className={a.block} aria-labelledby="ad-aging">
          <div className={a.blockHead}>
            <h2 id="ad-aging" className={s.h3}>Aging stock</h2>
            <span className={s.muted}>{AGING_DAYS}+ days</span>
          </div>
          {aging.length === 0 ? (
            <p className={s.muted}>Nothing has been in stock for {AGING_DAYS} days or more.</p>
          ) : (
            <ul className={a.rows}>
              {aging.map(({ car, days }) => (
                <li key={car.id}>
                  <Link to={`/showroom/admin/cars/${car.id}`} className={a.row}>
                    <span className={a.rowThumb}><CarPhoto car={car} /></span>
                    <span className={a.rowMain}>
                      <strong>{carTitle(car)}</strong>
                      <span className={s.muted}><Clock size={14} aria-hidden="true" /> {days} days · consider a price drop or an event</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>}
      </div>

      {role === 'superadmin' && <WeekReport />}

      {role === 'superadmin' && (
        <section className={a.block} aria-labelledby="ad-history">
          <div className={a.blockHead}>
            <h2 id="ad-history" className={s.h3}>Recent changes</h2>
            <Link to="/showroom/admin/history" className={a.more}>All history<ChevronRight size={16} aria-hidden="true" /></Link>
          </div>
          {history.length === 0 ? (
            <p className={s.muted}>Changes to cars, events, leads and settings show up here with the time.</p>
          ) : (
            <ul className={a.rows}>
              {history.slice(0, 5).map(e => (
                <li key={e.id}>
                  <Link to="/showroom/admin/history" className={a.row}>
                    <span className={a.rowWhen}>{whenShort(e.at, now)}</span>
                    <span className={a.rowMain}>
                      <strong>{e.title}</strong>
                      <span className={s.muted}>{e.action}{e.by ? ` · by ${e.by === 'superadmin' ? 'Superadmin' : 'Admin'}` : ''}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className={a.rowChevron} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
