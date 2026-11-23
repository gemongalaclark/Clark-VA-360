/* Admin history: turns a change (before → after) into a log entry the admin can
   read. Pure functions; the store writes the entry in the same step as the change.
   Entry: { id, at, kind, action, title, targetId, changes: [{ label, from?, to?, note? }] }
   A row with `note` says what happened without values (long text, PIN, photos). */
import {
  carTitle, formatPeso, formatKm, COLORS, BODY_TYPES, TRANSMISSIONS, FUELS, DRIVES, ORCR, OWNERS, TRI,
} from './showroomRules.js';

export const HISTORY_LIMIT = 500;
export const HISTORY_KINDS = { car: 'Cars', event: 'Events', settings: 'Settings', lead: 'Leads' };

const DASH = '—';
const LONG = Symbol('long text');
const empty = (v) => v === undefined || v === null || String(v).trim() === '';
const yesNo = (v) => (v ? 'Yes' : 'No');
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = (iso) => new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const monthYear = (ym) => {
  const [y, m] = String(ym).split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : String(ym);
};
const pct = (v) => `${Number(v)}%`;

const STATUS = { available: 'Available', reserved: 'Reserved', sold: 'Sold' };
const LEAD_STATUS = { new: 'New', contacted: 'Contacted', closed: 'Closed' };
const LEAD_TYPE = { 'test-drive': 'Test drive', reserve: 'Reservation' };

