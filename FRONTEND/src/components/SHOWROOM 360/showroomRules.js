/* Showroom 360 — pure rules shared by the public site and the admin.
   No React, no browser APIs, so `node --test` can run them. */
import { LEGAL_KINDS } from './legalText.js';

const DAY = 864e5;

export const COLORS = {
  white: { label: 'White', hex: '#f4f5f7' },
  pearl: { label: 'Pearl White', hex: '#ece8df' },
  silver: { label: 'Silver', hex: '#b9bfc7' },
  gray: { label: 'Gray', hex: '#6b7280' },
  black: { label: 'Black', hex: '#1f2328' },
  red: { label: 'Red', hex: '#b91c1c' },
  blue: { label: 'Blue', hex: '#1d4ed8' },
  brown: { label: 'Bronze', hex: '#8a5a3b' },
  beige: { label: 'Beige', hex: '#d6c7a8' },
  green: { label: 'Green', hex: '#3f6b4f' },
  orange: { label: 'Orange', hex: '#d9622b' },
  yellow: { label: 'Yellow', hex: '#e0b630' },
};

export const BODY_TYPES = { sedan: 'Sedan', hatchback: 'Hatchback', suv: 'SUV', crossover: 'Crossover', mpv: 'MPV', pickup: 'Pickup', van: 'Van' };
export const TRANSMISSIONS = { automatic: 'Automatic', manual: 'Manual', cvt: 'CVT' };
export const FUELS = { gasoline: 'Gasoline', diesel: 'Diesel', hybrid: 'Hybrid', electric: 'Electric' };
export const DRIVES = { '4x2': '4x2', '4x4': '4x4', awd: 'AWD' };
export const ORCR = { complete: 'Complete & original', 'open-deed': 'With open deed of sale', 'in-process': 'Transfer in process', unknown: 'Not stated' };
export const OWNERS = { 1: '1st owner', 2: '2nd owner', '3+': '3rd owner or more', unknown: 'Not stated' };
export const TRI = { yes: 'Yes', no: 'No', unknown: 'Not stated' };
const TR_SHORT = { automatic: 'AT', manual: 'MT', cvt: 'CVT' };

export const AGING_DAYS = 60;

/* Sample used-car loan figures. Total add-on % per term, the way PH banks quote it,
   scaled from BPI's published 60-month used-car rate (44.32%). */
export const DEFAULT_FINANCING = {
  minDownPct: 30,
  addOn: { 12: 8.86, 24: 17.72, 36: 26.59, 48: 35.45, 60: 44.32 },
  feesPct: 5,
};

/* Price-drop rule (Settings): after `days` in stock, suggest `pct` off. Only a suggestion:
   nothing changes until the dealer taps Apply. */
export const DEFAULT_PRICE_RULE = { on: true, days: 45, pct: 3 };

/* ── display ── */

export const carTitle = (car) =>
  [car.year, car.make, car.model, car.variant, TR_SHORT[car.transmission]]
    .map(v => String(v ?? '').trim()).filter(Boolean).join(' ');

export const formatPeso = (n) => `₱${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

export const formatKm = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} km`;

