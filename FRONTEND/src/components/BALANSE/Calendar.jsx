import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Flag, Trophy } from 'lucide-react';
import styles from './Balanse.module.css';
import { Money, peso, num } from './ui';
import { debtRemaining } from './Debts';
import { goalRemaining } from './Goals';
import { onDay } from './blCycle';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS = [
  { id: 'debt', label: 'Debts', key: styles.keyDebt },
  { id: 'goal', label: 'Goals', key: styles.keyGoal },
  { id: 'sub', label: 'Subscriptions', key: styles.keySubLight },
];
const KIND_LABEL = { debt: 'Debt', goal: 'Goal', sub: 'Subscription' };
const DAY_MS = 86_400_000;

/* Local YYYY-MM-DD, the same shape as the date columns, so plain string comparison works. */
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const toDate = (s) => new Date(`${s}T00:00:00`);
const inMonth = (dateStr, year, month) => {
  if (!dateStr) return false;
  const [y, m] = dateStr.split('-').map(Number);
  return y === year && m - 1 === month;
};

/* Everything that lands in one month. `amount` is money actually paid that day (debt dues,
   renewals); milestones (debt end dates, goal deadlines) carry a detail line instead. */
function monthEvents(year, month, { debts, goals, subscriptions }) {
  const events = [];
  const add = (dateStr, e) => events.push({ amount: 0, ...e, date: dateStr, day: Number(dateStr.slice(8, 10)) });

  debts.filter(d => debtRemaining(d) > 0).forEach(d => {
    if (d.due_day) {
      const due = ymd(onDay(year, month, Number(d.due_day)));
      if ((!d.start_date || due >= d.start_date) && (!d.end_date || due <= d.end_date)) {
        add(due, { key: `due-${d.id}`, kind: 'debt', name: d.name, what: 'Payment due', amount: num(d.monthly_payment) });
      }
    }
    if (inMonth(d.end_date, year, month)) {
      add(d.end_date, { key: `end-${d.id}`, kind: 'debt', name: d.name, what: 'Paid off by', milestone: true, detail: `${peso(debtRemaining(d))} left` });
    }
  });

  goals.filter(g => goalRemaining(g) > 0 && inMonth(g.target_date, year, month)).forEach(g => {
    add(g.target_date, { key: `goal-${g.id}`, kind: 'goal', name: g.name, what: 'Goal deadline', milestone: true, detail: `${peso(goalRemaining(g))} to go` });
  });

  subscriptions.forEach(s => {
    if (s.billing === 'yearly' && Number(s.renew_month) - 1 !== month) return;
    add(ymd(onDay(year, month, Number(s.renew_day))), {
      key: `sub-${s.id}`, kind: 'sub', name: s.title, what: s.billing === 'yearly' ? 'Yearly renewal' : 'Monthly renewal', amount: num(s.amount),
    });
  });

  return events.sort((a, b) => a.day - b.day || a.kind.localeCompare(b.kind));
}

