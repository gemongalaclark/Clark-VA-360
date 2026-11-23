// Run: node --test "FRONTEND/src/components/SHOWROOM 360/showroomRules.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  carTitle, formatPeso, nextStockNo, eventStatus, effectivePrice, featuredCars, recentlySold,
  loanQuote, monthlyFrom, filterCars, parseQuery, toQuery, daysInStock, AGING_DAYS,
  isPhMobile, validateCar, validateEvent, validateLead, inquiryText, fbCaption, DEFAULT_FINANCING,
  messengerUrl, viberUrl, toIntlMobile, mapsOpenUrl, parseShowroomPath,
  clampDownPct, newPhotoId, orphanPhotoIds, saveErrorKind, liveEventsWithCars,
  priceBounds, priceFilter, parsePesoInput, priceAtPosition, positionOfPrice, PRICE_POSITIONS,
  roleForPin, canOpen, themeFor, themeToSave,
} from './showroomRules.js';
import { makeSeed, normalizeData, DEFAULT_SETTINGS } from './seedData.js';
import { t, DICT } from './i18n.js';
import { MODELS } from '../CARMARK 360/carData.js';

const NOW = new Date('2026-11-23T02:00:00Z');
const DAY = 864e5;
const at = (days) => new Date(NOW.getTime() + days * DAY).toISOString();

const car = (over = {}) => ({
  id: 'c1', stockNo: 'SR-0001', year: 2019, make: 'Toyota', model: 'Vios', variant: '1.3 E', body: 'sedan',
  transmission: 'automatic', fuel: 'gasoline', engine: '1.3L', drive: '4x2', seats: 5, odometer: 45000, color: 'silver',
  price: 548000, negotiable: true, financing: true, orcr: 'complete', regUntil: '2027-03', owners: '1', plateEnding: '',
  floodFree: 'yes', accidentFree: 'unknown', casaMaintained: 'no', knownIssues: '', description: '',
  status: 'available', soldAt: null, featured: false, photoIds: [], listedAt: at(-10), ...over,
});
const ev = (over = {}) => ({ id: 'e1', name: 'Christmas Sale', tagline: '', startsAt: at(-3), endsAt: at(30), items: [], ...over });
const SETTINGS = { shopName: 'Demo Motors Cebu', phone: '0900 000 0000', address: 'Mandaue City, Cebu', financing: DEFAULT_FINANCING };

/* ── titles, money, stock numbers ── */

test('carTitle joins year, make, model, variant and a short transmission', () => {
  assert.equal(carTitle(car()), '2019 Toyota Vios 1.3 E AT');
  assert.equal(carTitle(car({ transmission: 'manual' })), '2019 Toyota Vios 1.3 E MT');
  assert.equal(carTitle(car({ transmission: 'cvt' })), '2019 Toyota Vios 1.3 E CVT');
  assert.equal(carTitle(car({ model: 'Wigo', variant: '' })), '2019 Toyota Wigo AT');
});

test('formatPeso writes whole pesos with commas', () => {
  assert.equal(formatPeso(548000), '₱548,000');
  assert.equal(formatPeso(0), '₱0');
});

test('nextStockNo continues from the highest number', () => {
  assert.equal(nextStockNo([]), 'SR-0001');
  assert.equal(nextStockNo([{ stockNo: 'SR-0009' }, { stockNo: 'SR-0012' }, { stockNo: 'junk' }]), 'SR-0013');
});

/* ── events and prices ── */

test('an event is live from its start up to, not including, its end', () => {
  const e = ev({ startsAt: at(0), endsAt: at(5) });
  assert.equal(eventStatus(e, new Date(at(-1))), 'upcoming');
  assert.equal(eventStatus(e, new Date(at(0))), 'live');
  assert.equal(eventStatus(e, new Date(at(5))), 'ended');
});

test('effectivePrice uses a live sale price only when it is lower', () => {
  const live = ev({ items: [{ carId: 'c1', salePrice: 520000 }] });
  const sale = effectivePrice(car(), [live], NOW);
  assert.equal(sale.price, 520000);
  assert.equal(sale.original, 548000);
  assert.equal(sale.event.id, 'e1');

  const ended = ev({ startsAt: at(-10), endsAt: at(-1), items: [{ carId: 'c1', salePrice: 520000 }] });
  assert.deepEqual(effectivePrice(car(), [ended], NOW), { price: 548000, original: null, event: null });

  const notLower = ev({ items: [{ carId: 'c1', salePrice: 600000 }] });
  assert.deepEqual(effectivePrice(car(), [notLower], NOW), { price: 548000, original: null, event: null });
});

