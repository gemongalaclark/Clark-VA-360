import { isoDay } from './ui';

/* Daily application goal: DAILY_GOAL applications every Monday–Friday. Saturday and Sunday are rest days.
   A day counts by each application's applied_on date. Everything is derived from the
   applications list, so there is nothing extra to store. */
export const DAILY_GOAL = 5;
export const WORKDAYS = 5;

export const isRestDay = (d) => d.getDay() === 0 || d.getDay() === 6;

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* { 'YYYY-MM-DD': count } */
export function countByDay(applications) {
  const m = {};
  for (const a of applications) m[a.applied_on] = (m[a.applied_on] ?? 0) + 1;
  return m;
}

/* Monday–Friday of the current week (on the weekend: the week that just ended).
   state: done | missed | today | upcoming | before (before the account existed). */
export function goalWeek(counts, memberSince, now = new Date()) {
  const today = startOfDay(now);
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const joined = memberSince ? isoDay(new Date(memberSince)) : null;
  const todayKey = isoDay(today);

  return Array.from({ length: WORKDAYS }, (_, i) => {
    const date = addDays(monday, i);
    const key = isoDay(date);
    const count = counts[key] ?? 0;
    let state;
    if (count >= DAILY_GOAL) state = 'done';
    else if (key === todayKey) state = 'today';
    else if (key > todayKey) state = 'upcoming';
    else if (joined && key < joined) state = 'before';
    else state = 'missed';
    return { key, date, count, state, isToday: key === todayKey };
  });
}

/* Consecutive workdays (weekends skipped) that hit the goal, ending today.
   Today only adds to the streak once it's hit; until then it doesn't break it. */
export function goalStreak(counts, now = new Date()) {
  let d = startOfDay(now);
  let streak = 0;
  for (let i = 0; i < 1000; i++, d = addDays(d, -1)) {
    if (isRestDay(d)) continue;
    if ((counts[isoDay(d)] ?? 0) >= DAILY_GOAL) streak++;
    else if (i > 0) break;          // a missed workday ends it; today is still in progress
  }
  return streak;
}

/* Toast for a newly logged application: celebrate the goal, otherwise show today's progress. */
export function goalMessage(applications, row, isNew) {
  if (!isNew) return null;
  const today = new Date();
  if (row.applied_on !== isoDay(today) || isRestDay(today)) return null;
  const n = applications.filter(a => a.applied_on === row.applied_on).length + 1;
  if (n === DAILY_GOAL) return `🎯 Daily goal reached! ${DAILY_GOAL} applications today. Great work.`;
  if (n < DAILY_GOAL) return `Application added. ${n} of ${DAILY_GOAL} today, ${DAILY_GOAL - n} to go.`;
  return `Application added. ${n} today, ${n - DAILY_GOAL} above your goal.`;
}

/* End-of-day reminder: from REMINDER_HOUR (local time) on a workday, while today's goal isn't met. */
export const REMINDER_HOUR = 18;
export const REMINDER_LABEL = '6 PM';

export const reminderDue = (todayCount, now = new Date()) =>
  !isRestDay(now) && now.getHours() >= REMINDER_HOUR && todayCount < DAILY_GOAL;

export function reminderText(todayCount, now = new Date()) {
  const left = DAILY_GOAL - todayCount;
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return todayCount === 0
    ? `It’s ${time} and you haven’t logged an application today. Send ${DAILY_GOAL} before the day ends to keep your streak.`
    : `It’s ${time} and you’ve sent ${todayCount} of ${DAILY_GOAL} today. ${left} more to hit your goal before the day ends.`;
}
