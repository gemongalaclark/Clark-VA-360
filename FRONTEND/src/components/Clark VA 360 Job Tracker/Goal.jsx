import { useMemo } from 'react';
import { Check, Flame, Coffee } from 'lucide-react';
import styles from './JobTracker.module.css';
import { isoDay } from './ui';
import { NotifyButton } from './Reminder';
import { DAILY_GOAL, WORKDAYS, countByDay, goalStreak, goalWeek, isRestDay } from './goalRules';

function useGoal(applications, memberSince) {
  return useMemo(() => {
    const counts = countByDay(applications);
    const week = goalWeek(counts, memberSince);
    return {
      week,
      today: counts[isoDay()] ?? 0,
      rest: isRestDay(new Date()),
      streak: goalStreak(counts),
      weekTotal: week.reduce((s, d) => s + d.count, 0),
      daysHit: week.filter(d => d.state === 'done').length,
    };
  }, [applications, memberSince]);
}

function todayText({ today, rest }) {
  if (rest) return 'It’s the weekend, your rest days. The goal starts again on Monday.';
  if (today >= DAILY_GOAL) return today > DAILY_GOAL ? `Goal reached, plus ${today - DAILY_GOAL} extra. Great work today.` : 'Goal reached for today. Great work.';
  if (today === 0) return `Send ${DAILY_GOAL} applications today to hit your goal.`;
  const left = DAILY_GOAL - today;
  return `${left} more application${left > 1 ? 's' : ''} to hit today’s goal.`;
}

/* Today's progress as a ring. */
function Ring({ value, rest }) {
  const r = 44, c = 2 * Math.PI * r;
  const p = Math.min(1, value / DAILY_GOAL);
  const met = value >= DAILY_GOAL;
  return (
    <div className={`${styles.ring} ${met ? styles.ringMet : ''}`} role="img"
      aria-label={rest ? 'Rest day' : `${value} of ${DAILY_GOAL} applications today`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className={styles.ringTrack} />
        {!rest && <circle cx="50" cy="50" r={r} className={styles.ringFill} strokeDasharray={c} strokeDashoffset={c * (1 - p)} />}
      </svg>
      <span className={styles.ringCenter}>
        {rest ? <Coffee size={24} /> : met ? <Check size={26} strokeWidth={3} /> : <><b>{value}</b><small>/ {DAILY_GOAL}</small></>}
      </span>
    </div>
  );
}

/* Overview: today's ring, the Monday–Friday strip and the streak. */
export function GoalCard({ applications, memberSince }) {
  const g = useGoal(applications, memberSince);
  return (
    <section className={`${styles.card} ${styles.goalCard}`} aria-label="Daily goal">
      <div className={styles.goalToday}>
        <Ring value={g.today} rest={g.rest} />
        <div>
          <span className={styles.eyebrow}>Daily goal · {DAILY_GOAL} a day, Mon–Fri</span>
          <h2>{g.rest ? 'Rest day' : g.today >= DAILY_GOAL ? <>Goal <em>reached!</em></> : <>Today: <em>{g.today} of {DAILY_GOAL}</em></>}</h2>
          <p className={styles.muted}>{todayText(g)}</p>
          <NotifyButton />
        </div>
      </div>

      <div className={styles.goalWeek}>
        <div className={styles.goalWeekHead}>
          <span>This week</span>
          <span><b>{g.weekTotal}</b> / {DAILY_GOAL * WORKDAYS} applications · <b>{g.daysHit}</b> / {WORKDAYS} days</span>
        </div>
        <ol className={styles.days}>
          {g.week.map(d => (
            <li key={d.key} className={`${styles.day} ${styles[`day_${d.state}`]}`}
              aria-label={`${d.date.toLocaleDateString('en-US', { weekday: 'long' })}: ${d.count} of ${DAILY_GOAL}${d.state === 'missed' ? ', missed' : d.state === 'done' ? ', goal reached' : ''}`}>
              <small>{d.date.toLocaleDateString('en-US', { weekday: 'short' })}</small>
              <b>{d.state === 'done' ? <Check size={15} strokeWidth={3} /> : d.state === 'upcoming' || d.state === 'before' ? '–' : d.count}</b>
              <span className={styles.dayPips} aria-hidden="true">
                {Array.from({ length: DAILY_GOAL }, (_, i) => <i key={i} className={i < d.count ? styles.pipOn : ''} />)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.goalStreak}>
        <Flame size={20} />
        <b>{g.streak}</b>
        <span>day{g.streak === 1 ? '' : 's'} in a row</span>
      </div>
    </section>
  );
}

/* Job Tracker page: a compact "today" bar above the list. */
export function GoalBar({ applications, memberSince }) {
  const g = useGoal(applications, memberSince);
  const met = g.today >= DAILY_GOAL;
  return (
    <div className={`${styles.goalBar} ${met ? styles.goalBarMet : ''}`} role="status">
      <span className={styles.goalBarLabel}>{g.rest ? <Coffee size={15} /> : met ? <Check size={15} strokeWidth={3} /> : null} Today’s goal</span>
      {!g.rest && (
        <span className={styles.goalBarPips} aria-label={`${g.today} of ${DAILY_GOAL}`}>
          {Array.from({ length: DAILY_GOAL }, (_, i) => <i key={i} className={i < g.today ? styles.pipOn : ''} />)}
          <b>{Math.min(g.today, DAILY_GOAL)}/{DAILY_GOAL}</b>
          {g.today > DAILY_GOAL && <em>+{g.today - DAILY_GOAL}</em>}
        </span>
      )}
      <span className={styles.goalBarText}>{todayText(g)}</span>
      {g.streak > 0 && <span className={styles.goalBarStreak}><Flame size={14} /> {g.streak}-day streak</span>}
    </div>
  );
}
