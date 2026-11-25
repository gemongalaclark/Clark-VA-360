import { Clock, BellRing, Sparkles, TrendingDown, MessageCircle, MessageSquare, Copy, Check, FileCheck, CalendarClock, Hourglass, Banknote } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, useToast, adminSaveError, Link } from '../ui.jsx';
import { carTitle, formatPeso, viberUrl, smsUrl, PAPER_STEPS, reservedUntilFor, DEFAULT_RESERVATION } from '../showroomRules.js';
import { taskMessage, recordContact, recordCarTask, markPaid, applyPriceDrop, skipPriceDrop, waitingFor } from '../autoRules.js';
import { localISODate } from '../public/LeadForm.jsx';

/* The autopilot's to-do list (dashboard) and one buyer's task (Leads page).
   Sending opens Viber or Messages with the text written; the dealer still presses Send. */

const KIND = {
  reply: { label: 'Reply now', Icon: Clock },
  remind: { label: 'Send reminder', Icon: BellRing },
  wish: { label: 'Waiting buyer', Icon: Sparkles },
  dropped: { label: 'Price dropped', Icon: TrendingDown },
  followup: { label: 'Follow up', Icon: MessageCircle },
  drop: { label: 'Drop price?', Icon: TrendingDown },
  papers: { label: 'Update the buyer', Icon: FileCheck },
  renew: { label: 'Renewal reminder', Icon: CalendarClock },
  reserveEnds: { label: 'Reservation ends', Icon: Hourglass },
  payout: { label: 'Pay the owner', Icon: Banknote },
  commission: { label: 'Pay the agent', Icon: Banknote },
};
const STEP_LABEL = Object.fromEntries(PAPER_STEPS);
const monthOf = (ym) => { const [y, m] = String(ym).split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }); };
const TYPE = { 'test-drive': 'Test drive', reserve: 'Reservation', wish: 'Waitlist', 'trade-in': 'Trade-in' };

const waited = (min) => {
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
};
const fmtDate = (ymd) => {
  const [y, m, d] = String(ymd || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
};
const carName = (task) => (task.car ? carTitle(task.car) : String(task.lead?.carLabel || '').replace(/\s*\([^)]*\)\s*$/, ''));
/* what a request is about: the search, the car being traded in, or the car asked about */
const about = (task) => {
  const l = task.lead;
  if (l.type === 'wish') return l.carLabel;
  if (l.type === 'trade-in') return `${l.tradeIn?.car || 'their car'}${task.car ? ` toward the ${carTitle(task.car)}` : ''}`;
  return carName(task);
};

function detail(task, now) {
  const l = task.lead;
  switch (task.kind) {
    case 'reply': return `${TYPE[l.type] || 'Request'} · ${about(task)} · waiting ${waited(task.minutes)}`;
    case 'remind': return `Test drive ${task.when}${l.slot ? `, ${l.slot}` : ''} · ${carName(task)}`;
    case 'wish': return `Looking for ${l.carLabel}. Now in stock: ${task.items.map(i => `${carTitle(i.car)} at ${formatPeso(i.price)}`).join('; ')}`;
    case 'dropped': return `Asked about the ${carName(task)} · now ${formatPeso(task.price)}, was ${formatPeso(task.was)}`;
    case 'followup': {
      if (task.after) return `Test drive was ${fmtDate(l.date)} · ask how it went`;
      const last = Math.max(Date.parse(l.createdAt) || 0, Date.parse(l.contactedAt) || 0, Date.parse(l.lastContactAt) || 0);
      return `${TYPE[l.type] || 'Request'} · ${about(task)} · quiet for ${waited(Math.floor((now.getTime() - last) / 6e4))}`;
    }
    case 'drop': return `${task.days} days in stock · ${formatPeso(task.car.price)} → ${formatPeso(task.price)}`;
    case 'papers': return `${STEP_LABEL[task.step]} · ${carTitle(task.car)}`;
    case 'renew': return `Registration due ${monthOf(task.car.regUntil)} · ${carTitle(task.car)}`;
    case 'reserveEnds': return `Reserved until ${fmtDate(task.until)} · close the sale or extend it`;
    case 'payout': return `Sold · ${task.car.consign.owner} gets ${formatPeso(task.car.consign.net)}`;
    case 'commission': return `${task.agent?.name || 'A removed agent'} · ${formatPeso(task.car.sale.commission)} for this sale`;
    default: return '';
  }
}

/* The message and the ways to send it, Apply/Skip for a price drop, Mark paid for
   money owed, Extend for a reservation running out */
