// Run: node --test "FRONTEND/src/components/SHOWROOM 360/promoRules.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE_CHARS, VOUCHER_DAYS, MIN_PRIZES, MAX_PRIZES, pickPrize, newCode, validatePromo, promoStatus, activePromo,
  findPromoByCode, normEmail, isEmail, claimFor, voucherStatus, voucherPrefix, wheelSlices, landingAngle,
} from './promoRules.js';

const NOW = new Date(2026, 10, 24, 10, 0);
const DAY = 864e5;
const at = (days) => new Date(NOW.getTime() + days * DAY).toISOString();

const PRIZES = [
  { id: 'p1', label: '₱5,000 off', chance: 40 },
  { id: 'p2', label: 'Full tank', chance: 30 },
  { id: 'p3', label: 'Freebies', chance: 25 },
  { id: 'p4', label: '₱10,000 off', chance: 5 },
];
const promo = (over = {}) => ({
  id: 'promo-1', name: 'Christmas Spin', code: 'SPIN-XMAS', permit: '', prizes: PRIZES,
  startsAt: at(-3), endsAt: at(30), createdAt: at(-3), ...over,
});
const event = (over = {}) => ({ id: 'e1', name: 'Christmas Sale', startsAt: at(-3), endsAt: at(30), items: [], promoId: 'promo-1', ...over });
/* a stand-in for Math.random that returns the given numbers in turn */
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test('the wheel picks each prize as often as its chance says', () => {
  const pick = (r) => pickPrize(PRIZES, r).id;
  assert.equal(pick(0), 'p1');
  assert.equal(pick(0.3999), 'p1');
  assert.equal(pick(0.4), 'p2');
  assert.equal(pick(0.6999), 'p2');
  assert.equal(pick(0.7), 'p3');
  assert.equal(pick(0.9499), 'p3');
  assert.equal(pick(0.95), 'p4');
  assert.equal(pick(0.9999), 'p4');
  /* a 0% prize is never won, even at the edges */
  const withZero = [{ id: 'a', chance: 0 }, { id: 'b', chance: 100 }, { id: 'c', chance: 0 }];
  for (const r of [0, 0.5, 0.9999]) assert.equal(pickPrize(withZero, r).id, 'b');
});

test('codes are random, readable and never repeat', () => {
  assert.equal(CODE_CHARS.length, 31);
  assert.doesNotMatch(CODE_CHARS, /[01OIL]/);
  const code = newCode('SPIN', [], seq(0));
  assert.equal(code, 'SPIN-AAAA');
  assert.notEqual(newCode('SPIN', ['SPIN-AAAA'], seq(0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5)), 'SPIN-AAAA');
  const voucher = newCode('DM', [], Math.random, 8);
  assert.match(voucher, new RegExp(`^DM-[${CODE_CHARS}]{4}-[${CODE_CHARS}]{4}$`));
  assert.equal(voucherPrefix('Demo Motors Cebu'), 'DM');
  assert.equal(voucherPrefix('  autohaus  '), 'AU');
  assert.equal(voucherPrefix(''), 'DM');
});

test('a promo needs a name, an end after its start, 2 to 8 prizes, and chances adding up to 100', () => {
  assert.equal(MIN_PRIZES, 2);
  assert.equal(MAX_PRIZES, 8);
  assert.deepEqual(validatePromo(promo()), {});
  assert.ok(validatePromo(promo({ name: ' ' })).name);
  assert.ok(validatePromo(promo({ endsAt: at(-4) })).endsAt);
  assert.match(validatePromo(promo({ prizes: PRIZES.map((p, i) => (i === 0 ? { ...p, chance: 39 } : p)) })).prizes, /99%/);
  assert.ok(validatePromo(promo({ prizes: [{ id: 'x', label: 'All', chance: 100 }] })).prizes);
  const nine = Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, label: `Prize ${i}`, chance: i === 0 ? 20 : 10 }));
  assert.ok(validatePromo(promo({ prizes: nine })).prizes);
  assert.ok(validatePromo(promo({ prizes: PRIZES.map((p, i) => (i === 1 ? { ...p, label: ' ' } : p)) })).prizes);
  assert.ok(validatePromo(promo({ prizes: [{ id: 'a', label: 'A', chance: 100 }, { id: 'b', label: 'B', chance: 0 }] })).prizes);
});

