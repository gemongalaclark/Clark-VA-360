/* Billing-cycle maths for subscriptions. Everything is derived from the schedule and today's
   date, so a cycle resets on its own once the renewal day passes. */

const DAY_MS = 86_400_000;

/* Heads-up window: a yearly renewal needs more warning than a monthly one. */
export const NEARING_DAYS = { monthly: 7, yearly: 30 };

/* A renewal on the 31st (or Feb 29) lands on the last day of shorter months. */
const onDay = (year, month, day) =>
  new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));

const daysBetween = (from, to) => Math.round((to - from) / DAY_MS);

export function billingCycle(sub, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = today.getFullYear();
  const day = Number(sub.renew_day);
  let next, prev;

  if (sub.billing === 'yearly') {
    const month = Number(sub.renew_month) - 1;
    next = onDay(year, month, day);
    if (next < today) next = onDay(year + 1, month, day);
    prev = onDay(next.getFullYear() - 1, month, day);
  } else {
    next = onDay(year, today.getMonth(), day);
    if (next < today) next = onDay(year, today.getMonth() + 1, day);
    prev = onDay(next.getFullYear(), next.getMonth() - 1, day);
  }

  const totalDays = daysBetween(prev, next);
  const daysLeft = daysBetween(today, next);
  return {
    next,
    totalDays,
    daysLeft,
    daysUsed: totalDays - daysLeft,
    nearing: daysLeft <= NEARING_DAYS[sub.billing],
  };
}

/* Real yearly bill: monthly plans × 12 plus yearly plans once. perMonth spreads that over 12. */
export function subscriptionTotals(subs) {
  const perYear = subs.reduce((sum, s) => sum + Number(s.amount) * (s.billing === 'yearly' ? 1 : 12), 0);
  const cents = (v) => Math.round(v * 100) / 100;
  return { perMonth: cents(perYear / 12), perYear: cents(perYear) };
}
