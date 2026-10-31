import { ArrowRight, Landmark, Target, CalendarClock, Plus, Repeat } from 'lucide-react';
import styles from './Balanse.module.css';
import { Meter, Money, peso, pct, num } from './ui';
import { debtRemaining } from './Debts';
import { goalRemaining, monthlyNeeded } from './Goals';
import { renewText } from './Subscriptions';
import { billingCycle, subscriptionTotals } from './blCycle';

/* Next occurrence of a monthly due day (a 31st in a short month falls on its last day). */
function nextDue(day) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const onDay = (y, m) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
  let next = onDay(today.getFullYear(), today.getMonth());
  if (next < today) next = onDay(today.getFullYear(), today.getMonth() + 1);
  return { date: next, inDays: Math.round((next - today) / 86_400_000) };
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const MAX_TILT = 9; // degrees

/* The signature visual: a beam that tips toward whichever side is heavier.
   Left pan = what you owe (ink), right pan = what you've saved (red). */
function Scale({ owed, saved }) {
  const heavier = Math.max(owed, saved);
  const tilt = heavier > 0 ? ((saved - owed) / heavier) * MAX_TILT : 0;
  const drop = Math.sin((tilt * Math.PI) / 180) * 150; // vertical travel of each beam end
  return (
    <svg className={styles.scaleSvg} viewBox="0 0 400 210" aria-hidden="true">
      <path d="M200 40 L200 182" className={styles.scalePost} />
      <path d="M150 196 Q200 172 250 196 Z" className={styles.scaleBase} />
      <g className={styles.scaleBeam} style={{ transform: `rotate(${tilt}deg)` }}>
        <path d="M50 40 H350" />
      </g>
      <circle cx="200" cy="40" r="9" className={styles.scalePivot} />
      <g className={styles.scalePan} style={{ transform: `translateY(${-drop}px)` }}>
        <path d="M50 40 L22 112 M50 40 L78 112" className={styles.scaleString} />
        <path d="M14 112 H86 Q50 146 14 112 Z" className={styles.panDebt} />
      </g>
      <g className={styles.scalePan} style={{ transform: `translateY(${drop}px)` }}>
        <path d="M350 40 L322 112 M350 40 L378 112" className={styles.scaleString} />
        <path d="M314 112 H386 Q350 146 314 112 Z" className={styles.panGoal} />
      </g>
    </svg>
  );
}

function verdict(owed, saved) {
  if (!owed && !saved) return 'Add a debt or a goal to put your money on the scale.';
  const diff = Math.abs(saved - owed);
  if (diff < 1) return 'Perfectly in balanse. Your savings exactly match what you owe.';
  return saved > owed
    ? <>Your savings outweigh your debts by <strong>{peso(diff)}</strong>.</>
    : <>Your debts outweigh your savings by <strong>{peso(diff)}</strong>.</>;
}