export function nextStockNo(cars) {
  const top = cars.reduce((max, c) => {
    const m = /^SR-(\d+)$/.exec(c.stockNo || '');
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `SR-${String(top + 1).padStart(4, '0')}`;
}

/* ── events and prices ── */

export function eventStatus(ev, now) {
  const t = now.getTime();
  if (t < Date.parse(ev.startsAt)) return 'upcoming';
  if (t < Date.parse(ev.endsAt)) return 'live';
  return 'ended';
}

export const liveEvents = (events, now) => events.filter(e => eventStatus(e, now) === 'live');

/* Live events buyers can act on: at least one available car still on sale */
export const liveEventsWithCars = (events, cars, now) =>
  liveEvents(events, now).filter(ev =>
    cars.some(c => c.status === 'available' && ev.items.some(i => i.carId === c.id) && effectivePrice(c, [ev], now).event));

/* A price drop shows on the public site (old price crossed out) for this long */
export const DROP_SHOWN_DAYS = 14;

/* The car's last price drop if it is recent and the price is still below the old one */
export function recentDrop(car, now) {
  const d = car?.priceDrop;
  const at = Date.parse(d?.at);
  if (!d || !Number.isFinite(at) || !(Number(d.from) > Number(car.price))) return null;
  const age = now.getTime() - at;
  return age >= 0 && age < DROP_SHOWN_DAYS * DAY ? d : null;
}

/* What a buyer pays now: a live sale price wins, then a recent price drop */
export function effectivePrice(car, events, now) {
  let best = null;
  for (const ev of liveEvents(events, now)) {
    const item = ev.items.find(i => i.carId === car.id);
    if (!item || !(item.salePrice > 0) || item.salePrice >= car.price) continue;
    if (!best || item.salePrice < best.price) best = { price: item.salePrice, original: car.price, event: ev, dropped: false };
  }
  if (best) return best;
  const drop = recentDrop(car, now);
  return drop
    ? { price: car.price, original: Number(drop.from), event: null, dropped: true }
    : { price: car.price, original: null, event: null, dropped: false };
}

const byNewest = (a, b) => Date.parse(b.listedAt) - Date.parse(a.listedAt);

export function featuredCars(cars, events, now, max = 8) {
  const available = cars.filter(c => c.status === 'available').sort(byNewest);
  const onSale = available.filter(c => effectivePrice(c, events, now).event);
  const flagged = available.filter(c => c.featured && !onSale.includes(c));
  const picked = [...onSale, ...flagged].slice(0, max);
  return picked.length ? picked : available.slice(0, 5);
}

/* Cars whose photos can sit behind the dark photo bands (Cars banner, waitlist band):
   still on the lot, with a photo, newest listed first. Photos on cars are covered by
   the footer's credit list. */
export const bandCars = (cars) =>
  cars.filter(c => c.status !== 'sold' && c.photoIds?.length > 0).sort(byNewest);

/* "You might also like" under a car: cars a buyer can still ask about (not sold,
   not reserved), the same body type first, then the closest price they'd pay now. */
export function similarCars(cars, car, events, now, n = 4) {
  const price = effectivePrice(car, events, now).price;
  return cars
    .filter(c => c.id !== car.id && c.status === 'available')
    .map(c => ({ c, body: c.body === car.body ? 0 : 1, gap: Math.abs(effectivePrice(c, events, now).price - price) }))
    .sort((a, b) => a.body - b.body || a.gap - b.gap || byNewest(a.c, b.c))
    .slice(0, n)
    .map(x => x.c);
}

/* Saved cars: ids kept in the buyer's own browser, newest saved first */
export const toggleSaved = (ids, id) => (ids.includes(id) ? ids.filter(x => x !== id) : [id, ...ids]);

export function parseSaved(text) {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && x.trim()))] : [];
  } catch {
    return [];
  }
}

export const recentlySold = (cars, n = 6) =>
  cars.filter(c => c.status === 'sold')
    .sort((a, b) => Date.parse(b.soldAt || 0) - Date.parse(a.soldAt || 0))
    .slice(0, n);

/* ── financing ── */

export const loanTerms = (fin) => Object.keys(fin.addOn).map(Number).filter(n => n > 0).sort((a, b) => a - b);

export function loanQuote(price, downPct, term, fin) {
  const down = Math.round(price * downPct / 100);
  const financed = price - down;
  const total = financed * (1 + (Number(fin.addOn[term]) || 0) / 100);
  /* round to centavos first so float noise never adds a peso */
  const monthly = Math.ceil(Math.round((total / term) * 100) / 100);
  const allIn = down + Math.round(price * (Number(fin.feesPct) || 0) / 100);
  return { down, financed, monthly, allIn };
}

/* The calculator's downpayment always sits between the current minimum and 60%
   (or the minimum, if a dealer sets it above 60) */
export function clampDownPct(pct, fin) {
  const min = Math.max(0, Math.min(90, Number(fin.minDownPct) || 0));
  return Math.min(Math.max(60, min), Math.max(min, pct));
}

export function monthlyFrom(price, fin) {
  const terms = loanTerms(fin);
  return loanQuote(price, fin.minDownPct, terms[terms.length - 1], fin).monthly;
}

/* ── search ── */

const SORTS = {
  newest: (a, b) => byNewest(a.car, b.car),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  'km-asc': (a, b) => a.car.odometer - b.car.odometer,
  'year-desc': (a, b) => b.car.year - a.car.year || byNewest(a.car, b.car),
};
export const SORT_KEYS = Object.keys(SORTS);

