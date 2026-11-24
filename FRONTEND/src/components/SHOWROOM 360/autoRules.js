/* Autopilot: the admin's to-do list, worked out from the saved data whenever the
   admin is open (there is no server, so nothing runs while it is closed and nothing
   is sent by itself: each task comes with its message already written).
   Pure functions; the pages save the results through the store, so History logs them.
   A task: { kind, key, lead?, car?, items?, price?, was?, minutes?, when?, after? }
   Kinds, most urgent first: reply, remind, wish, dropped, followup, drop. */
import {
  BODY_TYPES, TRANSMISSIONS, FUELS, carTitle, formatPeso, filterCars, effectivePrice, eventStatus, daysInStock,
} from './showroomRules.js';
import { t } from './i18n.js';

export const REPLY_AFTER_MIN = 60;
export const FOLLOW_UP_DAYS = 3;
const KIND_ORDER = ['reply', 'remind', 'wish', 'dropped', 'followup', 'drop'];
const MIN = 6e4;
const DAY = 864e5;
/* a wish message lists at most this many new arrivals */
const WISH_ITEMS = 3;

const ms = (iso) => { const v = Date.parse(iso); return Number.isFinite(v) ? v : 0; };
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOf = (ymd) => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(y, m - 1, d); };
/* the latest time we heard from or wrote to the buyer (old leads only have createdAt) */
const lastContact = (lead) => Math.max(ms(lead.createdAt), ms(lead.contactedAt), ms(lead.lastContactAt));

/* ── waitlist ── */

/* "SUV · Toyota · up to ₱900,000": a saved search in words */
export function describeQuery(query, lang) {
  const q = query || {};
  const parts = [];
  if (q.q) parts.push(`“${q.q}”`);
  if (q.make) parts.push(q.make);
  if (q.body) parts.push(BODY_TYPES[q.body] || q.body);
  if (q.transmission) parts.push(TRANSMISSIONS[q.transmission] || q.transmission);
  if (q.fuel) parts.push(FUELS[q.fuel] || q.fuel);
  if (q.priceMin && q.priceMax) parts.push(`${formatPeso(q.priceMin)}–${formatPeso(q.priceMax)}`);
  else if (q.priceMax) parts.push(t(lang, 'wish.upTo', { amount: formatPeso(q.priceMax) }));
  else if (q.priceMin) parts.push(t(lang, 'wish.from', { amount: formatPeso(q.priceMin) }));
  if (q.yearMin && q.yearMax) parts.push(`${q.yearMin}–${q.yearMax}`);
  else if (q.yearMin) parts.push(t(lang, 'wish.yearFrom', { year: q.yearMin }));
  else if (q.yearMax) parts.push(t(lang, 'wish.yearTo', { year: q.yearMax }));
  if (q.onSale) parts.push(t(lang, 'wish.onSale'));
  return parts.length ? parts.join(' · ') : t(lang, 'wish.any');
}

/* Cars a buyer could have now: available (not reserved or sold) and passing their search, newest first */
export const wishMatches = (wish, cars, events, now) =>
  filterCars(cars.filter(c => c.status === 'available'), wish.query || {}, events, now);

/* Open waitlist requests this car matches that haven't been told about it */
export const waitingFor = (car, leads, events, now) =>
  car.status !== 'available' ? [] : leads.filter(l => l.type === 'wish' && l.status !== 'closed'
    && !(l.notifiedCarIds || []).includes(car.id) && filterCars([car], l.query || {}, events, now).length > 0);

/* A sold or reserved car's "similar one" search: same body and make, up to 10% above
   its price (rounded up to ₱10,000). The buyer can change any of it in the form. */
export function similarQuery(car, price) {
  const q = {};
  if (car.make) q.make = car.make;
  if (car.body) q.body = car.body;
  q.priceMax = Math.ceil((Number(price) * 1.1) / 10000) * 10000;
  return q;
}

/* The waitlist form edits a few fields of the search the buyer came with (keyword, make,
   body type, budget) and keeps the rest of their filters. Blank fields are dropped. */
