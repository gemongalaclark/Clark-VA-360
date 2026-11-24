/* Promos: a prize wheel the superadmin attaches to an event by its promo code.
   Buyers spin once and claim a voucher with their name and email. Pure functions.
   promo: { id, name, code, permit, prizes: [{ id, label, chance }], startsAt, endsAt, createdAt }
   claim: { id, promoId, eventId, prizeId, prizeLabel, name, email, voucher, claimedAt, redeemedAt, stockNo } */
import { eventStatus } from './showroomRules.js';

/* No 0/O or 1/I/L: a code read out at the counter can't be misheard or mistyped */
export const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const VOUCHER_DAYS = 30;
export const MIN_PRIZES = 2;
export const MAX_PRIZES = 8;
const DAY = 864e5;

/* chances are whole hundredths of a percent, so the maths stays in integers */
const units = (chance) => Math.max(0, Math.round(Number(chance) * 100) || 0);

/* The prize for a random number in [0, 1), by each prize's chance. A 0% prize is never won. */
export function pickPrize(prizes, rand) {
  const live = prizes.filter(p => units(p.chance) > 0);
  const total = live.reduce((n, p) => n + units(p.chance), 0);
  let x = Math.floor(Math.min(Math.max(Number(rand) || 0, 0), 0.999999999) * total);
  for (const p of live) {
    if (x < units(p.chance)) return p;
    x -= units(p.chance);
  }
  return live[live.length - 1] || null;
}

/* "SPIN-7KQ2" (length 4) or "DM-4F7K-9QXH" (length 8), never one already in `taken` */
export function newCode(prefix, taken = [], rand = Math.random, length = 4) {
  const used = new Set(taken);
  for (let tries = 0; tries < 1000; tries++) {
    let body = '';
    for (let i = 0; i < length; i++) {
      if (i && i % 4 === 0) body += '-';
      body += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length) % CODE_CHARS.length];
    }
    const code = `${prefix}-${body}`;
    if (!used.has(code)) return code;
  }
  throw new Error('no free code');
}

/* The shop's initials for its voucher codes: "Demo Motors Cebu" → DM */
export function voucherPrefix(shopName) {
  const words = String(shopName || '').toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words[0][0] + words[1][0];
  if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 2);
  return 'DM';
}

export function validatePromo(p) {
  const e = {};
  if (!String(p.name || '').trim()) e.name = 'Give the promo a name.';
  const s = Date.parse(p.startsAt);
  const end = Date.parse(p.endsAt);
  if (!Number.isFinite(s)) e.startsAt = 'Pick when the promo starts.';
  if (!Number.isFinite(end) || (Number.isFinite(s) && end <= s)) e.endsAt = 'The end must be after the start.';
  const prizes = Array.isArray(p.prizes) ? p.prizes : [];
  const total = prizes.reduce((n, x) => n + units(x.chance), 0) / 100;
  if (prizes.length < MIN_PRIZES || prizes.length > MAX_PRIZES) e.prizes = `The wheel needs ${MIN_PRIZES} to ${MAX_PRIZES} prizes.`;
  else if (prizes.some(x => !String(x.label || '').trim())) e.prizes = 'Every prize needs a name.';
  else if (prizes.some(x => !(units(x.chance) > 0))) e.prizes = 'Every prize needs a chance above 0%.';
  else if (Math.abs(total - 100) > 1e-9) e.prizes = `The chances add up to ${Math.round(total * 100) / 100}%. They must add up to 100%.`;
  return e;
}

export const promoStatus = (p, now) => eventStatus(p, now);

/* The promo buyers see now: a live event carrying a live promo, or null */
export function activePromo(events, promos, now) {
  for (const event of events) {
    if (!event.promoId || eventStatus(event, now) !== 'live') continue;
    const promo = promos.find(p => p.id === event.promoId);
    if (promo && promoStatus(promo, now) === 'live') return { promo, event };
  }
  return null;
}

const normCode = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
export const findPromoByCode = (promos, code) => (normCode(code) ? promos.find(p => normCode(p.code) === normCode(code)) || null : null);

export const normEmail = (s) => String(s || '').trim().toLowerCase();
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

/* This email's claim on this promo, if there is one */
export const claimFor = (promoId, email, claims) =>
  claims.find(c => c.promoId === promoId && normEmail(c.email) === normEmail(email)) || null;

export const voucherExpires = (claim) => new Date(Date.parse(claim.claimedAt) + VOUCHER_DAYS * DAY);

export function voucherStatus(claim, now) {
  if (claim.redeemedAt) return 'redeemed';
  return now.getTime() >= voucherExpires(claim).getTime() ? 'expired' : 'unused';
}

/* ── the wheel ── */

/* Each prize's slice in degrees, clockwise from the top, as big as its chance (the odds
   are what buyers see). 0% prizes get no slice. */
export function wheelSlices(prizes) {
  const live = prizes.filter(p => units(p.chance) > 0);
  const total = live.reduce((n, p) => n + units(p.chance), 0) || 1;
  let at = 0;
  return live.map(prize => {
    const start = at;
    at += (units(prize.chance) / total) * 360;
    return { prize, start, end: at };
  });
}

/* How far to turn the wheel (clockwise, at least 5 full turns) so the pointer at the top
   stops inside the won prize's slice, away from its edges */
export function landingAngle(slices, prizeId, rand) {
  const s = slices.find(x => x.prize.id === prizeId) || slices[0];
  const at = s.start + (s.end - s.start) * (0.2 + 0.6 * Math.min(Math.max(Number(rand) || 0, 0), 1));
  return 5 * 360 + ((360 - at) % 360);
}
