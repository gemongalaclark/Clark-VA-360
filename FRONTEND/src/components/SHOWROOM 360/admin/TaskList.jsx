import { Clock, BellRing, Sparkles, TrendingDown, MessageCircle, MessageSquare, Copy, Check } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, useToast, adminSaveError } from '../ui.jsx';
import { carTitle, formatPeso, viberUrl, smsUrl } from '../showroomRules.js';
import { taskMessage, recordContact, applyPriceDrop, skipPriceDrop, waitingFor } from '../autoRules.js';

/* The autopilot's to-do list (dashboard) and one buyer's task (Leads page).
   Sending opens Viber or Messages with the text written; the dealer still presses Send. */

const KIND = {
  reply: { label: 'Reply now', Icon: Clock },
  remind: { label: 'Send reminder', Icon: BellRing },
  wish: { label: 'Waiting buyer', Icon: Sparkles },
  dropped: { label: 'Price dropped', Icon: TrendingDown },
  followup: { label: 'Follow up', Icon: MessageCircle },
  drop: { label: 'Drop price?', Icon: TrendingDown },
};
const TYPE = { 'test-drive': 'Test drive', reserve: 'Reservation', wish: 'Waitlist' };

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

function detail(task, now) {
  const l = task.lead;
  switch (task.kind) {
    case 'reply': return `${TYPE[l.type] || 'Request'} · ${l.type === 'wish' ? l.carLabel : carName(task)} · waiting ${waited(task.minutes)}`;
    case 'remind': return `Test drive ${task.when}${l.slot ? `, ${l.slot}` : ''} · ${carName(task)}`;
    case 'wish': return `Looking for ${l.carLabel}. Now in stock: ${task.items.map(i => `${carTitle(i.car)} at ${formatPeso(i.price)}`).join('; ')}`;
    case 'dropped': return `Asked about the ${carName(task)} · now ${formatPeso(task.price)}, was ${formatPeso(task.was)}`;
    case 'followup': {
      if (task.after) return `Test drive was ${fmtDate(l.date)} · ask how it went`;
      const last = Math.max(Date.parse(l.createdAt) || 0, Date.parse(l.contactedAt) || 0, Date.parse(l.lastContactAt) || 0);
      return `${TYPE[l.type] || 'Request'} · ${carName(task)} · quiet for ${waited(Math.floor((now.getTime() - last) / 6e4))}`;
    }
    case 'drop': return `${task.days} days in stock · ${formatPeso(task.car.price)} → ${formatPeso(task.price)}`;
    default: return '';
  }
}

/* The message and the ways to send it, or Apply/Skip for a price drop */
export function TaskActions({ task }) {
  const { saveLead, saveCar, settings, leads, events } = useShowroom();
  const toast = useToast();

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

  const l = task.lead;
  const text = taskMessage(task, settings, (car) => `${window.location.origin}/showroom/cars/${car.id}`);
  const record = () => saveLead(recordContact(l, task, new Date())).catch(err => toast(adminSaveError(err)));
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
          <p className={a.todoWho}>{task.lead ? task.lead.name : carTitle(task.car)}</p>
          <p className={`${s.muted} ${a.todoWhy}`}>{detail(task, now)}</p>
          <TaskActions task={task} />
        </li>
      ))}
    </ul>
  );
}