test('featuredCars puts live-event cars first, then featured, newest first, without repeats', () => {
  const cars = [
    car({ id: 'a', featured: true, listedAt: at(-20) }),
    car({ id: 'b', featured: true, listedAt: at(-2) }),
    car({ id: 'c', listedAt: at(-1) }),
    car({ id: 'd', featured: true, status: 'sold', soldAt: at(-1) }),
    car({ id: 'e', featured: true, status: 'reserved' }),
  ];
  const sale = ev({ items: [{ carId: 'c', salePrice: 500000 }, { carId: 'a', salePrice: 500000 }] });
  assert.deepEqual(featuredCars(cars, [sale], NOW).map(c => c.id), ['c', 'a', 'b']);
  assert.deepEqual(featuredCars(cars, [sale], NOW, 2).map(c => c.id), ['c', 'a']);
});

test('featuredCars falls back to the 5 newest available cars', () => {
  const cars = Array.from({ length: 7 }, (_, i) => car({ id: `x${i}`, listedAt: at(-i) }));
  cars.push(car({ id: 'sold', status: 'sold', listedAt: at(0) }));
  assert.deepEqual(featuredCars(cars, [], NOW).map(c => c.id), ['x0', 'x1', 'x2', 'x3', 'x4']);
});

test('recentlySold lists sold cars, latest sale first', () => {
  const cars = [
    car({ id: 'old', status: 'sold', soldAt: at(-9) }),
    car({ id: 'new', status: 'sold', soldAt: at(-1) }),
    car({ id: 'avail' }),
  ];
  assert.deepEqual(recentlySold(cars).map(c => c.id), ['new', 'old']);
  assert.deepEqual(recentlySold(cars, 1).map(c => c.id), ['new']);
});

/* ── financing ── */

test('loanQuote uses the PH total add-on method and rounds the monthly up', () => {
  assert.deepEqual(loanQuote(500000, 30, 60, DEFAULT_FINANCING), { down: 150000, financed: 350000, monthly: 8419, allIn: 175000 });
});

test('monthlyFrom is the minimum downpayment over the longest term', () => {
  assert.equal(monthlyFrom(500000, DEFAULT_FINANCING), 8419);
});

/* ── search ── */

test('filterCars hides sold cars and needs every search word to match', () => {
  const cars = [car(), car({ id: 'c2', color: 'black', stockNo: 'SR-0002' }), car({ id: 'c3', status: 'sold' })];
  assert.deepEqual(filterCars(cars, {}, [], NOW).map(c => c.id).sort(), ['c1', 'c2']);
  assert.deepEqual(filterCars(cars, { q: 'vios silver' }, [], NOW).map(c => c.id), ['c1']);
  assert.deepEqual(filterCars(cars, { q: 'sr-0002' }, [], NOW).map(c => c.id), ['c2']);
  assert.deepEqual(filterCars(cars, { q: 'vios red' }, [], NOW), []);
});

test('filterCars filters on the sale price and on sale status', () => {
  const cars = [car(), car({ id: 'c2', price: 560000 })];
  const sale = ev({ items: [{ carId: 'c1', salePrice: 520000 }] });
  assert.deepEqual(filterCars(cars, { priceMax: 530000 }, [sale], NOW).map(c => c.id), ['c1']);
  assert.deepEqual(filterCars(cars, { onSale: true }, [sale], NOW).map(c => c.id), ['c1']);
  assert.deepEqual(filterCars(cars, { make: 'Honda' }, [sale], NOW), []);
});