test('the pop-up runs only while both the event and its promo are live', () => {
  assert.equal(promoStatus(promo(), NOW), 'live');
  assert.equal(promoStatus(promo({ startsAt: at(1) }), NOW), 'upcoming');
  assert.equal(promoStatus(promo({ endsAt: at(-1) }), NOW), 'ended');
  const found = activePromo([event()], [promo()], NOW);
  assert.equal(found.promo.id, 'promo-1');
  assert.equal(found.event.id, 'e1');
  assert.equal(activePromo([event({ endsAt: at(-1) })], [promo()], NOW), null);
  assert.equal(activePromo([event({ startsAt: at(2) })], [promo()], NOW), null);
  assert.equal(activePromo([event()], [promo({ endsAt: at(-1) })], NOW), null);
  assert.equal(activePromo([event({ promoId: null })], [promo()], NOW), null);
  assert.equal(activePromo([event({ promoId: 'gone' })], [promo()], NOW), null);
});

test('a promo code is found whatever the case or spaces', () => {
  assert.equal(findPromoByCode([promo()], ' spin-xmas ').id, 'promo-1');
  assert.equal(findPromoByCode([promo()], 'SPIN-NOPE'), null);
  assert.equal(findPromoByCode([promo()], ''), null);
});

test('one claim per email per promo', () => {
  assert.equal(normEmail('  Ana@Mail.COM '), 'ana@mail.com');
  assert.ok(isEmail('ana@mail.com'));
  for (const bad of ['', 'ana', 'ana@', 'ana@mail', '@mail.com', 'a b@mail.com']) assert.ok(!isEmail(bad), bad);
  const claims = [{ id: 'c1', promoId: 'promo-1', email: 'ana@mail.com' }];
  assert.equal(claimFor('promo-1', ' Ana@Mail.com ', claims).id, 'c1');
  assert.equal(claimFor('promo-2', 'ana@mail.com', claims), null);
  assert.equal(claimFor('promo-1', 'ben@mail.com', claims), null);
});

test('a voucher is good for 30 days unless it has been used', () => {
  assert.equal(VOUCHER_DAYS, 30);
  const claim = { claimedAt: NOW.toISOString(), redeemedAt: null };
  assert.equal(voucherStatus(claim, new Date(NOW.getTime() + 29 * DAY)), 'unused');
  assert.equal(voucherStatus(claim, new Date(NOW.getTime() + 30 * DAY)), 'expired');
  assert.equal(voucherStatus({ ...claim, redeemedAt: at(40) }, new Date(NOW.getTime() + 60 * DAY)), 'redeemed');
});

test('each prize’s slice of the wheel is as big as its chance', () => {
  const slices = wheelSlices(PRIZES);
  assert.deepEqual(slices.map(x => [x.prize.id, x.start, x.end]), [['p1', 0, 144], ['p2', 144, 252], ['p3', 252, 342], ['p4', 342, 360]]);
  /* a 0% prize gets no slice */
  assert.deepEqual(wheelSlices([{ id: 'a', chance: 0 }, { id: 'b', chance: 100 }]).map(x => x.prize.id), ['b']);
});

test('the wheel stops with the pointer inside the won prize’s slice', () => {
  const slices = wheelSlices(PRIZES);
  for (const s of slices) {
    for (const r of [0, 0.5, 0.9999]) {
      const turn = landingAngle(slices, s.prize.id, r);
      assert.ok(turn >= 5 * 360, 'at least five full turns');
      /* the pointer sits at the top: the wheel's angle under it after turning */
      const under = (360 - (turn % 360)) % 360;
      assert.ok(under > s.start && under < s.end, `${s.prize.id} r=${r} under=${under}`);
    }
  }
});