const sum = (list) => list.reduce((s, e) => s + e.amount, 0);
const whenText = (days) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`);

function Chip({ e }) {
  const cls = { debt: e.milestone ? styles.chipDebtEnd : styles.chipDebt, goal: styles.chipGoal, sub: styles.chipSub }[e.kind];
  const Icon = e.kind === 'goal' ? Trophy : e.milestone ? Flag : null;
  return (
    <span className={`${styles.calChip} ${cls}`} title={`${e.name} · ${e.what}`}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}<span>{e.name}</span>
    </span>
  );
}

export default function Calendar({ debts, goals, subscriptions }) {
  const now = new Date();
  const todayStr = ymd(now);
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(null); // YYYY-MM-DD, or null for the whole month
  const [shown, setShown] = useState({ debt: true, goal: true, sub: true });

  const data = { debts, goals, subscriptions };
  const { year, month } = view;
  const events = monthEvents(year, month, data).filter(e => shown[e.kind]);
  const byDay = {};
  events.forEach(e => { (byDay[e.day] ||= []).push(e); });

  /* Sunday-first weeks, padded with blanks before the 1st and after the last day. */
  const lead = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  /* Soonest item from today on, looking up to a year ahead. */
  let next = null;
  for (let i = 0; i < 13 && !next; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    next = monthEvents(d.getFullYear(), d.getMonth(), data).find(e => shown[e.kind] && e.date >= todayStr) ?? null;
  }
  const nextIn = next && Math.round((toDate(next.date) - toDate(todayStr)) / DAY_MS);

  const shift = (by) => {
    const d = new Date(year, month + by, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(null);
  };
  const goToday = () => { setView({ year: now.getFullYear(), month: now.getMonth() }); setSelected(todayStr); };
  const toggle = (id) => setShown(s => ({ ...s, [id]: !s[id] }));

  const monthLong = new Date(year, month, 1).toLocaleDateString('en-PH', { month: 'long' });
  const listed = selected ? events.filter(e => e.date === selected) : events;
  const listedDays = [...new Set(listed.map(e => e.day))];
  const deadlines = events.filter(e => e.milestone).length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Calendar</span>
          <h1>What’s <em>coming</em> up</h1>
        </div>
      </header>

      <div className={styles.calLayout}>
        <section className={`${styles.panel} ${styles.calPanel}`}>
          <div className={styles.calHead}>
            <h2 className={styles.calTitle}><em>{monthLong}</em> {year}</h2>
            <div className={styles.calNav}>
              <button className={styles.btnSoft} onClick={goToday}>Today</button>
              <button className={styles.iconBtn} onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <button className={styles.iconBtn} onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className={styles.calStats}>
            <div>
              <span>Due this month</span>
              <Money value={sum(events)} className={styles.calStatValue} />
              <small>{events.filter(e => e.amount > 0).length} payment{events.filter(e => e.amount > 0).length === 1 ? '' : 's'}</small>
            </div>
            <div>
              <span>Deadlines</span>
              <strong className={styles.calStatValue}>{deadlines}</strong>
              <small>Debt end dates &amp; goal targets</small>
            </div>
            <div className={styles.calStatNext}>
              <span>Next up</span>
              <strong>{next ? next.name : 'Nothing scheduled'}</strong>
              <small>{next ? `${next.what} · ${whenText(nextIn)}` : 'Add due days, dates or subscriptions'}</small>
            </div>
          </div>

          <div className={styles.calFilters} role="group" aria-label="Show on calendar">
            {KINDS.map(k => (
              <button key={k.id} className={shown[k.id] ? '' : styles.calFilterOff} aria-pressed={shown[k.id]} onClick={() => toggle(k.id)}>
                <i className={k.key} /> {k.label}
              </button>
            ))}
          </div>

          <div key={`${year}-${month}`} className={styles.calGrid}>
            {WEEKDAYS.map(w => <span key={w} className={styles.calWeekday}>{w}</span>)}
            <span className={`${styles.calWeekday} ${styles.calWeekHead}`}>Week</span>
            {weeks.map((week, wi) => {
              const weekItems = week.flatMap(day => (day ? byDay[day] ?? [] : []));
              const isThisWeek = week.some(day => day && ymd(new Date(year, month, day)) === todayStr);
              return [
                ...week.map((day, di) => {
                  if (!day) return <span key={`b-${wi}-${di}`} className={styles.calBlank} />;
                  const dateStr = ymd(new Date(year, month, day));
                  const items = byDay[day] ?? [];
                  const total = sum(items);
                  const isToday = dateStr === todayStr;
                  const cls = [
                    styles.calCell,
                    (di === 0 || di === 6) && styles.calWeekend,
                    isToday && styles.calToday,
                    dateStr === selected && styles.calSelected,
                    dateStr < todayStr && styles.calPast,
                  ].filter(Boolean).join(' ');
                  return (
                    <button
                      key={dateStr}
                      className={cls}
                      onClick={() => setSelected(dateStr === selected ? null : dateStr)}
                      aria-pressed={dateStr === selected}
                      aria-label={`${monthLong} ${day}${items.length ? `, ${items.length} item${items.length > 1 ? 's' : ''}` : ''}`}
                    >
                      <span className={styles.calCellTop}>
                        <span className={styles.calNum}>{day}</span>
                        {isToday && <span className={styles.calTodayTag}>Today</span>}
                      </span>
                      {items.length > 0 && (
                        <span className={styles.calChips}>
                          {items.slice(0, 3).map(e => <Chip key={e.key} e={e} />)}
                          {items.length > 3 && <span className={styles.calMore}>+{items.length - 3} more</span>}
                        </span>
                      )}
                      {total > 0 && <span className={styles.calDayTotal}>{peso(Math.round(total))}</span>}
                    </button>
                  );
                }),
                <span key={`w-${wi}`} className={`${styles.calWeekCell} ${isThisWeek ? styles.calWeekNow : ''}`}>
                  {weekItems.length ? (
                    <>
                      {sum(weekItems) > 0 && <strong>{peso(Math.round(sum(weekItems)))}</strong>}
                      <small>{weekItems.length} item{weekItems.length > 1 ? 's' : ''}</small>
                    </>
                  ) : <small>Clear</small>}
                </span>,
              ];
            })}
          </div>
        </section>

        <aside className={`${styles.panel} ${styles.calAgenda}`} aria-live="polite">
          <div className={styles.calAgendaHead}>
            {selected ? (
              <>
                <span className={styles.calAgendaDay}>{toDate(selected).getDate()}</span>
                <span>
                  <strong>{toDate(selected).toLocaleDateString('en-PH', { weekday: 'long' })}</strong>
                  <small>{toDate(selected).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</small>
                </span>
              </>
            ) : (
              <>
                <span className={styles.calAgendaIcon}><CalendarDays size={20} /></span>
                <span>
                  <strong>All of {monthLong}</strong>
                  <small>{events.length} item{events.length === 1 ? '' : 's'} · pick a day to focus</small>
                </span>
              </>
            )}
          </div>

          {listed.length === 0 ? (
            <p className={styles.panelEmpty}>
              {selected ? 'Nothing due on this day. Enjoy the breather.' : 'Nothing due this month. Give a debt a due day or end date, a goal a target date, or add a subscription.'}
            </p>
          ) : (
            <div className={styles.calAgendaList}>
              {listedDays.map(day => (
                <div key={day} className={styles.calAgendaGroup}>
                  {!selected && (
                    <button className={styles.calAgendaDate} onClick={() => setSelected(ymd(new Date(year, month, day)))}>
                      {new Date(year, month, day).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  )}
                  <ul className={styles.calList}>
                    {listed.filter(e => e.day === day).map(e => (
                      <li key={e.key} className={styles[`calItem_${e.kind}`]}>
                        <span className={styles.calListText}>
                          <strong>{e.name}</strong>
                          <small>{KIND_LABEL[e.kind]} · {e.what}</small>
                        </span>
                        <span className={styles.calListAmt}>{e.amount > 0 ? peso(e.amount) : e.detail ?? '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {sum(listed) > 0 && (
            <div className={styles.calAgendaTotal}>
              <span>{selected ? 'Due this day' : 'Due this month'}</span>
              <Money value={sum(listed)} />
            </div>
          )}
          {selected && <button className={styles.linkBtn} onClick={() => setSelected(null)}>Show all of {monthLong}</button>}
        </aside>
      </div>
    </div>
  );
}