test('filterCars sorts', () => {
  const cars = [
    car({ id: 'cheap', price: 400000, odometer: 90000, year: 2016, listedAt: at(-30) }),
    car({ id: 'mid', price: 500000, odometer: 10000, year: 2022, listedAt: at(-1) }),
    car({ id: 'dear', price: 900000, odometer: 50000, year: 2020, listedAt: at(-5) }),
  ];
  const ids = (sort) => filterCars(cars, { sort }, [], NOW).map(c => c.id);
  assert.deepEqual(ids(undefined), ['mid', 'dear', 'cheap']);
  assert.deepEqual(ids('price-asc'), ['cheap', 'mid', 'dear']);
  assert.deepEqual(ids('price-desc'), ['dear', 'mid', 'cheap']);
  assert.deepEqual(ids('km-asc'), ['mid', 'dear', 'cheap']);
  assert.deepEqual(ids('year-desc'), ['mid', 'dear', 'cheap']);
});

test('search state round-trips through the URL and drops empty values', () => {
  const q = { q: 'vios', make: 'Toyota', priceMax: 600000, yearMin: 2018, onSale: true, body: '', sort: 'newest' };
  const url = toQuery(q);
  assert.equal(url, '?q=vios&make=Toyota&priceMax=600000&yearMin=2018&onSale=1');
  assert.deepEqual(parseQuery(url), { q: 'vios', make: 'Toyota', priceMax: 600000, yearMin: 2018, onSale: true });
  assert.equal(toQuery({}), '');
});

/* ── stock age ── */

test('daysInStock counts whole days since listing', () => {
  assert.equal(daysInStock(car({ listedAt: at(-10) }), NOW), 10);
  assert.equal(daysInStock(car({ listedAt: at(-0.5) }), NOW), 0);
  assert.equal(AGING_DAYS, 60);
});

/* ── validation ── */

test('isPhMobile accepts 09… and +639… numbers', () => {
  assert.equal(isPhMobile('0917 123 4567'), true);
  assert.equal(isPhMobile('+639171234567'), true);
  assert.equal(isPhMobile('0917-123-4567'), true);
  assert.equal(isPhMobile('12345'), false);
  assert.equal(isPhMobile('0817 123 4567'), false);
});

test('validateCar requires the listing basics', () => {
  assert.deepEqual(validateCar(car()), {});
  const e = validateCar(car({ make: ' ', year: 1970, odometer: -1, price: 0, transmission: '' }));
  assert.ok(e.make && e.year && e.odometer && e.price && e.transmission);
  assert.ok(validateCar(car({ year: NOW.getFullYear() + 2 })).year);
});

test('validateEvent checks name, dates and sale prices', () => {
  const cars = [car()];
  assert.deepEqual(validateEvent(ev({ items: [{ carId: 'c1', salePrice: 520000 }] }), [], cars), {});
  assert.ok(validateEvent(ev({ name: '' }), [], cars).name);
  assert.ok(validateEvent(ev({ startsAt: at(5), endsAt: at(5) }), [], cars).endsAt);
  assert.ok(validateEvent(ev({ items: [{ carId: 'c1', salePrice: 548000 }] }), [], cars).items);
  assert.ok(validateEvent(ev({ items: [{ carId: 'c1', salePrice: 0 }] }), [], cars).items);
});

test('validateEvent stops one car being in two overlapping events', () => {
  const cars = [car(), car({ id: 'c2' })];
  const first = ev({ id: 'e1', startsAt: at(0), endsAt: at(10), items: [{ carId: 'c1', salePrice: 500000 }] });
  const overlapping = ev({ id: 'e2', startsAt: at(5), endsAt: at(15), items: [{ carId: 'c1', salePrice: 510000 }] });
  const backToBack = ev({ id: 'e3', startsAt: at(10), endsAt: at(20), items: [{ carId: 'c1', salePrice: 510000 }] });
  const otherCar = ev({ id: 'e4', startsAt: at(5), endsAt: at(15), items: [{ carId: 'c2', salePrice: 510000 }] });
  assert.ok(validateEvent(overlapping, [first], cars).items);
  assert.deepEqual(validateEvent(backToBack, [first], cars), {});
  assert.deepEqual(validateEvent(otherCar, [first], cars), {});
  /* editing an event never clashes with its own saved copy */
  assert.deepEqual(validateEvent(first, [first], cars), {});
});