const haystack = (c) =>
  [c.make, c.model, c.variant, c.year, COLORS[c.color]?.label, c.stockNo, BODY_TYPES[c.body]].join(' ').toLowerCase();

export function filterCars(cars, query, events, now) {
  const q = query || {};
  const words = String(q.q || '').toLowerCase().split(/\s+/).filter(Boolean);
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  const rows = cars
    .filter(c => c.status !== 'sold')
    .map(car => ({ car, ...effectivePrice(car, events, now) }))
    .filter(({ car, price, event }) => {
      if (words.length && !words.every(w => haystack(car).includes(w))) return false;
      if (q.make && !same(car.make, q.make)) return false;
      if (q.body && car.body !== q.body) return false;
      if (q.transmission && car.transmission !== q.transmission) return false;
      if (q.fuel && car.fuel !== q.fuel) return false;
      if (q.priceMin && price < q.priceMin) return false;
      if (q.priceMax && price > q.priceMax) return false;
      if (q.yearMin && car.year < q.yearMin) return false;
      if (q.yearMax && car.year > q.yearMax) return false;
      if (q.onSale && !event) return false;
      return true;
    });
  rows.sort(SORTS[q.sort] || SORTS.newest);
  return rows.map(r => r.car);
}

const TEXT_KEYS = ['q', 'make', 'body', 'transmission', 'fuel'];
const NUM_KEYS = ['priceMin', 'priceMax', 'yearMin', 'yearMax'];

export function parseQuery(search) {
  const p = new URLSearchParams(search || '');
  const out = {};
  for (const k of TEXT_KEYS) { const v = (p.get(k) || '').trim(); if (v) out[k] = v; }
  for (const k of NUM_KEYS) { const v = Number(p.get(k)); if (Number.isFinite(v) && v > 0) out[k] = v; }
  if (p.get('onSale') === '1') out.onSale = true;
  if (p.get('saved') === '1') out.saved = true;
  const sort = p.get('sort');
  if (sort && sort !== 'newest' && SORTS[sort]) out.sort = sort;
  return out;
}

/* ── price range filter (slider + typed boxes) ── */

/* The showroom's own price range: cheapest to dearest car on sale, sale prices included */
export function priceBounds(cars, events, now) {
  const prices = cars
    .filter(c => c.status !== 'sold')
    .map(c => effectivePrice(c, events, now).price)
    .filter(p => Number.isFinite(p) && p > 0);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
}

/* Keeps a typed or dragged range inside the bounds. An end left at its bound
   means "no limit" and is dropped; if the ends cross, the one being moved stops
   at the other. */
export function priceFilter(min, max, bounds, edited = 'max') {
  if (!bounds) return { priceMin: undefined, priceMax: undefined };
  const fit = (v, fallback) => Math.min(bounds.max, Math.max(bounds.min, Number.isFinite(v) ? v : fallback));
  let lo = fit(min, bounds.min);
  let hi = fit(max, bounds.max);
  if (lo > hi) { if (edited === 'min') lo = hi; else hi = lo; }
  return { priceMin: lo > bounds.min ? lo : undefined, priceMax: hi < bounds.max ? hi : undefined };
}