let seq = 0;
const entryId = (now) => `h-${now.getTime()}-${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const entry = (now, kind, action, title, targetId, changes) =>
  ({ id: entryId(now), at: now.toISOString(), kind, action, title, targetId: targetId ?? null, changes });

/* One row per field that differs. fields: [key, label, format | yesNo | LONG] */
function diffRows(before, after, fields) {
  const rows = [];
  for (const [key, label, fmt] of fields) {
    const a = before?.[key];
    const b = after?.[key];
    if (fmt === yesNo ? !!a === !!b : (empty(a) && empty(b)) || String(a) === String(b)) continue;
    if (fmt === LONG) {
      rows.push({ label, note: empty(a) ? 'added' : empty(b) ? 'removed' : 'changed' });
      continue;
    }
    const show = (v) => (fmt === yesNo ? yesNo(v) : empty(v) ? DASH : String((fmt ? fmt(v) : v) ?? v));
    /* Same on screen means no real change (e.g. a time saved again, now to the minute) */
    if (show(a) === show(b)) continue;
    rows.push({ label, from: show(a), to: show(b) });
  }
  return rows;
}

/* ── cars ── */

const CAR_FIELDS = [
  ['year', 'Year'], ['make', 'Make'], ['model', 'Model'], ['variant', 'Variant'],
  ['body', 'Body type', v => BODY_TYPES[v]], ['transmission', 'Transmission', v => TRANSMISSIONS[v]],
  ['fuel', 'Fuel', v => FUELS[v]], ['engine', 'Engine'], ['drive', 'Drive', v => DRIVES[v]], ['seats', 'Seats'],
  ['odometer', 'Odometer', formatKm], ['color', 'Color', v => COLORS[v]?.label],
  ['price', 'Price', formatPeso], ['negotiable', 'Negotiable', yesNo], ['financing', 'Bank financing', yesNo],
  ['status', 'Status', v => STATUS[v]], ['featured', 'Featured on home', yesNo],
  ['orcr', 'OR/CR', v => ORCR[v]], ['owners', 'Owners', v => OWNERS[v]], ['regUntil', 'Registered until', monthYear],
  ['plateEnding', 'Plate ends in'],
  ['floodFree', 'Flood-free', v => TRI[v]], ['accidentFree', 'Accident-free', v => TRI[v]], ['casaMaintained', 'Casa maintained', v => TRI[v]],
  ['listedAt', 'Date listed', shortDate],
  ['description', 'Description', LONG], ['knownIssues', 'Known issues', LONG],
];

function photoRow(a = [], b = []) {
  const added = b.filter(x => !a.includes(x)).length;
  const removed = a.filter(x => !b.includes(x)).length;
  const parts = [];
  if (added) parts.push(`${added} added`);
  if (removed) parts.push(`${removed} removed`);
  if (!parts.length && a.join() !== b.join()) parts.push(a[0] !== b[0] ? 'new cover photo' : 'reordered');
  return parts.length ? { label: 'Photos', note: parts.join(', ') } : null;
}

export function carEntry(before, after, now) {
  if (!before) {
    const changes = [
      { label: 'Price', to: formatPeso(after.price) },
      { label: 'Stock no.', to: after.stockNo },
      ...(after.photoIds?.length ? [{ label: 'Photos', to: String(after.photoIds.length) }] : []),
    ];
    return entry(now, 'car', 'Added', carTitle(after), after.id, changes);
  }
  const changes = diffRows(before, after, CAR_FIELDS);
  const photos = photoRow(before.photoIds, after.photoIds);
  if (photos) changes.push(photos);
  if (!changes.length) return null;
  let action = 'Edited';
  if (changes.length === 1 && changes[0].label === 'Status') action = `Marked ${STATUS[after.status]?.toLowerCase() || after.status}`;
  if (changes.length === 1 && changes[0].label === 'Featured on home') action = after.featured ? 'Featured on home' : 'Removed from home';
  return entry(now, 'car', action, carTitle(after), after.id, changes);
}

export function carDeletedEntry(car, events, now) {
  if (!car) return null;
  const names = (events || []).filter(e => e.items?.some(i => i.carId === car.id)).map(e => e.name);
  const changes = [{ label: 'Stock no.', to: car.stockNo }];
  if (names.length) changes.push({ label: 'Removed from', to: names.join(', ') });
  return entry(now, 'car', 'Deleted', carTitle(car), null, changes);
}

/* ── events ── */

export function eventEntry(before, after, cars, now) {
  const created = !before;
  const name = (id) => { const c = cars.find(x => x.id === id); return c ? carTitle(c) : 'A deleted car'; };
  const changes = diffRows(before || {}, after, [
    ...(created ? [] : [['name', 'Name']]),
    ['tagline', 'Tagline'], ['startsAt', 'Starts', dateTime], ['endsAt', 'Ends', dateTime],
  ]).map(r => (created ? { label: r.label, to: r.to } : r));
  const old = new Map((before?.items || []).map(i => [i.carId, i.salePrice]));
  const next = new Map((after.items || []).map(i => [i.carId, i.salePrice]));
  for (const [id, price] of next) {
    if (!old.has(id)) changes.push({ label: 'Car added', to: `${name(id)} at ${formatPeso(price)}` });
    else if (Number(old.get(id)) !== Number(price)) {
      changes.push({ label: `Sale price · ${name(id)}`, from: formatPeso(old.get(id)), to: formatPeso(price) });
    }
  }
  for (const id of old.keys()) if (!next.has(id)) changes.push({ label: 'Car removed', from: name(id) });
  if (!created && !changes.length) return null;
  return entry(now, 'event', created ? 'Created' : 'Edited', after.name, after.id, changes);
}

export function eventDeletedEntry(ev, now) {
  if (!ev) return null;
  return entry(now, 'event', 'Deleted', ev.name, null, [{ label: 'Cars on sale', to: String(ev.items?.length || 0) }]);
}

/* ── settings ── */

const SETTINGS_FIELDS = [
  ['shopName', 'Shop name'], ['tagline', 'Tagline'], ['about', 'About the shop', LONG],
  ['phone', 'Phone'], ['messenger', 'Messenger'], ['viber', 'Viber'], ['hours', 'Hours'], ['address', 'Address'],
  ['mapsUrl', 'Google Maps link', LONG], ['logoPhotoId', 'Logo', LONG],
];

export function settingsEntry(before, after, now) {
  const changes = diffRows(before, after, SETTINGS_FIELDS);
  if (String(before?.lat ?? '') !== String(after.lat ?? '') || String(before?.lng ?? '') !== String(after.lng ?? '')) {
    changes.push({ label: 'Map pin', note: after.lat == null ? 'removed' : before?.lat == null ? 'added' : 'moved' });
  }
  /* Never the digits: the history is on screen during a pitch */
  for (const [key, label] of [['pin', 'Admin PIN'], ['superPin', 'Superadmin PIN']]) {
    if (String(before?.[key] ?? '') !== String(after[key] ?? '')) changes.push({ label, note: 'changed' });
  }
  const fa = before?.financing || {};
  const fb = after.financing || {};
  changes.push(...diffRows(fa, fb, [['minDownPct', 'Minimum downpayment', pct], ['feesPct', 'All-in fees', pct]]));
  const terms = [...new Set([...Object.keys(fa.addOn || {}), ...Object.keys(fb.addOn || {})])].sort((x, y) => x - y);
  for (const term of terms) {
    changes.push(...diffRows(fa.addOn || {}, fb.addOn || {}, [[term, `Add-on rate, ${term} months`, pct]]));
  }
  if (!changes.length) return null;
  return entry(now, 'settings', 'Edited', 'Shop settings', null, changes);
}

/* ── leads: only the admin's changes; a buyer's new request is not an admin change ── */

export function leadEntry(before, after, now) {
  if (!before || before.status === after.status) return null;
  const to = LEAD_STATUS[after.status] || after.status;
  return entry(now, 'lead', `Marked ${to.toLowerCase()}`, `${after.name} · ${LEAD_TYPE[after.type] || 'Request'}`, after.id, [
    { label: 'Status', from: LEAD_STATUS[before.status] || before.status, to },
    ...(after.carLabel ? [{ label: 'Car', to: after.carLabel }] : []),
  ]);
}

export const resetEntry = (now) => entry(now, 'demo', 'Reset', 'Demo data reset to the sample cars', null, []);

/* ── the list ── */

export const addToHistory = (list, e) => (e ? [e, ...list].slice(0, HISTORY_LIMIT) : list);

export function normalizeHistory(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(e => e && typeof e === 'object' && typeof e.at === 'string' && typeof e.kind === 'string'
    && typeof e.title === 'string' && Array.isArray(e.changes));
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/* Entries come newest first; each day keeps that order */
export function groupByDay(entries, now) {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const groups = [];
  for (const e of entries) {
    const d = new Date(e.at);
    const key = dayKey(d);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const label = key === today ? 'Today' : key === yesterday ? 'Yesterday'
        : d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
      g = { key, label, entries: [] };
      groups.push(g);
    }
    g.entries.push(e);
  }
  return groups;
}
