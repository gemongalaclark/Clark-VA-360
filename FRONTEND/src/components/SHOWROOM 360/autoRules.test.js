// Run: node --test "FRONTEND/src/components/SHOWROOM 360/autoRules.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REPLY_AFTER_MIN, FOLLOW_UP_DAYS, describeQuery, wishMatches, waitingFor, suggestedDropPrice, priceDropsDue,
  todoList, taskMessage, recordContact, withStatus, applyPriceDrop, skipPriceDrop, weekRange, weekReport, reportText,
  similarQuery, mergeWishQuery,
} from './autoRules.js';
import { effectivePrice, recentDrop, DROP_SHOWN_DAYS, DEFAULT_PRICE_RULE } from './showroomRules.js';
import { DEFAULT_SETTINGS } from './seedData.js';

/* Tuesday 24 Nov 2026, 10:00 local time */
const NOW = new Date(2026, 10, 24, 10, 0);
const MIN = 6e4;
const DAY = 864e5;
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();
const ymd = (days) => { const d = new Date(2026, 10, 24 + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const car = (over = {}) => ({
  id: 'c1', stockNo: 'SR-0001', year: 2017, make: 'Mitsubishi', model: 'Montero Sport', variant: 'GLS', body: 'suv',
  transmission: 'automatic', fuel: 'diesel', odometer: 92000, color: 'silver', price: 925000, negotiable: true, financing: true,
  status: 'available', soldAt: null, featured: false, photoIds: [], listedAt: ago(10 * DAY), ...over,
});
const lead = (over = {}) => ({
  id: 'l1', type: 'test-drive', carId: 'c1', carLabel: '2017 Mitsubishi Montero Sport GLS AT (SR-0001)', name: 'Mark D.',
  mobile: '0900 000 0001', date: ymd(3), slot: 'morning', note: '', status: 'new', createdAt: ago(10 * MIN), lang: 'en', ...over,
});
const wish = (over = {}) => lead({
  id: 'w1', type: 'wish', carId: null, carLabel: 'SUV · up to ₱900,000', date: '', slot: '', name: 'Ramon T.',
  query: { body: 'suv', priceMax: 900000 }, notifiedCarIds: [], status: 'contacted', createdAt: ago(8 * DAY), ...over,
});
const data = (over = {}) => ({
  leads: [], cars: [car()], events: [], settings: { ...DEFAULT_SETTINGS, priceRule: { ...DEFAULT_PRICE_RULE } }, ...over,
});
const kinds = (d) => todoList(d, NOW).map(x => x.kind);
const carUrl = (c) => `https://example.test/showroom/cars/${c.id}`;

/* ── reply ── */

test('a new request with no reply turns into a task after an hour', () => {
  assert.equal(REPLY_AFTER_MIN, 60);
  assert.deepEqual(kinds(data({ leads: [lead({ createdAt: ago(59 * MIN) })] })), []);
  const [task] = todoList(data({ leads: [lead({ createdAt: ago(61 * MIN) })] }), NOW);
  assert.equal(task.kind, 'reply');
  assert.equal(task.minutes, 61);
  assert.equal(task.lead.id, 'l1');
  assert.equal(task.car.id, 'c1');
});

test('closed and contacted requests never ask for a first reply', () => {
  assert.deepEqual(kinds(data({ leads: [lead({ status: 'closed', createdAt: ago(5 * DAY) })] })), []);
  assert.ok(!kinds(data({ leads: [lead({ status: 'contacted', createdAt: ago(5 * DAY) })] })).includes('reply'));
});

/* ── remind ── */

test('a contacted test drive today or tomorrow asks for a reminder, once', () => {
  const tomorrow = lead({ status: 'contacted', date: ymd(1), slot: 'afternoon', createdAt: ago(DAY) });
  const [task] = todoList(data({ leads: [tomorrow] }), NOW);
  assert.equal(task.kind, 'remind');
  assert.equal(task.when, 'tomorrow');
  assert.equal(todoList(data({ leads: [{ ...tomorrow, date: ymd(0) }] }), NOW)[0].when, 'today');
  assert.deepEqual(kinds(data({ leads: [{ ...tomorrow, reminderSentAt: ago(MIN) }] })), []);
  assert.deepEqual(kinds(data({ leads: [{ ...tomorrow, date: ymd(2) }] })), []);
});

/* ── follow up ── */

test('a reservation that went quiet for 3 days asks for a follow-up', () => {
  assert.equal(FOLLOW_UP_DAYS, 3);
  const res = lead({ type: 'reserve', date: '', slot: '', status: 'contacted', createdAt: ago(5 * DAY) });
  assert.deepEqual(kinds(data({ leads: [{ ...res, contactedAt: ago(2 * DAY) }] })), []);
  const [task] = todoList(data({ leads: [{ ...res, contactedAt: ago(3 * DAY) }] }), NOW);
  assert.equal(task.kind, 'followup');
  assert.equal(task.after, false);
});

test('a test drive still ahead is never a follow-up; the day after it is', () => {
  const ahead = lead({ status: 'contacted', date: ymd(3), contactedAt: ago(6 * DAY), createdAt: ago(6 * DAY) });
  assert.deepEqual(kinds(data({ leads: [ahead] })), []);
  const done = lead({ status: 'contacted', date: ymd(-1), contactedAt: ago(3 * DAY), reminderSentAt: ago(2 * DAY), lastContactAt: ago(2 * DAY), createdAt: ago(6 * DAY) });
  const [task] = todoList(data({ leads: [done] }), NOW);
  assert.equal(task.kind, 'followup');
  assert.equal(task.after, true);
  assert.deepEqual(kinds(data({ leads: [recordContact(done, task, NOW)] })), []);
});

test('a request saved before the autopilot (no contact times) still follows the rules', () => {
  const old = { id: 'old', type: 'reserve', carId: 'c1', carLabel: 'Montero', name: 'Old L.', mobile: '09000000009', status: 'contacted', createdAt: ago(4 * DAY) };
  const [task] = todoList(data({ leads: [old] }), NOW);
  assert.equal(task.kind, 'followup');
  assert.doesNotThrow(() => taskMessage(task, DEFAULT_SETTINGS, carUrl));
});

/* ── waitlist ── */

test('describing a saved search in words', () => {
  assert.equal(describeQuery({ body: 'suv', priceMax: 900000 }, 'en'), 'SUV · up to ₱900,000');
  assert.equal(describeQuery({ make: 'Toyota', body: 'mpv', priceMin: 500000, priceMax: 900000 }, 'en'), 'Toyota · MPV · ₱500,000–₱900,000');
  assert.equal(describeQuery({ q: 'innova', yearMin: 2018, onSale: true }, 'en'), '“innova” · 2018 or newer · On sale');
  assert.equal(describeQuery({}, 'en'), 'Any car');
  assert.notEqual(describeQuery({ priceMax: 900000 }, 'ceb'), describeQuery({ priceMax: 900000 }, 'en'));
});

test('a price drop can wake a waiting buyer', () => {
  const montero = car();
  const w = wish();
  assert.deepEqual(wishMatches(w, [montero], [], NOW), []);
  assert.deepEqual(waitingFor(montero, [w], [], NOW), []);
  const dropped = applyPriceDrop(montero, 897000, NOW);
  assert.deepEqual(wishMatches(w, [dropped], [], NOW).map(c => c.id), ['c1']);
  assert.deepEqual(waitingFor(dropped, [w], [], NOW).map(l => l.id), ['w1']);
  const [task] = todoList(data({ cars: [dropped], leads: [w] }), NOW);
  assert.equal(task.kind, 'wish');
  assert.deepEqual(task.items.map(i => [i.car.id, i.price]), [['c1', 897000]]);
  /* told once: the same car doesn't come back */
  const told = recordContact(w, task, NOW);
  assert.deepEqual(told.notifiedCarIds, ['c1']);
  assert.deepEqual(waitingFor(dropped, [told], [], NOW), []);
  assert.ok(!kinds(data({ cars: [dropped], leads: [told] })).includes('wish'));
});

test('a waiting buyer only hears about cars they can buy', () => {
  const cheap = car({ price: 850000 });
  assert.deepEqual(wishMatches(wish(), [{ ...cheap, status: 'reserved' }], [], NOW), []);
  assert.deepEqual(wishMatches(wish(), [{ ...cheap, status: 'sold' }], [], NOW), []);
  assert.deepEqual(wishMatches(wish({ status: 'closed' }), [cheap], [], NOW).length, 1);
  assert.deepEqual(waitingFor(cheap, [wish({ status: 'closed' })], [], NOW), []);
  /* a search with no filters matches any available car */
  assert.equal(wishMatches(wish({ query: {} }), [cheap, car({ id: 'c2', body: 'sedan', price: 400000 })], [], NOW).length, 2);
});

test('a new waitlist request that already matches gets the match message, not a plain reply', () => {
  const w = wish({ status: 'new', createdAt: ago(3 * 60 * MIN) });
  assert.deepEqual(kinds(data({ cars: [car({ price: 850000 })], leads: [w] })), ['wish']);
  assert.deepEqual(kinds(data({ cars: [car()], leads: [w] })), ['reply']);
});

/* ── price drops ── */

test('the suggested price is rounded down to the thousand', () => {
  assert.equal(suggestedDropPrice(925000, 3), 897000);
  assert.equal(suggestedDropPrice(418000, 3), 405000);
  assert.equal(suggestedDropPrice(1185000, 5), 1125000);
});

test('a car is due for a price drop after the rule’s days, and only when nobody is discounting it', () => {
  const rule = { on: true, days: 45, pct: 3 };
  assert.deepEqual(priceDropsDue([car({ listedAt: ago(44 * DAY) })], [], rule, NOW), []);
  const [due] = priceDropsDue([car({ listedAt: ago(45 * DAY) })], [], rule, NOW);
  assert.equal(due.price, 897000);
  assert.equal(due.days, 45);
  assert.deepEqual(priceDropsDue([car({ listedAt: ago(90 * DAY) })], [], { ...rule, on: false }, NOW), []);
  assert.deepEqual(priceDropsDue([car({ listedAt: ago(90 * DAY), status: 'reserved' })], [], rule, NOW), []);
  const upcoming = { id: 'e1', name: 'Payday', startsAt: ago(-2 * DAY), endsAt: ago(-9 * DAY), items: [{ carId: 'c1', salePrice: 880000 }] };
  const ended = { ...upcoming, startsAt: ago(20 * DAY), endsAt: ago(10 * DAY) };
  assert.deepEqual(priceDropsDue([car({ listedAt: ago(90 * DAY) })], [upcoming], rule, NOW), []);
  assert.equal(priceDropsDue([car({ listedAt: ago(90 * DAY) })], [ended], rule, NOW).length, 1);
});

test('after a drop or a skip, the next suggestion waits another full period', () => {
  const rule = { on: true, days: 45, pct: 3 };
  const listed = car({ listedAt: ago(45 * DAY) });
  const skipped = skipPriceDrop(listed, NOW);
  assert.deepEqual(priceDropsDue([skipped], [], rule, NOW), []);
  assert.deepEqual(priceDropsDue([skipped], [], rule, new Date(NOW.getTime() + 44 * DAY)), []);
  assert.equal(priceDropsDue([skipped], [], rule, new Date(NOW.getTime() + 45 * DAY)).length, 1);
  const dropped = applyPriceDrop(listed, 897000, NOW);
  assert.deepEqual(dropped.priceDrop, { from: 925000, at: NOW.toISOString() });
  assert.equal(dropped.price, 897000);
  assert.deepEqual(priceDropsDue([dropped], [], rule, NOW), []);
});

test('the public site shows a drop for 14 days, and a live sale still wins', () => {
  assert.equal(DROP_SHOWN_DAYS, 14);
  const dropped = applyPriceDrop(car(), 897000, new Date(NOW.getTime() - 13 * DAY));
  assert.deepEqual(effectivePrice(dropped, [], NOW), { price: 897000, original: 925000, event: null, dropped: true });
  assert.ok(recentDrop(dropped, NOW));
  const old = applyPriceDrop(car(), 897000, new Date(NOW.getTime() - 14 * DAY));
  assert.deepEqual(effectivePrice(old, [], NOW), { price: 897000, original: null, event: null, dropped: false });
  const sale = { id: 'e1', name: 'Payday', startsAt: ago(DAY), endsAt: ago(-DAY), items: [{ carId: 'c1', salePrice: 880000 }] };
  const info = effectivePrice(dropped, [sale], NOW);
  assert.equal(info.price, 880000);
  assert.equal(info.original, 897000);
  assert.equal(info.event.id, 'e1');
  assert.equal(info.dropped, false);
  /* a price raised again is not a drop */
  assert.equal(recentDrop({ ...dropped, price: 930000 }, NOW), null);
});

test('buyers who asked about a car hear about its price drop, once', () => {
  const asked = lead({ status: 'contacted', type: 'reserve', date: '', slot: '', contactedAt: ago(DAY), createdAt: ago(DAY) });
  const dropped = applyPriceDrop(car(), 897000, NOW);
  const [task] = todoList(data({ cars: [dropped], leads: [asked] }), NOW);
  assert.equal(task.kind, 'dropped');
  assert.equal(task.price, 897000);
  assert.equal(task.was, 925000);
  assert.deepEqual(kinds(data({ cars: [dropped], leads: [recordContact(asked, task, NOW)] })), []);
  /* a drop from before they asked is old news */
  const later = lead({ status: 'contacted', type: 'reserve', date: '', slot: '', contactedAt: ago(-MIN), createdAt: ago(-MIN) });
  assert.ok(!kinds(data({ cars: [dropped], leads: [later] })).includes('dropped'));
});

/* ── the list ── */

test('the to-do list puts the most urgent first', () => {
  const d = data({
    cars: [
      car({ id: 'old', listedAt: ago(80 * DAY) }),
      applyPriceDrop(car({ id: 'dr' }), 897000, NOW),
    ],
    leads: [
      lead({ id: 'f', type: 'reserve', date: '', slot: '', status: 'contacted', carId: 'old', contactedAt: ago(4 * DAY), createdAt: ago(5 * DAY) }),
      lead({ id: 'd', type: 'reserve', date: '', slot: '', status: 'contacted', carId: 'dr', contactedAt: ago(DAY), createdAt: ago(DAY) }),
      wish({ id: 'w', query: { body: 'suv', priceMax: 900000 } }),
      lead({ id: 'm', status: 'contacted', carId: 'old', date: ymd(1), contactedAt: ago(DAY), createdAt: ago(DAY) }),
      lead({ id: 'r', carId: 'old', createdAt: ago(2 * 60 * MIN) }),
    ],
  });
  assert.deepEqual(kinds(d), ['reply', 'remind', 'wish', 'dropped', 'followup', 'drop']);
  assert.equal(new Set(todoList(d, NOW).map(x => x.key)).size, 6);
});

/* ── messages ── */

test('every message reads cleanly, even with no shop address', () => {
  const s = { ...DEFAULT_SETTINGS, address: '' };
  const d = data({
    cars: [car({ id: 'old', listedAt: ago(80 * DAY) }), applyPriceDrop(car({ id: 'dr' }), 897000, NOW)],
    leads: [
      lead({ id: 'r', carId: 'old', createdAt: ago(2 * 60 * MIN) }),
      lead({ id: 'm', status: 'contacted', carId: 'old', date: ymd(1), contactedAt: ago(DAY), createdAt: ago(DAY) }),
      wish({ id: 'w' }),
      wish({ id: 'wn', status: 'new', createdAt: ago(3 * 60 * MIN), query: { make: 'Honda' } }),
      lead({ id: 'd', type: 'reserve', date: '', slot: '', status: 'contacted', carId: 'dr', contactedAt: ago(DAY), createdAt: ago(DAY) }),
      lead({ id: 'f', type: 'reserve', date: '', slot: '', status: 'contacted', carId: 'old', contactedAt: ago(4 * DAY), createdAt: ago(5 * DAY) }),
      lead({ id: 'a', status: 'contacted', carId: 'old', date: ymd(-1), contactedAt: ago(4 * DAY), createdAt: ago(5 * DAY) }),
    ],
  });
  const tasks = todoList(d, NOW).filter(x => x.lead);
  assert.equal(tasks.length, 7);
  for (const task of tasks) {
    for (const lang of ['en', 'ceb']) {
      const text = taskMessage(task, s, carUrl, lang);
      assert.match(text, /^Hi (Mark D\.|Ramon T\.)!/, text);
      assert.doesNotMatch(text, /undefined|null|NaN|\{\w+\}| ,|,,|\.\.| \./, text);
    }
    assert.notEqual(taskMessage(task, s, carUrl, 'en'), taskMessage(task, s, carUrl, 'ceb'));
  }
  const remind = tasks.find(x => x.kind === 'remind');
  assert.match(taskMessage(remind, DEFAULT_SETTINGS, carUrl, 'en'), /Mandaue City, Cebu/);
  assert.match(taskMessage(tasks.find(x => x.kind === 'wish'), s, carUrl, 'en'), /example\.test\/showroom\/cars\/dr/);
  /* the buyer's own language is the default */
  assert.equal(taskMessage(remind, s, carUrl), taskMessage(remind, s, carUrl, 'en'));
  assert.equal(taskMessage({ ...remind, lead: { ...remind.lead, lang: 'ceb' } }, s, carUrl), taskMessage(remind, s, carUrl, 'ceb'));
});

test('sending a message records it, and the first one marks the request contacted', () => {
  const l = lead({ createdAt: ago(2 * 60 * MIN) });
  const sent = recordContact(l, { kind: 'reply' }, NOW);
  assert.equal(sent.status, 'contacted');
  assert.equal(sent.contactedAt, NOW.toISOString());
  assert.equal(sent.lastContactAt, NOW.toISOString());
  const later = new Date(NOW.getTime() + DAY);
  const reminded = recordContact(sent, { kind: 'remind' }, later);
  assert.equal(reminded.contactedAt, NOW.toISOString());
  assert.equal(reminded.reminderSentAt, later.toISOString());
  /* a closed request stays closed */
  assert.equal(recordContact({ ...l, status: 'closed' }, { kind: 'followup' }, NOW).status, 'closed');
});

test('changing the status by hand stamps the first contact once', () => {
  const l = lead();
  const c = withStatus(l, 'contacted', NOW);
  assert.equal(c.contactedAt, NOW.toISOString());
  const closed = withStatus(c, 'closed', new Date(NOW.getTime() + DAY));
  assert.equal(closed.contactedAt, NOW.toISOString());
  assert.equal(withStatus(l, 'new', NOW).contactedAt, undefined);
});

/* ── week report ── */

test('weeks start on Monday at midnight, local time', () => {
  const tue = new Date(2026, 10, 24, 0, 30);
  assert.deepEqual([weekRange(tue, 'last').start, weekRange(tue, 'last').end], [new Date(2026, 10, 16), new Date(2026, 10, 23)]);
  assert.deepEqual([weekRange(tue, 'this').start, weekRange(tue, 'this').end], [new Date(2026, 10, 23), tue]);
  const mon = new Date(2026, 10, 23, 0, 10);
  assert.deepEqual(weekRange(mon, 'this').start, new Date(2026, 10, 23));
  assert.deepEqual(weekRange(mon, 'last').start, new Date(2026, 10, 16));
  const sun = new Date(2026, 10, 29, 22, 0);
  assert.deepEqual(weekRange(sun, 'this').start, new Date(2026, 10, 23));
});

test('the week report counts only that week', () => {
  const range = weekRange(NOW, 'last');               /* Mon 16 – Mon 23 Nov */
  const start = range.start.getTime();
  const t = (ms) => new Date(start + ms).toISOString();
  const H = 36e5;
  const leads = [
    lead({ id: 'a', createdAt: t(-MIN) }),                                                /* the Sunday before: out */
    lead({ id: 'b', createdAt: t(0), contactedAt: t(30 * MIN), carId: 'c1' }),            /* replied in 30 min */
    lead({ id: 'c', type: 'reserve', createdAt: t(DAY), contactedAt: t(DAY + 2 * H), carId: 'c1' }),   /* 2 hrs */
    wish({ id: 'd', createdAt: t(2 * DAY), contactedAt: undefined, status: 'new' }),      /* never replied */
    lead({ id: 'e', createdAt: t(7 * DAY) }),                                             /* this week: out */
  ];
  const cars = [
    car({ id: 'c1', listedAt: t(-20 * DAY), status: 'sold', soldAt: t(3 * DAY), price: 900000 }),
    car({ id: 'c2', listedAt: t(-40 * DAY), status: 'sold', soldAt: t(-MIN), price: 500000 }),
    car({ id: 'c3', listedAt: t(DAY), status: 'available', price: 700000, priceDrop: { from: 720000, at: t(2 * DAY) } }),
    car({ id: 'c4', listedAt: t(-60 * DAY), status: 'available' }),
  ];
  const r = weekReport({ leads, cars }, range, NOW);
  assert.deepEqual(r.requests, { total: 3, testDrive: 1, reserve: 1, wish: 1 });
  assert.equal(r.reply.avgMin, 75);                    /* (30 + 120) / 2 */
  assert.equal(r.reply.overHour, 2);                   /* c waited 2 hrs, d still waiting */
  assert.deepEqual(r.sold, { count: 1, total: 900000, avgDays: 23 });
  assert.equal(r.added, 1);
  assert.equal(r.priceDrops, 1);
  assert.deepEqual([r.mostAsked.label, r.mostAsked.n], ['2017 Mitsubishi Montero Sport GLS AT', 2]);
  assert.equal(r.slowest.car.id, 'c4');
  const text = reportText(r, DEFAULT_SETTINGS, range);
  assert.match(text, /Demo Motors Cebu/);
  assert.match(text, /Nov 16/);
  assert.match(text, /Nov 22/);
  assert.match(text, /₱900,000/);
  assert.doesNotMatch(text, /undefined|null|NaN/);
});

test('a quiet week still reads cleanly', () => {
  const range = weekRange(NOW, 'this');
  const r = weekReport({ leads: [], cars: [] }, range, NOW);
  assert.equal(r.reply.avgMin, null);
  assert.equal(r.sold.avgDays, null);
  assert.equal(r.mostAsked, null);
  assert.equal(r.slowest, null);
  const text = reportText(r, { ...DEFAULT_SETTINGS, shopName: '' }, range);
  assert.doesNotMatch(text, /undefined|null|NaN|: $/m);
  assert.match(text, /today/);
});

/* ── waitlist form ── */

test('a sold or reserved car offers a search for similar ones', () => {
  assert.deepEqual(similarQuery(car({ make: 'Toyota', body: 'mpv' }), 568000), { make: 'Toyota', body: 'mpv', priceMax: 630000 });
  assert.deepEqual(similarQuery(car({ make: '', body: '' }), 500000), { priceMax: 550000 });
});

test('the waitlist form keeps the filters a buyer set and changes only what they edit', () => {
  const base = { make: 'Toyota', transmission: 'automatic', priceMin: 300000, priceMax: 900000, sort: 'price-asc' };
  assert.deepEqual(mergeWishQuery(base, { make: 'Toyota', body: 'suv', q: ' fortuner ', priceMax: '1000000' }),
    { make: 'Toyota', transmission: 'automatic', priceMin: 300000, priceMax: 1000000, body: 'suv', q: 'fortuner' });
  /* clearing a field drops it; a minimum above the new budget goes too */
  assert.deepEqual(mergeWishQuery(base, { make: '', body: '', q: '', priceMax: '200000' }), { transmission: 'automatic', priceMax: 200000 });
  assert.deepEqual(mergeWishQuery({}, { make: '', body: '', q: '', priceMax: '' }), {});
  assert.equal(describeQuery(mergeWishQuery({}, { body: 'suv', priceMax: '900000' }), 'en'), 'SUV · up to ₱900,000');
});