export function mergeWishQuery(base, fields) {
  const out = { ...(base || {}) };
  delete out.sort;
  for (const k of ['q', 'make', 'body']) {
    const v = String(fields[k] ?? '').trim();
    if (v) out[k] = v; else delete out[k];
  }
  const max = Number(String(fields.priceMax ?? '').replace(/\D/g, ''));
  if (max > 0) out.priceMax = max; else delete out.priceMax;
  if (out.priceMin && out.priceMax && out.priceMin > out.priceMax) delete out.priceMin;
  return out;
}

/* ── price drops ── */

/* pct off, rounded down to the thousand (dealers price in round numbers) */
export const suggestedDropPrice = (price, pct) => Math.floor((Number(price) * (1 - Number(pct) / 100)) / 1000) * 1000;

/* Available cars that have waited the rule's days since they were listed, last dropped or
   last skipped, and that no live or upcoming sale includes. Longest in stock first. */
export function priceDropsDue(cars, events, rule, now) {
  if (!rule?.on) return [];
  const inSale = (car) => events.some(e => eventStatus(e, now) !== 'ended' && e.items.some(i => i.carId === car.id));
  return cars
    .filter(c => c.status === 'available' && !inSale(c))
    .map(car => {
      const since = Math.max(ms(car.listedAt), ms(car.priceDrop?.at), ms(car.priceDropSkippedAt));
      const price = suggestedDropPrice(car.price, rule.pct);
      const due = Math.floor((now.getTime() - since) / DAY) >= rule.days && price > 0 && price < car.price;
      return due ? { car, price, days: daysInStock(car, now) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.days - a.days);
}

export const applyPriceDrop = (car, price, now) =>
  ({ ...car, price, priceDrop: { from: car.price, at: now.toISOString() } });

export const skipPriceDrop = (car, now) => ({ ...car, priceDropSkippedAt: now.toISOString() });

/* ── the to-do list ── */

/* One task per buyer at most: a new car or a price drop says more than a plain reply */
function leadTask(lead, { cars, events }, now) {
  const car = cars.find(c => c.id === lead.carId) || null;
  const last = lastContact(lead);
  const today = localDate(now);

  if (lead.type === 'wish') {
    const told = lead.notifiedCarIds || [];
    const items = wishMatches(lead, cars, events, now)
      .filter(c => !told.includes(c.id))
      .slice(0, WISH_ITEMS)
      .map(c => ({ car: c, price: effectivePrice(c, events, now).price }));
    if (items.length) return { kind: 'wish', lead, items };
  } else if (car && car.status !== 'sold') {
    const drop = car.priceDrop;
    if (drop && Number(drop.from) > car.price && ms(drop.at) > last) {
      return { kind: 'dropped', lead, car, price: effectivePrice(car, events, now).price, was: Number(drop.from) };
    }
  }

  if (lead.status === 'new') {
    const minutes = Math.floor((now.getTime() - ms(lead.createdAt)) / MIN);
    return minutes >= REPLY_AFTER_MIN ? { kind: 'reply', lead, car, minutes } : null;
  }
  if (lead.status !== 'contacted' || lead.type === 'wish') return null;

  if (lead.type === 'test-drive' && lead.date) {
    const tomorrow = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    if (!lead.reminderSentAt && (lead.date === today || lead.date === tomorrow)) {
      return { kind: 'remind', lead, car, when: lead.date === today ? 'today' : 'tomorrow' };
    }
    /* the day after the test drive: ask how it went, unless we already have */
    const dayAfter = dateOf(lead.date).getTime() + DAY;
    if (lead.date < today && last < dayAfter) return { kind: 'followup', lead, car, after: true };
    return null;
  }
  return now.getTime() - last >= FOLLOW_UP_DAYS * DAY ? { kind: 'followup', lead, car, after: false } : null;
}

export function todoList({ leads = [], cars = [], events = [], settings }, now) {
  const tasks = leads
    .filter(l => l.status !== 'closed')
    .map(l => leadTask(l, { cars, events }, now))
    .filter(Boolean)
    .map(x => ({ ...x, key: `${x.kind}:${x.lead.id}` }));
  const drops = priceDropsDue(cars, events, settings?.priceRule, now)
    .map(d => ({ kind: 'drop', key: `drop:${d.car.id}`, car: d.car, price: d.price, days: d.days }));
  const rank = (x) => KIND_ORDER.indexOf(x.kind);
  return [...tasks, ...drops].sort((a, b) =>
    rank(a) - rank(b) || (a.lead && b.lead ? ms(a.lead.createdAt) - ms(b.lead.createdAt) : (b.days || 0) - (a.days || 0)));
}

/* ── messages, in the buyer's language ── */

const nameOf = (task, lang) => (task.car ? carTitle(task.car) : String(task.lead?.carLabel || '').replace(/\s*\([^)]*\)\s*$/, '') || t(lang, 'auto.yourCar'));

export function taskMessage(task, settings, carUrl, lang = task.lead?.lang || 'en') {
  const l = task.lead;
  const vars = {
    name: String(l.name || '').trim(),
    shop: String(settings?.shopName || '').trim() || t(lang, 'auto.shop'),
    car: nameOf(task, lang),
  };
  const msg = (key, extra) => t(lang, key, { ...vars, ...extra });

  switch (task.kind) {
    case 'reply': {
      if (l.type === 'wish') return msg('auto.reply.wish', { search: describeQuery(l.query, lang) });
      if (l.type === 'reserve' || !l.date) return msg('auto.reply.reserve');
      const date = dateOf(l.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
      return msg('auto.reply.test-drive', { when: l.slot ? `${date}, ${t(lang, `auto.slot.${l.slot}`)}` : date });
    }
    case 'remind': {
      const address = String(settings?.address || '').trim();
      const when = [t(lang, `auto.${task.when}`), l.slot ? t(lang, `auto.${l.slot}`) : ''].filter(Boolean).join(' ');
      return msg('auto.remind', { when, where: address ? t(lang, 'auto.where', { address }) : '' });
    }
    case 'wish': {
      if (task.items.length === 1) {
        const [{ car, price }] = task.items;
        return msg('auto.wish.one', { car: carTitle(car), price: formatPeso(price), url: carUrl(car) });
      }
      const lines = task.items.map(({ car, price }) => t(lang, 'auto.wish.item', { car: carTitle(car), price: formatPeso(price), url: carUrl(car) }));
      return [msg('auto.wish.many'), ...lines].join('\n');
    }
    case 'dropped':
      return msg('auto.dropped', { price: formatPeso(task.price), was: formatPeso(task.was), url: carUrl(task.car) });
    case 'followup':
      return msg(task.after ? 'auto.follow.after' : 'auto.follow.quiet');
    default:
      return '';
  }
}

/* ── saving what the admin did ── */

/* After a message is sent from a task. The first one moves a New request to Contacted. */
export function recordContact(lead, task, now) {
  const at = now.toISOString();
  const next = { ...withStatus(lead, lead.status === 'new' ? 'contacted' : lead.status, now), lastContactAt: at };
  if (task.kind === 'remind') next.reminderSentAt = at;
  if (task.kind === 'wish') next.notifiedCarIds = [...new Set([...(lead.notifiedCarIds || []), ...task.items.map(i => i.car.id)])];
  return next;
}

/* A status change; the first move out of New stamps when the buyer was first contacted */
export const withStatus = (lead, status, now) => ({
  ...lead, status,
  ...(lead.status === 'new' && status !== 'new' && !lead.contactedAt ? { contactedAt: now.toISOString() } : {}),
});

/* ── week report (superadmin) ── */

/* Monday 00:00 local time. 'last' is the full week before this one; 'this' runs to now. */
export function weekRange(now, which = 'last') {
  const back = (now.getDay() + 6) % 7;
  const thisStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
  if (which === 'this') return { start: thisStart, end: now, which };
  return { start: new Date(thisStart.getFullYear(), thisStart.getMonth(), thisStart.getDate() - 7), end: thisStart, which };
}

export function weekReport({ leads = [], cars = [] }, range, now) {
  const from = range.start.getTime();
  const to = range.end.getTime();
  const inRange = (iso) => { const v = Date.parse(iso); return Number.isFinite(v) && v >= from && v < to; };
  const reqs = leads.filter(l => inRange(l.createdAt));
  const until = Math.min(to, now.getTime());
  /* minutes to the first reply; a request still New has waited until now (or the week's end) */
  const replies = reqs.filter(l => l.contactedAt).map(l => Math.max(0, ms(l.contactedAt) - ms(l.createdAt)) / MIN);
  const overHour = reqs.filter(l => (l.contactedAt
    ? Math.max(0, ms(l.contactedAt) - ms(l.createdAt))
    : l.status === 'new' ? until - ms(l.createdAt) : 0) / MIN > REPLY_AFTER_MIN).length;
  const sold = cars.filter(c => c.status === 'sold' && inRange(c.soldAt));
  const counts = new Map();
  for (const l of reqs) if (l.carId) counts.set(l.carId, (counts.get(l.carId) || 0) + 1);
  let mostAsked = null;
  for (const [id, n] of counts) {
    if (mostAsked && n <= mostAsked.n) continue;
    const car = cars.find(c => c.id === id);
    const label = car ? carTitle(car) : String(reqs.find(l => l.carId === id).carLabel || '').replace(/\s*\([^)]*\)\s*$/, '');
    mostAsked = { label, n };
  }
  const slowest = cars.filter(c => c.status !== 'sold')
    .map(c => ({ car: c, days: daysInStock(c, now) }))
    .sort((a, b) => b.days - a.days)[0] || null;
  const avg = (list) => (list.length ? Math.round(list.reduce((n, v) => n + v, 0) / list.length) : null);
  return {
    requests: {
      total: reqs.length,
      testDrive: reqs.filter(l => l.type === 'test-drive').length,
      reserve: reqs.filter(l => l.type === 'reserve').length,
      wish: reqs.filter(l => l.type === 'wish').length,
    },
    reply: { avgMin: avg(replies), overHour },
    sold: {
      count: sold.length,
      total: sold.reduce((n, c) => n + (Number(c.price) || 0), 0),
      avgDays: avg(sold.map(c => Math.floor((ms(c.soldAt) - ms(c.listedAt)) / DAY))),
    },
    added: cars.filter(c => inRange(c.listedAt)).length,
    priceDrops: cars.filter(c => inRange(c.priceDrop?.at)).length,
    mostAsked,
    slowest,
  };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const duration = (min) => {
  if (min < 60) return `${min} min`;
  if (min < 1440) { const h = Math.floor(min / 60); const m = min % 60; return `${plural(h, 'hr', 'hrs')}${m ? ` ${m} min` : ''}`; }
  return plural(Math.round(min / 1440), 'day', 'days');
};
const shortDay = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

/* "Nov 16 – Nov 22", or "Nov 23 – today" for this week */
export const rangeLabel = (range) => (range.which === 'this'
  ? `${shortDay(range.start)} – today`
  : `${shortDay(range.start)} – ${shortDay(new Date(range.end.getTime() - DAY))}`);

/* [label, value] pairs: shown on the dashboard and copied as text */
export function reportLines(r) {
  const q = r.requests;
  const kinds = [
    q.testDrive && plural(q.testDrive, 'test drive', 'test drives'),
    q.reserve && plural(q.reserve, 'reservation', 'reservations'),
    q.wish && `${q.wish} waitlist`,
  ].filter(Boolean).join(', ');
  const waited = r.reply.overHour ? `${plural(r.reply.overHour, 'buyer', 'buyers')} waited over an hour` : '';
  const lines = [['New requests', q.total ? `${q.total} (${kinds})` : 'none']];
  if (q.total) {
    const avg = r.reply.avgMin != null ? `${duration(r.reply.avgMin)} on average` : 'none yet';
    lines.push(['First reply', [avg, waited].filter(Boolean).join(' · ')]);
  }
  lines.push(['Sold', r.sold.count
    ? `${plural(r.sold.count, 'car', 'cars')}, ${formatPeso(r.sold.total)} total${r.sold.avgDays != null ? ` · ${r.sold.avgDays} days on average to sell` : ''}`
    : 'none']);
  lines.push(['Cars added', String(r.added)]);
  lines.push(['Price drops', String(r.priceDrops)]);
  if (r.mostAsked) lines.push(['Most asked about', `${r.mostAsked.label} (${plural(r.mostAsked.n, 'request', 'requests')})`]);
  if (r.slowest) lines.push(['Slowest seller', `${carTitle(r.slowest.car)}, ${r.slowest.days} days in stock`]);
  return lines;
}

export function reportText(r, settings, range) {
  const shop = String(settings?.shopName || '').trim();
  return [`${shop ? `${shop} · ` : ''}Week report, ${rangeLabel(range)}`, ...reportLines(r).map(([k, v]) => `${k}: ${v}`)].join('\n');
}