export function parsePesoInput(text) {
  const digits = String(text ?? '').split('.')[0].replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

/* The slider moves in 100 positions; the ends are the exact bounds, the rest whole thousands */
export const PRICE_POSITIONS = 100;
export function priceAtPosition(pos, b) {
  if (pos <= 0) return b.min;
  if (pos >= PRICE_POSITIONS) return b.max;
  const raw = b.min + ((b.max - b.min) * pos) / PRICE_POSITIONS;
  return Math.min(b.max, Math.max(b.min, Math.round(raw / 1000) * 1000));
}
export function positionOfPrice(price, b) {
  if (!(b.max > b.min)) return 0;
  const pos = Math.round(((price - b.min) / (b.max - b.min)) * PRICE_POSITIONS);
  return Math.min(PRICE_POSITIONS, Math.max(0, pos));
}

export function toQuery(query) {
  const p = new URLSearchParams();
  for (const k of [...TEXT_KEYS, ...NUM_KEYS]) {
    const v = query[k];
    if (v !== undefined && v !== null && String(v).trim() !== '' && v !== 0) p.set(k, String(v).trim());
  }
  if (query.onSale) p.set('onSale', '1');
  if (query.saved) p.set('saved', '1');
  if (query.sort && query.sort !== 'newest') p.set('sort', query.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/* ── stock age ── */

export const daysInStock = (car, now) => Math.max(0, Math.floor((now.getTime() - Date.parse(car.listedAt)) / DAY));

/* ── validation ── */

export const isPhMobile = (s) => /^(09\d{9}|\+639\d{9})$/.test(String(s || '').replace(/[\s\-()]/g, ''));

const blank = (v) => String(v ?? '').trim() === '';

export function validateCar(car, now = new Date()) {
  const e = {};
  const year = Number(car.year);
  if (!Number.isInteger(year) || year < 1980 || year > now.getFullYear() + 1) e.year = `Enter a year from 1980 to ${now.getFullYear() + 1}.`;
  if (blank(car.make)) e.make = 'Enter the make, e.g. Toyota.';
  if (blank(car.model)) e.model = 'Enter the model, e.g. Vios.';
  if (!TRANSMISSIONS[car.transmission]) e.transmission = 'Pick a transmission.';
  if (!FUELS[car.fuel]) e.fuel = 'Pick a fuel.';
  const km = Number(car.odometer);
  if (blank(car.odometer) || !Number.isFinite(km) || km < 0 || km >= 1e6) e.odometer = 'Enter the odometer reading in km.';
  if (!(Number(car.price) > 0)) e.price = 'Enter the cash price.';
  const listed = Date.parse(car.listedAt);
  if (car.listedAt !== undefined && (!Number.isFinite(listed) || listed > now.getTime() + DAY)) e.listedAt = 'Pick today or an earlier date.';
  return e;
}

const overlaps = (a, b) => Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);

export function validateEvent(ev, events, cars) {
  const e = {};
  if (blank(ev.name)) e.name = 'Give the event a name.';
  const s = Date.parse(ev.startsAt);
  const end = Date.parse(ev.endsAt);
  if (!Number.isFinite(s)) e.startsAt = 'Pick when the event starts.';
  if (!Number.isFinite(end) || (Number.isFinite(s) && end <= s)) e.endsAt = 'The end must be after the start.';

  const seen = new Set();
  for (const item of ev.items) {
    const car = cars.find(c => c.id === item.carId);
    if (!car) { e.items = 'One of the cars no longer exists. Remove it.'; break; }
    if (seen.has(car.id)) { e.items = `${carTitle(car)} is listed twice.`; break; }
    seen.add(car.id);
    if (!(item.salePrice > 0) || item.salePrice >= car.price) {
      e.items = `The sale price for ${carTitle(car)} must be below ${formatPeso(car.price)}.`;
      break;
    }
    if (Number.isFinite(s) && Number.isFinite(end)) {
      const clash = events.find(o => o.id !== ev.id && overlaps(ev, o) && o.items.some(i => i.carId === car.id));
      if (clash) { e.items = `${carTitle(car)} is already in "${clash.name}" on overlapping dates.`; break; }
    }
  }
  return e;
}

export function validateLead(lead, todayISO) {
  const e = {};
  if (blank(lead.name)) e.name = 'Enter your name.';
  if (!isPhMobile(lead.mobile)) e.mobile = 'Enter a PH mobile number, e.g. 0917 123 4567.';
  if (lead.type === 'test-drive') {
    if (!lead.date) e.date = 'Pick a date.';
    else if (lead.date < todayISO) e.date = 'Pick today or a later date.';
    if (lead.slot !== 'morning' && lead.slot !== 'afternoon') e.slot = 'Pick morning or afternoon.';
  }
  if (lead.type === 'trade-in' && blank(lead.tradeCar)) e.tradeCar = 'Tell us your car’s year, make and model.';
  return e;
}

/* ── photos & saving ── */

/* Photo ids carry their upload time, so a cleanup can tell a fresh upload
   (maybe still in an unsaved form in another tab) from a leftover */
export const newPhotoId = (now = new Date()) => `ph-${now.getTime()}-${Math.random().toString(36).slice(2, 8) || '0'}`;

export function orphanPhotoIds(ids, data, now) {
  /* car photos, release photos on reviews, and the logo */
  const used = new Set([
    ...(data.cars || []).flatMap(c => [...(c.photoIds || []), c.sale?.review?.photoId]), data.settings?.logoPhotoId,
  ].filter(Boolean));
  return ids.filter(id => {
    if (used.has(id)) return false;
    const m = /^ph-(\d+)-/.exec(id);
    return !m || now.getTime() - Number(m[1]) > DAY;
  });
}

export function saveErrorKind(err) {
  if (err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'full';
  if (err?.message === 'unreadable') return 'unreadable';
  return 'other';
}

/* ── contact links ── */

export function toIntlMobile(s) {
  const digits = String(s || '').replace(/[\s\-()]/g, '');
  return digits.startsWith('09') ? `+63${digits.slice(1)}` : digits;
}

/* The shop's Messenger link from whatever was typed: a page name, @name, an m.me or facebook.com link */
export function messengerUrl(value) {
  const handle = String(value || '').trim()
    .replace(/^https?:\/\/(www\.|web\.|m\.)?(m\.me|facebook\.com|messenger\.com\/t)\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
  return handle ? `https://m.me/${encodeURIComponent(handle)}` : null;
}

/* "Open in Google Maps": the dealer's link only if it is a web link (a link pasted
   without https:// gets it added), otherwise a search for the pin or the address. */
export function mapsOpenUrl(s) {
  const link = String(s.mapsUrl || '').trim();
  if (/^https?:\/\//i.test(link)) return link;
  if (/^((maps\.app\.)?goo\.gl|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i.test(link)) return `https://${link}`;
  const where = s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : (s.address || '');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`;
}

/* /showroom/... → which page. A stray % in the address must not crash the app. */
export function parseShowroomPath(pathname) {
  const decode = (p) => { try { return decodeURIComponent(p); } catch { return p; } };
  const [, a, b, c] = String(pathname || '').split('/').filter(Boolean).map(decode);
  if (a?.toLowerCase() === 'admin') return { view: 'admin', sub: b || 'dashboard', id: c || null };
  if (a === 'cars' && b) return { view: 'car', id: b };
  if (a === 'cars') return { view: 'cars' };
  if (a === 'compare' && !b) return { view: 'compare' };
  if (LEGAL_KINDS.includes(a) && !b) return { view: a };
  if (!a) return { view: 'home' };
  return { view: 'notfound' };
}

/* ── admin roles: one sign-in page, two PINs. A demo lock, not security. ── */

const SUPER_ONLY = new Set(['settings', 'history', 'agents']);

export function roleForPin(pin, settings) {
  const p = String(pin ?? '').trim();
  if (!p) return null;
  if (p === String(settings?.superPin ?? '').trim()) return 'superadmin';
  if (p === String(settings?.pin ?? '').trim()) return 'admin';
  return null;
}

export const canOpen = (role, page) => role === 'superadmin' || (role === 'admin' && !SUPER_ONLY.has(page));

/* The admin can edit and delete events; only the superadmin starts a new one */
export const canAddEvent = (role) => role === 'superadmin';

/* Promos: both roles see them and redeem vouchers; only the superadmin creates, edits,
   deletes or puts one on an event */
export const canManagePromos = (role) => role === 'superadmin';

/* ── dark mode: the device's setting until the visitor flips the switch ── */

export const themeFor = (saved, deviceDark) =>
  saved === 'light' || saved === 'dark' ? saved : deviceDark ? 'dark' : 'light';

/* What to remember after a flip: nothing when it matches the device again,
   so the site goes back to following the device */
export const themeToSave = (next, deviceDark) => (next === (deviceDark ? 'dark' : 'light') ? null : next);

/* "?&body=" works in both iPhone and Android Messages */
export const smsUrl = (number, text) => `sms:${toIntlMobile(number)}?&body=${encodeURIComponent(text)}`;

export const viberUrl = (number, text) =>
  `viber://chat?number=${encodeURIComponent(toIntlMobile(number))}&draft=${encodeURIComponent(text)}`;

/* ── messages ── */

export function inquiryText(car, info, lang) {
  const what = `${carTitle(car)} (${car.stockNo}, ${formatPeso(info.price)})`;
  return lang === 'ceb'
    ? `Hi! Interested ko sa ${what}. Available pa ni?`
    : `Hi! I'm interested in the ${what}. Is it still available?`;
}

export function fbCaption(car, settings, info, lang) {
  const ceb = lang === 'ceb';
  const lines = [`${info.dropped ? 'PRICE DROP' : 'FOR SALE'}: ${carTitle(car)}`];

  if (info.event) {
    lines.push(`${formatPeso(info.price)} (${info.event.name}, ${ceb ? 'dati' : 'was'} ${formatPeso(info.original)})`);
  } else if (info.dropped) {
    lines.push(`${formatPeso(info.price)} (${ceb ? 'dati' : 'was'} ${formatPeso(info.original)})`);
  } else {
    lines.push(`${formatPeso(info.price)}${car.negotiable ? (ceb ? ' (pwede pa hangyo)' : ' (negotiable)') : ''}`);
  }
  if (car.financing && settings.financing) {
    const fin = settings.financing;
    const monthly = formatPeso(monthlyFrom(info.price, fin));
    lines.push(ceb ? `Gikan ${monthly}/bulan, ${fin.minDownPct}% DP` : `From ${monthly}/mo with ${fin.minDownPct}% down`);
  }
  lines.push([car.year, formatKm(car.odometer), TRANSMISSIONS[car.transmission], FUELS[car.fuel]].filter(Boolean).join(' · '));

  const good = [];
  if (car.floodFree === 'yes') good.push('Flood-free');
  if (car.accidentFree === 'yes') good.push('Accident-free');
  if (car.casaMaintained === 'yes') good.push('Casa maintained');
  if (String(car.owners) === '1') good.push(ceb ? 'First owner' : '1st owner');
  if (car.orcr === 'complete') good.push(ceb ? 'Kompleto OR/CR' : 'Complete OR/CR');
  if (good.length) lines.push(good.map(g => `✓ ${g}`).join('  '));

  lines.push('');
  lines.push([settings.shopName, settings.address].filter(Boolean).join(' · '));
  if (settings.phone) lines.push(`${ceb ? 'Tawag o text' : 'Call or text'}: ${settings.phone}`);
  lines.push('');
  lines.push(`#CebuCars #UsedCarsCebu #${String(car.make || '').replace(/\s+/g, '')}`);
  return lines.join('\n');
}

/* ── photo viewer: pinch and double-tap zoom on the car page ──
   view = { s: scale, x, y: pan in px from the centre }; box = the photo's size at 1x
   (imgW, imgH) and the frame's (boxW, boxH). */

export const ZOOM_MAX = 4;

const limit = (v, m) => Math.max(-m, Math.min(m, v)) || 0;

/* Keeps the zoom between 1x and ZOOM_MAX and the photo's edges inside the frame */
export function clampView(view, box) {
  const s = Math.max(1, Math.min(ZOOM_MAX, Number(view.s) || 1));
  const mx = Math.max(0, (box.imgW * s - box.boxW) / 2);
  const my = Math.max(0, (box.imgH * s - box.boxH) / 2);
  return { s, x: limit(view.x, mx), y: limit(view.y, my) };
}

/* Zoom to s2 about a point (fx, fy) measured from the frame's centre, so that point stays put */
export function zoomAt(view, s2, fx, fy) {
  const k = s2 / view.s;
  return { s: s2, x: fx - (fx - view.x) * k, y: fy - (fy - view.y) * k };
}

/* ── dealer tools (2026-11-25) ── */

/* Reservations: the fee, how long a car is held, and when the fee comes back */
export const REFUND_RULES = { refundable: 'Refundable', denied: 'Refundable if the bank loan is denied', none: 'Non-refundable' };
export const DEFAULT_RESERVATION = { fee: 5000, days: 7, refund: 'denied' };
const ymdOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function reservedUntilFor(todayISO, days) {
  const [y, m, d] = String(todayISO).split('-').map(Number);
  return ymdOf(new Date(y, m - 1, d + (Number(days) || 0)));
}

/* Reservations past their last day go back on sale; the last day itself still holds */
export const expireReservations = (cars, todayISO) => cars
  .filter(c => c.status === 'reserved' && c.reservedUntil && c.reservedUntil < todayISO)
  .map(c => ({ ...c, status: 'available', reservedUntil: null }));

/* The inspection report: 20 checks in 5 groups (English labels for the admin;
   buyers see insp.<id> in their language) */
export const INSPECTION = [
  { id: 'engine', label: 'Engine & transmission', items: [
    ['start', 'Starts and idles smoothly'], ['leaks', 'No oil or fluid leaks'],
    ['shift', 'Transmission shifts cleanly'], ['cooling', 'Radiator and hoses OK']] },
  { id: 'under', label: 'Underside', items: [
    ['rust', 'No heavy rust underneath'], ['suspension', 'Suspension and steering OK'],
    ['brakes', 'Brakes OK'], ['tires', 'Tires have good tread']] },
  { id: 'body', label: 'Body & frame', items: [
    ['paint', 'Paint even, no hidden repaint'], ['panels', 'Doors, hood and trunk line up'],
    ['frame', 'Frame straight, no welding'], ['lights', 'Lights and glass OK']] },
  { id: 'inside', label: 'Interior & electricals', items: [
    ['aircon', 'Aircon cold'], ['power', 'Power windows and locks work'],
    ['dash', 'No warning lights on the dash'], ['seats', 'Seats and belts OK']] },
  { id: 'flood', label: 'Flood check', items: [
    ['silt', 'No mud or water marks under the carpets'], ['seatrust', 'No rust on seat rails and bolts'],
    ['smell', 'No musty smell'], ['wiring', 'Wiring and connectors dry and clean']] },
];
const INSPECTION_IDS = INSPECTION.flatMap(g => g.items.map(([id]) => id));

/* null until the report has a date and at least one result */
export function inspectionSummary(insp) {
  if (!insp?.date) return null;
  const r = insp.results || {};
  const done = INSPECTION_IDS.filter(id => r[id] === 'pass' || r[id] === 'fix');
  if (!done.length) return null;
  return {
    total: INSPECTION_IDS.length,
    checked: done.length,
    passed: done.filter(id => r[id] === 'pass').length,
    fix: done.filter(id => r[id] === 'fix').length,
  };
}

/* After a sale: the paper steps the buyer hears about, in order */
export const PAPER_STEPS = [['deed', 'Deed of sale signed'], ['hpg', 'HPG clearance'], ['lto', 'LTO transfer filed'], ['released', 'New OR/CR released']];

/* Drawn on car photos the dealer adds, so a reposted photo still names the shop */
export function watermarkLabel(s) {
  if (s?.watermark === false) return '';
  const name = String(s?.shopName || '').trim();
  if (!name) return '';
  const phone = String(s?.phone || '').trim();
  return phone ? `${name} · ${phone}` : name;
}

/* ── agents ("ahente") ── */

const slug = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9-]/g, '');

/* the agent code in a link like /showroom?ref=ana */
export const refCode = (search) => slug(new URLSearchParams(search || '').get('ref')).slice(0, 24);

export function agentCodeFor(name, agents) {
  const base = slug(String(name || '').trim().split(/\s+/)[0]) || 'agent';
  const used = new Set(agents.map(a => a.code));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function agentStats(agent, leads, cars) {
  const sold = cars.filter(c => c.status === 'sold' && c.sale?.agentId === agent.id);
  const amount = (c) => Number(c.sale.commission) || 0;
  return {
    leads: leads.filter(l => l.agentCode && l.agentCode === agent.code).length,
    sold: sold.length,
    owed: sold.filter(c => !c.sale.commissionPaidAt).reduce((n, c) => n + amount(c), 0),
    paid: sold.filter(c => c.sale.commissionPaidAt).reduce((n, c) => n + amount(c), 0),
  };
}

/* ── what a buyer can afford ──
   About 30% of take-home pay goes to the monthly, at the longest term; the cash
   covers the all-in downpayment (the minimum down plus fees). Checked against
   loanQuote, so it never promises a car the calculator says is out of reach. */
export const BUDGET_SHARE = 0.3;
export function affordablePrice({ income, cash }, fin) {
  const pay = Number(income) || 0;
  const money = Number(cash) || 0;
  if (pay <= 0 || money <= 0) return 0;
  const terms = loanTerms(fin);
  const term = terms[terms.length - 1];
  const rate = (Number(fin.addOn[term]) || 0) / 100;
  const fees = (Number(fin.feesPct) || 0) / 100;
  const minDown = (Number(fin.minDownPct) || 0) / 100;
  const budget = pay * BUDGET_SHARE;
  const byDown = minDown + fees > 0 ? money / (minDown + fees) : Infinity;
  const byMonthly = (budget * term / (1 + rate) + money) / (1 + fees);
  const fits = (p) => {
    const down = money - Math.round(p * fees);
    return down / p >= minDown - 1e-9 && loanQuote(p, (down / p) * 100, term, fin).monthly <= budget;
  };
  let price = Math.floor(Math.min(byDown, byMonthly) / 10000) * 10000;
  while (price > 0 && !fits(price)) price -= 10000;
  return Math.max(0, price);
}
