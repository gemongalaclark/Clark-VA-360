import { ArrowRight, Landmark, Target, CalendarClock } from 'lucide-react';
import styles from './Balanse.module.css';
import { Meter, peso, pct, num } from './ui';
import { debtRemaining } from './Debts';
import { goalRemaining, monthlyNeeded } from './Goals';

/* Days until the next occurrence of a monthly due day (a 31st in a short month falls on its last day). */
function daysUntilDue(day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const onDay = (y, m) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
  let next = onDay(today.getFullYear(), today.getMonth());
  if (next < today) next = onDay(today.getFullYear(), today.getMonth() + 1);
  return Math.round((next - today) / 86_400_000);
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Overview({ username, debts, goals, onNavigate }) {
  const owed = debts.reduce((s, d) => s + debtRemaining(d), 0);
  const borrowed = debts.reduce((s, d) => s + num(d.total_amount), 0);
  const saved = goals.reduce((s, g) => s + Math.min(num(g.saved_amount), num(g.target_amount)), 0);
  const target = goals.reduce((s, g) => s + num(g.target_amount), 0);
  const debtMonthly = debts.filter(d => debtRemaining(d) > 0).reduce((s, d) => s + num(d.monthly_payment), 0);
  const goalMonthly = goals.reduce((s, g) => s + (monthlyNeeded(g) ?? 0), 0);

  const activeDebts = debts.filter(d => debtRemaining(d) > 0).sort((a, b) => debtRemaining(b) - debtRemaining(a));
  const activeGoals = [...goals].sort((a, b) => goalRemaining(a) - goalRemaining(b));
  const upcoming = activeDebts
    .filter(d => d.due_day)
    .map(d => ({ ...d, inDays: daysUntilDue(d.due_day) }))
    .sort((a, b) => a.inDays - b.inDays)
    .slice(0, 5);

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1>{greeting()}, {username}</h1>
          <p className={styles.muted}>Here’s where your money stands today.</p>
        </div>
      </header>

      <div className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Total still owed</span>
          <strong className={styles.kpiValue}>{peso(owed)}</strong>
          <span className={styles.kpiSub}>
            {borrowed > 0 ? `${Math.round(pct(borrowed - owed, borrowed))}% of ${peso(borrowed)} paid off` : 'No debts tracked'}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Saved toward goals</span>
          <strong className={styles.kpiValue}>{peso(saved)}</strong>
          <span className={styles.kpiSub}>
            {target > 0 ? `${Math.round(pct(saved, target))}% of ${peso(target)}` : 'No goals yet'}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Monthly commitments</span>
          <strong className={styles.kpiValue}>{peso(Math.ceil(debtMonthly + goalMonthly))}</strong>
          <span className={styles.kpiSub}>{peso(debtMonthly)} debts · {peso(Math.ceil(goalMonthly))} goals</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Net position</span>
          <strong className={styles.kpiValue}>{saved - owed < 0 ? '−' : ''}{peso(Math.abs(saved - owed))}</strong>
          <span className={styles.kpiSub}>Goal savings minus what you owe</span>
        </div>
      </div>

      <div className={styles.panelGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2><Landmark size={17} /> Debts</h2>
            <button className={styles.linkBtn} onClick={() => onNavigate('debts')}>Manage <ArrowRight size={14} /></button>
          </div>
          {activeDebts.length === 0 ? (
            <p className={styles.muted}>{debts.length ? 'Every debt is paid off. 🎉' : 'No debts added yet.'}</p>
          ) : (
            <ul className={styles.progressList}>
              {activeDebts.slice(0, 5).map(d => (
                <li key={d.id}>
                  <div className={styles.progressRow}>
                    <span>{d.name}</span>
                    <span><strong>{peso(debtRemaining(d))}</strong> left</span>
                  </div>
                  <Meter value={num(d.paid_amount)} max={num(d.total_amount)} label={`${d.name} paid`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2><Target size={17} /> Goals</h2>
            <button className={styles.linkBtn} onClick={() => onNavigate('goals')}>Manage <ArrowRight size={14} /></button>
          </div>
          {activeGoals.length === 0 ? (
            <p className={styles.muted}>No goals added yet.</p>
          ) : (
            <ul className={styles.progressList}>
              {activeGoals.slice(0, 5).map(g => (
                <li key={g.id}>
                  <div className={styles.progressRow}>
                    <span>{g.name}</span>
                    <span><strong>{Math.round(pct(num(g.saved_amount), num(g.target_amount)))}%</strong> of {peso(g.target_amount)}</span>
                  </div>
                  <Meter value={num(g.saved_amount)} max={num(g.target_amount)} done={goalRemaining(g) === 0} label={`${g.name} saved`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2><CalendarClock size={17} /> Upcoming payments</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className={styles.muted}>Add a due day to a debt to see it here.</p>
          ) : (
            <ul className={styles.dueList}>
              {upcoming.map(d => (
                <li key={d.id}>
                  <span className={styles.dueWhen}>{d.inDays === 0 ? 'Today' : d.inDays === 1 ? 'Tomorrow' : `In ${d.inDays} days`}</span>
                  <span className={styles.dueName}>{d.name}</span>
                  <strong>{num(d.monthly_payment) > 0 ? peso(d.monthly_payment) : '—'}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
