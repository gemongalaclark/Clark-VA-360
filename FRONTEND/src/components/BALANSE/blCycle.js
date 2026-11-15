/* Billing-cycle maths for subscriptions. Everything is derived from the schedule and today's
   date, so a cycle resets on its own once the renewal day passes. */

const DAY_MS = 86_400_000;

/* Heads-up window: a yearly renewal needs more warning than a monthly one. */
export const NEARING_DAYS = { monthly: 7, yearly: 30 };

/* A renewal on the 31st (or Feb 29) lands on the last day of shorter months. */
export const onDay = (year, month, day) =>
  new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));

const daysBetween = (from, to) => Math.round((to - from) / DAY_MS);

/* There's no payment history, only a running paid_amount, so a debt installment counts as paid
   once paid_amount covers every installment from start_date up to and including the one due
   on `due` (YYYY-MM-DD). Paying early (or ahead) therefore marks the coming due date(s) as paid. */
const cents = (v) => Math.round(Number(v || 0) * 100);
export function installmentPaid(debt, due) {
  const monthly = Number(debt.monthly_payment || 0);
  if (!debt.start_date || !debt.due_day || monthly <= 0) return false;
  const [sy, sm] = debt.start_date.split('-').map(Number);
  const [y, m] = due.split('-').map(Number);
  const firstDue = onDay(sy, sm - 1, Number(debt.due_day));
  const count = (y - sy) * 12 + (m - sm) + (firstDue >= new Date(`${debt.start_date}T00:00:00`) ? 1 : 0);
  return cents(debt.paid_amount) >= Math.min(count * cents(monthly), cents(debt.total_amount));
}

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