test('validateLead needs a name and mobile, and a future date and slot for test drives', () => {
  const today = '2026-11-23';
  const ok = { type: 'test-drive', name: 'Ana', mobile: '09171234567', date: today, slot: 'morning' };
  assert.deepEqual(validateLead(ok, today), {});
  assert.ok(validateLead({ ...ok, date: '2026-11-22' }, today).date);
  assert.ok(validateLead({ ...ok, slot: '' }, today).slot);
  assert.ok(validateLead({ ...ok, mobile: '123' }, today).mobile);
  assert.ok(validateLead({ ...ok, name: '' }, today).name);
  assert.deepEqual(validateLead({ type: 'reserve', name: 'Ana', mobile: '09171234567', date: '', slot: '' }, today), {});
});

/* ── messages ── */

test('inquiryText names the car, stock number and price in either language', () => {
  const info = effectivePrice(car(), [], NOW);
  assert.equal(inquiryText(car(), info, 'en'), "Hi! I'm interested in the 2019 Toyota Vios 1.3 E AT (SR-0001, ₱548,000). Is it still available?");
  assert.equal(inquiryText(car(), info, 'ceb'), 'Hi! Interested ko sa 2019 Toyota Vios 1.3 E AT (SR-0001, ₱548,000). Available pa ni?');
});

test('fbCaption shows the sale, monthly, only stated condition items, and no link', () => {
  const sale = ev({ items: [{ carId: 'c1', salePrice: 520000 }] });
  const text = fbCaption(car(), SETTINGS, effectivePrice(car(), [sale], NOW), 'en');
  assert.match(text, /2019 Toyota Vios 1\.3 E AT/);
  assert.match(text, /₱520,000/);
  assert.match(text, /was ₱548,000/);
  assert.match(text, /\/mo/);
  assert.match(text, /Flood-free/);
  assert.doesNotMatch(text, /Accident-free/);
  assert.doesNotMatch(text, /Casa maintained/);
  assert.match(text, /#CebuCars/);
  assert.match(text, /0900 000 0000/);
  assert.doesNotMatch(text, /http/);
});

test('messengerUrl accepts a page name, @name or a pasted link', () => {
  assert.equal(messengerUrl('demomotors'), 'https://m.me/demomotors');
  assert.equal(messengerUrl('@demomotors'), 'https://m.me/demomotors');
  assert.equal(messengerUrl('https://m.me/demomotors'), 'https://m.me/demomotors');
  assert.equal(messengerUrl('https://www.facebook.com/demomotors/'), 'https://m.me/demomotors');
  assert.equal(messengerUrl('  '), null);
});

test('viberUrl uses the +63 number and carries the message as a draft', () => {
  assert.equal(toIntlMobile('0917 123 4567'), '+639171234567');
  assert.equal(toIntlMobile('+63 917 123 4567'), '+639171234567');
  assert.equal(viberUrl('0917 123 4567', 'Hi! Available pa?'), 'viber://chat?number=%2B639171234567&draft=Hi!%20Available%20pa%3F');
});

/* ── sample data ── */

test('every sample car is a valid listing priced inside CarMark\'s used range', () => {
  const { cars } = makeSeed(NOW);
  assert.equal(cars.length, 12);
  const gens = Object.fromEntries(MODELS.flatMap(m => m.generations.map(g => [g.id, g])));
  for (const c of cars) {
    assert.deepEqual(validateCar(c, NOW), {}, c.stockNo);
    const g = gens[c.genId];
    assert.ok(g, `${c.stockNo} has unknown genId ${c.genId}`);
    assert.ok(c.price >= g.price.min && c.price <= g.price.max, `${c.stockNo} ${c.price} outside ${g.id}`);
  }
  assert.equal(new Set(cars.map(c => c.stockNo)).size, 12);
});

test('sample data covers featured, sold, reserved and ageing stock', () => {
  const { cars } = makeSeed(NOW);
  assert.equal(cars.filter(c => c.featured).length, 3);
  const sold = cars.filter(c => c.status === 'sold');
  assert.equal(sold.length, 2);
  assert.ok(sold.every(c => NOW - Date.parse(c.soldAt) <= 21 * DAY && Date.parse(c.soldAt) <= NOW.getTime()));
  assert.equal(cars.filter(c => c.status === 'reserved').length, 1);
  assert.ok(cars.some(c => daysInStock(c, NOW) >= AGING_DAYS));
  assert.ok(cars.every(c => daysInStock(c, NOW) >= 3 && daysInStock(c, NOW) <= 95));
});

test('the sample Christmas Sale is live and valid', () => {
  const { cars, events, leads, settings } = makeSeed(NOW);
  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'Christmas Sale');
  assert.equal(eventStatus(events[0], NOW), 'live');
  assert.equal(events[0].items.length, 3);
  assert.deepEqual(validateEvent(events[0], [], cars), {});
  assert.ok(events[0].items.every(i => cars.find(c => c.id === i.carId).status === 'available'));
  assert.deepEqual(leads, []);
  assert.deepEqual(settings.financing, DEFAULT_FINANCING);
});