export function TaskActions({ task }) {
  const { saveLead, saveCar, settings, leads, events } = useShowroom();
  const toast = useToast();

  if (task.kind === 'payout' || task.kind === 'commission') {
    const paid = async () => {
      try {
        await saveCar(markPaid(task.car, task.kind, new Date()));
        toast(task.kind === 'payout' ? `Marked paid to ${task.car.consign.owner}.` : `Commission marked paid${task.agent ? ` to ${task.agent.name}` : ''}.`);
      } catch (err) { toast(adminSaveError(err)); }
    };
    return (
      <div className={a.todoActions}>
        <button type="button" className={s.btnGhost} onClick={paid}><Check size={18} aria-hidden="true" />Mark paid</button>
        <Link to={`/showroom/admin/cars/${task.car.id}`} className={s.textBtn}>Open car</Link>
      </div>
    );
  }
  if (task.kind === 'reserveEnds') {
    const days = (settings.reservation || DEFAULT_RESERVATION).days;
    const extend = async () => {
      const today = localISODate();
      const until = reservedUntilFor(task.until < today ? today : task.until, days);
      try {
        await saveCar({ ...task.car, reservedUntil: until });
        toast(`${task.car.stockNo} held until ${fmtDate(until)}.`);
      } catch (err) { toast(adminSaveError(err)); }
    };
    return (
      <div className={a.todoActions}>
        <button type="button" className={s.btnGhost} onClick={extend}><Hourglass size={18} aria-hidden="true" />Extend {days} days</button>
        <Link to={`/showroom/admin/cars/${task.car.id}`} className={s.textBtn}>Open car</Link>
      </div>
    );
  }

  if (task.kind === 'drop') {
    const apply = async () => {
      try {
        const next = applyPriceDrop(task.car, task.price, new Date());
        await saveCar(next);
        const n = waitingFor(next, leads, events, new Date()).length;
        toast(`${carTitle(task.car)} is now ${formatPeso(task.price)}.${n ? ` ${n} waiting buyer${n === 1 ? '' : 's'} added to your to-do list.` : ''}`);
      } catch (err) { toast(adminSaveError(err)); }
    };
    const skip = async () => {
      try {
        await saveCar(skipPriceDrop(task.car, new Date()));
        toast(`Skipped. Suggested again in ${settings.priceRule?.days || 45} days.`);
      } catch (err) { toast(adminSaveError(err)); }
    };
    return (
      <div className={a.todoActions}>
        <button type="button" className={s.btnGhost} onClick={apply}><Check size={18} aria-hidden="true" />Drop to {formatPeso(task.price)}</button>
        <button type="button" className={s.textBtn} onClick={skip}>Skip</button>
      </div>
    );
  }

  /* a buyer's request, or the buyer of a sold car (papers, renewal) */
  const l = task.to || task.lead;
  const text = taskMessage(task, settings, (car) => `${window.location.origin}/showroom/cars/${car.id}`);
  const record = () => (task.lead
    ? saveLead(recordContact(task.lead, task, new Date()))
    : saveCar(recordCarTask(task.car, task, new Date()))).catch(err => toast(adminSaveError(err)));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Message for ${l.name} copied.`);
      record();
    } catch {
      toast('Could not copy. Open “See message” and copy it from there.');
    }
  };

  return (
    <>
      <details className={a.todoMsg}>
        <summary>See message{l.lang === 'ceb' ? ' (Bisaya)' : ''}</summary>
        <p>{text}</p>
      </details>
      <div className={a.todoActions}>
        <a href={viberUrl(l.mobile, text)} className={s.btnGhost} onClick={record}><MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />Viber</a>
        <a href={smsUrl(l.mobile, text)} className={s.btnGhost} onClick={record}><MessageSquare size={18} strokeWidth={1.75} aria-hidden="true" />Text</a>
        <button type="button" className={s.btnGhost} onClick={copy}><Copy size={18} strokeWidth={1.75} aria-hidden="true" />Copy</button>
      </div>
    </>
  );
}

/* The tag on a task: red when a buyer has waited too long */
export function TaskTag({ task }) {
  const { label, Icon } = KIND[task.kind];
  return (
    <span className={`${a.todoTag} ${task.kind === 'reply' ? a.todoUrgent : ''}`}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />{label}
    </span>
  );
}

export default function TaskList({ tasks }) {
  const { now } = useNav();
  if (!tasks.length) {
    return <p className={`${s.muted} ${a.emptyLine}`}>All caught up. New tasks show up here as buyers write in and cars age.</p>;
  }
  return (
    <ul className={a.todo}>
      {tasks.map(task => (
        <li key={task.key} className={a.todoItem}>
          <TaskTag task={task} />
          <p className={a.todoWho}>{task.to?.name || task.lead?.name || carTitle(task.car)}</p>
          <p className={`${s.muted} ${a.todoWhy}`}>{detail(task, now)}</p>
          <TaskActions task={task} />
        </li>
      ))}
    </ul>
  );
}