export default function Overview({ username, debts, goals, subscriptions, onNavigate }) {
  const owed = debts.reduce((s, d) => s + debtRemaining(d), 0);
  const borrowed = debts.reduce((s, d) => s + num(d.total_amount), 0);
  /* Reached goals live in "Past goals" and no longer count toward savings. */
  const liveGoals = goals.filter(g => goalRemaining(g) > 0);
  const saved = liveGoals.reduce((s, g) => s + num(g.saved_amount), 0);
  const target = liveGoals.reduce((s, g) => s + num(g.target_amount), 0);
  const debtMonthly = debts.filter(d => debtRemaining(d) > 0).reduce((s, d) => s + num(d.monthly_payment), 0);
  const goalMonthly = goals.reduce((s, g) => s + (monthlyNeeded(g) ?? 0), 0);
  const { perMonth: subMonthly, perYear: subYearly } = subscriptionTotals(subscriptions);

  const activeDebts = debts.filter(d => debtRemaining(d) > 0).sort((a, b) => debtRemaining(b) - debtRemaining(a));
  const openGoals = [...liveGoals].sort((a, b) => pct(num(b.saved_amount), num(b.target_amount)) - pct(num(a.saved_amount), num(a.target_amount)));
  const renewals = subscriptions
    .map(s => ({ ...s, cycle: billingCycle(s) }))
    .sort((a, b) => a.cycle.daysLeft - b.cycle.daysLeft);
  /* Debts and subscriptions share one calendar, soonest first. */
  const upcoming = [
    ...activeDebts.filter(d => d.due_day).map(d => {
      const { date, inDays } = nextDue(d.due_day);
      return { key: `debt-${d.id}`, kind: 'Debt', name: d.name, amount: num(d.monthly_payment), date, inDays };
    }),
    ...renewals.map(s => ({
      key: `sub-${s.id}`, kind: 'Subscription', name: s.title, amount: num(s.amount), date: s.cycle.next, inDays: s.cycle.daysLeft,
    })),
  ].sort((a, b) => a.inDays - b.inDays).slice(0, 6);

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>{today}</span>
          <h1>{greeting()}, <em>{username}</em></h1>
        </div>
      </header>

      {/* Hero: the balance scale */}
      <section className={styles.hero} aria-label="Your balance">
        <div className={`${styles.heroSide} ${styles.heroDebt}`}>
          <span className={styles.heroLabel}><i className={styles.keyDebt} /> You owe</span>
          <Money value={owed} className={styles.heroValue} />
          <span className={styles.heroSub}>
            {borrowed > 0 ? `${Math.floor(pct(borrowed - owed, borrowed))}% of ${peso(borrowed)} paid off` : 'No debts tracked'}
          </span>
        </div>
        <div className={styles.heroScale}><Scale owed={owed} saved={saved} /></div>
        <div className={`${styles.heroSide} ${styles.heroGoal}`}>
          <span className={styles.heroLabel}><i className={styles.keyGoal} /> You’ve saved</span>
          <Money value={saved} className={styles.heroValue} />
          <span className={styles.heroSub}>
            {target > 0 ? `${Math.floor(pct(saved, target))}% of ${peso(target)} in goals` : goals.length ? 'All goals reached' : 'No goals yet'}
          </span>
        </div>
        <p className={styles.heroVerdict}>{verdict(owed, saved)}</p>
      </section>

      {/* Supporting figures */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Debt-free progress</span>
          <span className={styles.kpiValue}>{Math.floor(pct(borrowed - owed, borrowed))}<small>%</small></span>
          <Meter value={borrowed - owed} max={borrowed} tone="debt" label="Debt paid off" />
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Goals funded</span>
          <span className={styles.kpiValue}>{Math.floor(pct(saved, target))}<small>%</small></span>
          <Meter value={saved} max={target} tone="goal" label="Goals funded" />
        </div>
        <div className={`${styles.kpi} ${styles.kpiInk}`}>
          <span className={styles.kpiLabel}>Monthly commitments</span>
          <Money value={Math.ceil(debtMonthly + goalMonthly + subMonthly)} className={styles.kpiValue} />
          <span className={styles.kpiSplit}>
            <span><i className={styles.keyDebtLight} /> {peso(debtMonthly)} debts</span>
            <span><i className={styles.keyGoal} /> {peso(Math.ceil(goalMonthly))} goals</span>
            <span><i className={styles.keySubLight} /> {peso(subMonthly)} subscriptions</span>
          </span>
        </div>
      </div>

      {/* Tear-off calendar of upcoming payments */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2><CalendarClock size={17} /> Coming up</h2>
          {upcoming.length > 0 && <span className={styles.muted}>Next {upcoming.length} payment{upcoming.length > 1 ? 's' : ''}</span>}
        </div>
        {upcoming.length === 0 ? (
          <p className={styles.panelEmpty}>Give a debt a due day or add a subscription and it will show up here as a reminder.</p>
        ) : (
          <ul className={styles.calStrip}>
            {upcoming.map(d => (
              <li key={d.key} className={d.inDays <= 3 ? styles.calSoon : ''}>
                <span className={styles.calMonth}>{d.date.toLocaleDateString('en-PH', { month: 'short' })}</span>
                <span className={styles.calDay}>{d.date.getDate()}</span>
                <span className={styles.calName}>{d.name}</span>
                <span className={styles.calKind}>{d.kind}</span>
                <span className={styles.calAmt}>{d.amount > 0 ? peso(d.amount) : '—'}</span>
                <span className={styles.calWhen}>{d.inDays === 0 ? 'Today' : d.inDays === 1 ? 'Tomorrow' : `in ${d.inDays} days`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={styles.panelGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2><Landmark size={17} /> Biggest debts</h2>
            <button className={styles.linkBtn} onClick={() => onNavigate('debts')}>Debt tracker <ArrowRight size={14} /></button>
          </div>
          {activeDebts.length === 0 ? (
            <div className={styles.panelEmpty}>
              {debts.length ? 'Every debt is paid off. Beautiful.' : 'Nothing owed yet.'}
              {!debts.length && <button className={styles.btnSoft} onClick={() => onNavigate('debts')}><Plus size={14} /> Add a debt</button>}
            </div>
          ) : (
            <ul className={styles.progressList}>
              {activeDebts.slice(0, 5).map(d => (
                <li key={d.id}>
                  <div className={styles.progressRow}>
                    <span>{d.name}</span>
                    <span><strong>{peso(debtRemaining(d))}</strong> left</span>
                  </div>
                  <Meter value={num(d.paid_amount)} max={num(d.total_amount)} tone="debt" label={`${d.name} paid`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2><Target size={17} /> Goals</h2>
            <button className={styles.linkBtn} onClick={() => onNavigate('goals')}>All goals <ArrowRight size={14} /></button>
          </div>
          {openGoals.length === 0 ? (
            <div className={styles.panelEmpty}>
              {goals.length ? 'Every goal reached. They’re in Past goals. 🏆' : 'Nothing to save for yet.'}
              <button className={styles.btnSoft} onClick={() => onNavigate('goals')}><Plus size={14} /> Add a goal</button>
            </div>
          ) : (
            <ul className={styles.progressList}>
              {openGoals.slice(0, 5).map(g => (
                <li key={g.id}>
                  <div className={styles.progressRow}>
                    <span>{g.name}</span>
                    <span><strong>{Math.floor(pct(num(g.saved_amount), num(g.target_amount)))}%</strong> of {peso(g.target_amount)}</span>
                  </div>
                  <Meter value={num(g.saved_amount)} max={num(g.target_amount)} tone="goal" done={goalRemaining(g) === 0} label={`${g.name} saved`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${styles.panel} ${styles.panelWide}`}>
          <div className={styles.panelHead}>
            <h2><Repeat size={17} /> Subscriptions</h2>
            <button className={styles.linkBtn} onClick={() => onNavigate('subscriptions')}>All subscriptions <ArrowRight size={14} /></button>
          </div>
          {renewals.length === 0 ? (
            <div className={styles.panelEmpty}>
              Nothing renewing yet.
              <button className={styles.btnSoft} onClick={() => onNavigate('subscriptions')}><Plus size={14} /> Add a subscription</button>
            </div>
          ) : (
            <div className={styles.subOverview}>
              <div className={styles.subTotals}>
                <div>
                  <span>Total per month</span>
                  <Money value={subMonthly} className={styles.subTotalValue} />
                  <small>Yearly plans spread over 12 months</small>
                </div>
                <div>
                  <span>Total per year</span>
                  <Money value={subYearly} className={styles.subTotalValue} />
                  <small>{renewals.length} subscription{renewals.length > 1 ? 's' : ''}</small>
                </div>
              </div>
              <ul className={styles.progressList}>
                {renewals.slice(0, 4).map(s => (
                  <li key={s.id}>
                    <div className={styles.progressRow}>
                      <span>{s.title}</span>
                      <span><strong>{renewText(s.cycle.daysLeft)}</strong></span>
                    </div>
                    <Meter value={s.cycle.daysUsed} max={s.cycle.totalDays} tone={s.cycle.nearing ? 'subSoon' : 'sub'} label={`${s.title} billing cycle used`} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