test('sample data names no real phone number', () => {
  const text = JSON.stringify(makeSeed(NOW));
  const phones = text.match(/(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g) || [];
  assert.ok(phones.length > 0);
  assert.ok(phones.every(p => p === '0900 000 0000'), phones.join(', '));
});

/* ── review fixes ── */

test('normalizeData repairs old or broken saved data instead of crashing the page', () => {
  const fixed = normalizeData({
    cars: [{ id: 'old', year: 2019, make: 'Toyota', model: 'Vios', price: 500000 }, null, { make: 'no id' }],
    events: [{ id: 'e', name: 'Sale', startsAt: at(-1), endsAt: at(1) }, 'junk'],
    leads: [{ id: 'l1', name: 'Ana' }, null],
    settings: { shopName: 'Old Shop' },
  }, NOW);
  assert.equal(fixed.settings.shopName, 'Old Shop');
  assert.deepEqual(fixed.settings.financing, DEFAULT_FINANCING);
  assert.equal(fixed.settings.pin, '0360');
  assert.deepEqual(fixed.cars.map(c => c.id), ['old']);
  assert.deepEqual(fixed.cars[0].photoIds, []);
  assert.equal(fixed.cars[0].status, 'available');
  assert.deepEqual(fixed.events[0].items, []);
  assert.equal(fixed.leads.length, 1);
  assert.equal(fixed.leads[0].status, 'new');
  /* the rules that crashed before now run */
  assert.ok(monthlyFrom(500000, fixed.settings.financing) > 0);
  assert.equal(effectivePrice(fixed.cars[0], fixed.events, NOW).price, 500000);
});

test('normalizeData keeps good data as it is', () => {
  const seed = makeSeed(NOW);
  assert.deepEqual(normalizeData(seed, NOW), seed);
});

test('mapsOpenUrl only trusts web links and fixes links pasted without https', () => {
  const base = { address: 'Mandaue City, Cebu', lat: null, lng: null };
  assert.equal(mapsOpenUrl({ ...base, mapsUrl: 'https://maps.app.goo.gl/abc' }), 'https://maps.app.goo.gl/abc');
  assert.equal(mapsOpenUrl({ ...base, mapsUrl: 'maps.app.goo.gl/abc' }), 'https://maps.app.goo.gl/abc');
  assert.equal(mapsOpenUrl({ ...base, mapsUrl: 'javascript:alert(1)' }), 'https://www.google.com/maps/search/?api=1&query=Mandaue%20City%2C%20Cebu');
  assert.equal(mapsOpenUrl({ ...base, mapsUrl: '', lat: 10.3, lng: 123.9 }), 'https://www.google.com/maps/search/?api=1&query=10.3%2C123.9');
});

test('parseShowroomPath survives a stray % in the address', () => {
  assert.deepEqual(parseShowroomPath('/showroom'), { view: 'home' });
  assert.deepEqual(parseShowroomPath('/showroom/cars'), { view: 'cars' });
  assert.deepEqual(parseShowroomPath('/showroom/cars/50%'), { view: 'car', id: '50%' });
  assert.deepEqual(parseShowroomPath('/showroom/admin/cars/car-01'), { view: 'admin', sub: 'cars', id: 'car-01' });
  assert.deepEqual(parseShowroomPath('/showroom/Admin'), { view: 'admin', sub: 'dashboard', id: null });
  assert.deepEqual(parseShowroomPath('/showroom/zzz'), { view: 'notfound' });
});

test('validateCar rejects a listing date in the future', () => {
  assert.deepEqual(validateCar(car({ listedAt: at(-30) }), NOW), {});
  assert.ok(validateCar(car({ listedAt: at(3) }), NOW).listedAt);
  assert.ok(validateCar(car({ listedAt: 'not a date' }), NOW).listedAt);
});

test('an unset contact channel says where to set it, in both languages', () => {
  assert.match(t('en', 'inq.notSet'), /Settings/);
  assert.match(t('ceb', 'inq.notSet'), /Settings/);
});

/* ── leftover review minors ── */

test('clampDownPct keeps the downpayment inside the current minimum and 60%', () => {
  assert.equal(clampDownPct(20, { minDownPct: 30 }), 30);
  assert.equal(clampDownPct(45, { minDownPct: 30 }), 45);
  assert.equal(clampDownPct(80, { minDownPct: 30 }), 60);
  assert.equal(clampDownPct(50, { minDownPct: 70 }), 70);
});

test('orphanPhotoIds finds photos no car or logo uses, but spares fresh uploads', () => {
  const old = newPhotoId(new Date(NOW.getTime() - 3 * DAY));
  const fresh = newPhotoId(new Date(NOW.getTime() - 60 * 1000));
  const used = newPhotoId(new Date(NOW.getTime() - 5 * DAY));
  const logo = newPhotoId(new Date(NOW.getTime() - 5 * DAY));
  const data = { cars: [car({ photoIds: [used] })], settings: { logoPhotoId: logo } };
  assert.match(old, /^ph-\d+-[a-z0-9]+$/);
  assert.deepEqual(orphanPhotoIds([old, fresh, used, logo, 'ph-legacy-id'], data, NOW), [old, 'ph-legacy-id']);
});

test('saveErrorKind tells a full storage apart from other failures', () => {
  assert.equal(saveErrorKind(new DOMException('full', 'QuotaExceededError')), 'full');
  assert.equal(saveErrorKind({ name: 'QuotaExceededError' }), 'full');
  assert.equal(saveErrorKind(new Error('unreadable')), 'unreadable');
  assert.equal(saveErrorKind(new Error('boom')), 'other');
});

test('liveEventsWithCars hides a live event that has no car left on sale', () => {
  const cars = [car(), car({ id: 'c2', status: 'sold' })];
  const withCar = ev({ id: 'a', items: [{ carId: 'c1', salePrice: 500000 }] });
  const empty = ev({ id: 'b', items: [] });
  const onlySold = ev({ id: 'c', items: [{ carId: 'c2', salePrice: 500000 }] });
  const gone = ev({ id: 'd', items: [{ carId: 'deleted', salePrice: 1 }] });
  assert.deepEqual(liveEventsWithCars([withCar, empty, onlySold, gone], cars, NOW).map(e => e.id), ['a']);
});

test('every English text has a Cebuano version', () => {
  const missing = Object.keys(DICT.en).filter(k => !(k in DICT.ceb));
  assert.deepEqual(missing, []);
  for (const k of ['car.prevPhoto', 'car.nextPhoto', 'home.soldStamp', 'common.dismiss', 'lead.failed', 'lead.full']) assert.ok(DICT.en[k], k);
});

test('cash-only cars never show a monthly payment', () => {
  const cash = car({ financing: false });
  assert.doesNotMatch(fbCaption(cash, SETTINGS, effectivePrice(cash, [], NOW), 'en'), /\/mo/);
  assert.doesNotMatch(fbCaption(cash, SETTINGS, effectivePrice(cash, [], NOW), 'ceb'), /bulan/);
});

/* ── price range filter ── */

test('priceBounds runs from the cheapest to the dearest car on sale, using sale prices', () => {
  const cars = [
    car({ id: 'a', price: 548000 }),
    car({ id: 'b', price: 1185000 }),
    car({ id: 'c', price: 420000 }),
    car({ id: 'sold', price: 99000, status: 'sold', soldAt: at(-2) }),
  ];
  assert.deepEqual(priceBounds(cars, [], NOW), { min: 420000, max: 1185000 });
  const sale = ev({ items: [{ carId: 'c', salePrice: 398000 }] });
  assert.deepEqual(priceBounds(cars, [sale], NOW), { min: 398000, max: 1185000 });
  assert.equal(priceBounds([], [], NOW), null);
});

test('priceFilter keeps both ends inside the showroom range and drops an end left at its bound', () => {
  const b = { min: 398000, max: 1185000 };
  assert.deepEqual(priceFilter(500000, 900000, b), { priceMin: 500000, priceMax: 900000 });
  assert.deepEqual(priceFilter(5000, 9000000, b), { priceMin: undefined, priceMax: undefined });
  assert.deepEqual(priceFilter(398000, 1185000, b), { priceMin: undefined, priceMax: undefined });
  assert.deepEqual(priceFilter(undefined, 700000, b), { priceMin: undefined, priceMax: 700000 });
  assert.deepEqual(priceFilter(600000, 600000, b), { priceMin: 600000, priceMax: 600000 });
});

test('priceFilter never lets min pass max: the end being moved stops at the other', () => {
  const b = { min: 398000, max: 1185000 };
  assert.deepEqual(priceFilter(900000, 700000, b, 'min'), { priceMin: 700000, priceMax: 700000 });
  assert.deepEqual(priceFilter(900000, 700000, b, 'max'), { priceMin: 900000, priceMax: 900000 });
  assert.deepEqual(priceFilter(500000, 900000, null), { priceMin: undefined, priceMax: undefined });
});

test('parsePesoInput reads what a shopper types, ignoring the peso sign and commas', () => {
  assert.equal(parsePesoInput('₱450,000'), 450000);
  assert.equal(parsePesoInput(' 600000 '), 600000);
  assert.equal(parsePesoInput(''), null);
  assert.equal(parsePesoInput('abc'), null);
});

test('slider positions map to whole-thousand prices with exact ends', () => {
  const b = { min: 398500, max: 1185000 };
  assert.equal(priceAtPosition(0, b), 398500);
  assert.equal(priceAtPosition(PRICE_POSITIONS, b), 1185000);
  assert.equal(priceAtPosition(PRICE_POSITIONS / 2, b) % 1000, 0);
  assert.equal(positionOfPrice(398500, b), 0);
  assert.equal(positionOfPrice(1185000, b), PRICE_POSITIONS);
  assert.equal(positionOfPrice(5000, b), 0);
  assert.equal(positionOfPrice(priceAtPosition(37, b), b), 37);
});

/* ── admin roles ── */

test('one sign-in, two PINs: 0361 opens the superadmin, 0360 the admin', () => {
  assert.equal(roleForPin('0361', DEFAULT_SETTINGS), 'superadmin');
  assert.equal(roleForPin('0360', DEFAULT_SETTINGS), 'admin');
  assert.equal(roleForPin(' 0360 ', DEFAULT_SETTINGS), 'admin');
  assert.equal(roleForPin('1234', DEFAULT_SETTINGS), null);
  assert.equal(roleForPin('', { ...DEFAULT_SETTINGS, pin: '' }), null);
});

test('only the superadmin can open Settings and History', () => {
  for (const page of ['dashboard', 'cars', 'events', 'leads']) {
    assert.equal(canOpen('admin', page), true, page);
    assert.equal(canOpen('superadmin', page), true, page);
  }
  for (const page of ['settings', 'history']) {
    assert.equal(canOpen('admin', page), false, page);
    assert.equal(canOpen('superadmin', page), true, page);
  }
  assert.equal(canOpen(null, 'cars'), false);
});

test('older saved settings get the default superadmin PIN', () => {
  const { superPin, ...old } = DEFAULT_SETTINGS;
  assert.equal(superPin, '0361');
  assert.equal(normalizeData({ settings: old }).settings.superPin, '0361');
});

test('dark mode follows the device until the visitor picks one', () => {
  assert.equal(themeFor(null, true), 'dark');
  assert.equal(themeFor(null, false), 'light');
  assert.equal(themeFor('light', true), 'light');
  assert.equal(themeFor('dark', false), 'dark');
  assert.equal(themeFor('purple', true), 'dark'); // junk in storage: back to the device
});

test('flipping back to the device setting forgets the choice', () => {
  assert.equal(themeToSave('dark', false), 'dark');
  assert.equal(themeToSave('light', true), 'light');
  assert.equal(themeToSave('light', false), null);
  assert.equal(themeToSave('dark', true), null);
});
