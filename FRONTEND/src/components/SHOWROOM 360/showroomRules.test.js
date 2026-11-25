// Run: node --test "FRONTEND/src/components/SHOWROOM 360/showroomRules.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SAMPLE_ANGLES, isSamplePhoto, samplePhotoUrl, sampleCredit } from './samplePhotos.js';
import {
  carTitle, formatPeso, nextStockNo, eventStatus, effectivePrice, featuredCars, recentlySold, bandCars, similarCars, toggleSaved, parseSaved,
  loanQuote, monthlyFrom, filterCars, parseQuery, toQuery, daysInStock, AGING_DAYS,
  isPhMobile, validateCar, validateEvent, validateLead, inquiryText, fbCaption, DEFAULT_FINANCING,
  messengerUrl, viberUrl, toIntlMobile, mapsOpenUrl, parseShowroomPath,
  clampDownPct, newPhotoId, orphanPhotoIds, saveErrorKind, liveEventsWithCars,
  priceBounds, priceFilter, parsePesoInput, priceAtPosition, positionOfPrice, PRICE_POSITIONS,
  roleForPin, canOpen, canAddEvent, canManagePromos, themeFor, themeToSave, clampView, zoomAt, ZOOM_MAX, smsUrl,
  reservedUntilFor, expireReservations, INSPECTION, inspectionSummary, watermarkLabel, refCode, agentCodeFor, agentStats,
  affordablePrice,
} from './showroomRules.js';
import { makeSeed, normalizeData, applySamplePhotos, applySampleLeads, sampleLeads, applySamplePromo, applySampleTools, DEFAULT_SETTINGS } from './seedData.js';
import { validatePromo, activePromo } from './promoRules.js';
import { todoList, waitingFor, applyPriceDrop, suggestedDropPrice } from './autoRules.js';
import { t, DICT, FINANCING_DOCS, FAQ_IDS } from './i18n.js';
import { legalDoc, LEGAL_KINDS } from './legalText.js';
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
  assert.deepEqual(effectivePrice(car(), [ended], NOW), { price: 548000, original: null, event: null, dropped: false });

  const notLower = ev({ items: [{ carId: 'c1', salePrice: 600000 }] });
  assert.deepEqual(effectivePrice(car(), [notLower], NOW), { price: 548000, original: null, event: null, dropped: false });
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

test('bandCars picks unsold cars with photos, newest listed first', () => {
  const cars = [
    car({ id: 'sold', status: 'sold', photoIds: ['p1'], listedAt: at(-2) }),
    car({ id: 'bare', photoIds: [], listedAt: at(0) }),
    car({ id: 'older', photoIds: ['p2'], listedAt: at(-5) }),
    car({ id: 'reserved', status: 'reserved', photoIds: ['p3'], listedAt: at(-1) }),
  ];
  assert.deepEqual(bandCars(cars).map(c => c.id), ['reserved', 'older']);
  assert.deepEqual(cars.map(c => c.id), ['sold', 'bare', 'older', 'reserved']);
  assert.deepEqual(bandCars([]), []);
});

test('similarCars puts the same body type first, then the closest price', () => {
  const here = car({ id: 'here', body: 'suv', price: 1000000 });
  const cars = [
    here,
    car({ id: 'sedan-close', body: 'sedan', price: 1000000 }),
    car({ id: 'suv-far', body: 'suv', price: 1600000 }),
    car({ id: 'suv-near', body: 'suv', price: 950000 }),
    car({ id: 'sedan-far', body: 'sedan', price: 400000 }),
  ];
  assert.deepEqual(similarCars(cars, here, [], NOW).map(c => c.id), ['suv-near', 'suv-far', 'sedan-close', 'sedan-far']);
});

test('similarCars leaves out this car, sold and reserved cars, and stops at n', () => {
  const here = car({ id: 'here' });
  const cars = [
    here,
    car({ id: 'sold', status: 'sold' }),
    car({ id: 'reserved', status: 'reserved' }),
    ...['a', 'b', 'c', 'd', 'e'].map((id, i) => car({ id, price: 548000 + (i + 1) * 10000 })),
  ];
  assert.deepEqual(similarCars(cars, here, [], NOW).map(c => c.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(similarCars(cars, here, [], NOW, 2).map(c => c.id), ['a', 'b']);
  assert.deepEqual(similarCars([here], here, [], NOW), []);
});

test('similarCars compares the prices buyers pay now (sale prices)', () => {
  const here = car({ id: 'here', price: 500000 });
  const cars = [
    here,
    car({ id: 'listed-near', price: 560000 }),
    car({ id: 'on-sale', price: 700000 }),
  ];
  const sale = ev({ items: [{ carId: 'on-sale', salePrice: 520000 }] });
  assert.deepEqual(similarCars(cars, here, [sale], NOW).map(c => c.id), ['on-sale', 'listed-near']);
});

test('similarCars lists newer cars first when the match is equal', () => {
  const here = car({ id: 'here' });
  const cars = [here, car({ id: 'old', listedAt: at(-20) }), car({ id: 'new', listedAt: at(-1) })];
  assert.deepEqual(similarCars(cars, here, [], NOW).map(c => c.id), ['new', 'old']);
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

test('a trade-in needs the car being traded, and nothing a test drive needs', () => {
  const today = '2026-11-23';
  const ok = { type: 'trade-in', name: 'Ana', mobile: '09171234567', date: '', slot: '', tradeCar: '2016 Toyota Vios 1.3 E MT' };
  assert.deepEqual(validateLead(ok, today), {});
  assert.ok(validateLead({ ...ok, tradeCar: '  ' }, today).tradeCar);
  assert.ok(validateLead({ ...ok, tradeCar: undefined }, today).tradeCar);
  assert.equal(validateLead({ type: 'reserve', name: 'Ana', mobile: '09171234567' }, today).tradeCar, undefined);
});

/* ── saved cars (kept in the buyer's browser) ── */

test('toggleSaved puts a car at the front of the list, or takes it off', () => {
  const ids = ['a', 'b'];
  assert.deepEqual(toggleSaved(ids, 'c'), ['c', 'a', 'b']);
  assert.deepEqual(toggleSaved(ids, 'a'), ['b']);
  assert.deepEqual(ids, ['a', 'b']);
});

test('parseSaved reads the saved list and shrugs off anything broken', () => {
  assert.deepEqual(parseSaved('["a","b","a",""," ",3]'), ['a', 'b']);
  assert.deepEqual(parseSaved(null), []);
  assert.deepEqual(parseSaved('not json'), []);
  assert.deepEqual(parseSaved('{"a":1}'), []);
});

test('the saved-cars filter survives the address bar', () => {
  assert.deepEqual(parseQuery('?saved=1'), { saved: true });
  assert.deepEqual(parseQuery('?saved=0'), {});
  assert.equal(toQuery({ body: 'suv', saved: true }), '?body=suv&saved=1');
  assert.equal(toQuery({ saved: false }), '');
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
  assert.deepEqual(leads.map(l => l.id), sampleLeads(NOW, cars).map(l => l.id));
  assert.deepEqual(settings.financing, DEFAULT_FINANCING);
});

test('every sample car has a front, back, left and right photo, each credited and bundled', () => {
  const { cars } = makeSeed(NOW);
  for (const c of cars) {
    assert.equal(c.photoIds.length, 4, c.stockNo);
    c.photoIds.forEach((id, i) => {
      assert.ok(isSamplePhoto(id) && id.endsWith(`-${SAMPLE_ANGLES[i]}`), `${c.stockNo} photo ${i}: ${id}`);
      const credit = sampleCredit(id);
      assert.ok(credit?.author && credit.license && credit.source.startsWith('https://commons.wikimedia.org/'), `${id} credit`);
      const url = samplePhotoUrl(id);
      assert.ok(fs.existsSync(new URL(`../../../public${url}`, import.meta.url)), `${url} is not in FRONTEND/public`);
    });
  }
});

/* a demo saved before the photos shipped: sample cars with no photos, the old colours, no marker */
const OLD_COLORS = { 'car-01': 'silver', 'car-03': 'red', 'car-04': 'black', 'car-05': 'pearl', 'car-07': 'blue', 'car-08': 'brown', 'car-09': 'red', 'car-10': 'pearl', 'car-12': 'white' };
const savedBeforePhotos = () => {
  const seed = makeSeed(NOW);
  const { samplePhotos, ...settings } = seed.settings;
  return { ...seed, settings, cars: seed.cars.map(c => ({ ...c, photoIds: [], color: OLD_COLORS[c.id] || c.color })) };
};

test('a demo saved before the photos gets them once, keeping the dealer\'s own changes', () => {
  const old = savedBeforePhotos();
  const byId = (data, id) => data.cars.find(c => c.id === id);
  byId(old, 'car-02').photoIds = ['p-own'];          // the dealer added a photo
  byId(old, 'car-05').color = 'red';                 // the dealer changed a colour
  byId(old, 'car-06').model = 'Mirage';              // the dealer turned it into another car
  const { data, cars } = applySamplePhotos(normalizeData(old, NOW), NOW);
  const seed = makeSeed(NOW);
  assert.deepEqual(byId(data, 'car-01').photoIds, byId(seed, 'car-01').photoIds);
  assert.equal(byId(data, 'car-01').color, 'black');
  assert.deepEqual(byId(data, 'car-02').photoIds, ['p-own']);
  assert.deepEqual(byId(data, 'car-05').photoIds, byId(seed, 'car-05').photoIds);
  assert.equal(byId(data, 'car-05').color, 'red');
  assert.deepEqual(byId(data, 'car-06').photoIds, []);
  assert.equal(cars.length, 10);
  assert.equal(data.settings.samplePhotos, 1);
  const again = applySamplePhotos(data, NOW);
  assert.equal(again.cars.length, 0);
  assert.equal(again.data, data);
});

test('photos a dealer removes after that stay removed', () => {
  const { data } = applySamplePhotos(normalizeData(savedBeforePhotos(), NOW), NOW);
  const emptied = { ...data, cars: data.cars.map(c => (c.id === 'car-01' ? { ...c, photoIds: [] } : c)) };
  const { data: after, cars } = applySamplePhotos(normalizeData(emptied, NOW), NOW);
  assert.equal(cars.length, 0);
  assert.deepEqual(after.cars.find(c => c.id === 'car-01').photoIds, []);
});

test('a fresh or reset demo already has its photos', () => {
  const seed = normalizeData(makeSeed(NOW), NOW);
  assert.equal(seed.settings.samplePhotos, 1);
  assert.equal(applySamplePhotos(seed, NOW).cars.length, 0);
});

test('only sample ids point at bundled photos', () => {
  assert.equal(samplePhotoUrl('p-1700000000000-abc'), null);
  assert.equal(samplePhotoUrl('sample:not-a-photo'), null);
  assert.equal(samplePhotoUrl(undefined), null);
  assert.equal(isSamplePhoto('p-1700000000000-abc'), false);
  assert.equal(sampleCredit('p-1700000000000-abc'), null);
});

test('sample data names no real phone number', () => {
  const text = JSON.stringify(makeSeed(NOW));
  const phones = text.match(/(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g) || [];
  assert.ok(phones.length > 0);
  /* 0900 is not a live prefix: the shop and the sample buyers all use it */
  assert.ok(phones.every(p => /^0900[\s-]?\d{3}[\s-]?\d{4}$/.test(p)), phones.join(', '));
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

test('the privacy policy and terms have their own pages', () => {
  assert.deepEqual(parseShowroomPath('/showroom/privacy'), { view: 'privacy' });
  assert.deepEqual(parseShowroomPath('/showroom/terms'), { view: 'terms' });
  assert.deepEqual(parseShowroomPath('/showroom/privacy/extra'), { view: 'notfound' });
  assert.deepEqual(LEGAL_KINDS, ['privacy', 'terms']);
});

test('the sample policies speak for the shop in Settings', () => {
  const s = { ...DEFAULT_SETTINGS, shopName: 'Sugbo Auto Hub', phone: '0917 555 0101', address: 'Banilad, Cebu City' };
  for (const kind of LEGAL_KINDS) {
    const text = JSON.stringify(legalDoc(kind, s));
    assert.match(text, /Sugbo Auto Hub/, kind);
    assert.match(text, /0917 555 0101/, kind);
    assert.match(text, /Banilad, Cebu City/, kind);
    assert.doesNotMatch(text, /Demo Motors/, kind);
  }
  assert.match(JSON.stringify(legalDoc('privacy', s)), /Data Privacy Act of 2012/);
  assert.equal(legalDoc('nope', s), null);
});

test('the sample policies read cleanly when the shop leaves contact details blank', () => {
  const s = { ...DEFAULT_SETTINGS, phone: '', address: '', messenger: '', viber: '' };
  for (const kind of LEGAL_KINDS) {
    const doc = legalDoc(kind, s);
    assert.ok(doc.intro && doc.sections.length > 3, kind);
    for (const sec of doc.sections) {
      assert.ok(sec.heading, kind);
      assert.ok(sec.paras.length || sec.list?.length, `${kind}: ${sec.heading}`);
    }
    const text = JSON.stringify(doc);
    assert.doesNotMatch(text, /undefined|null|\{\w+\}| ,|,,|\(\)/, kind);
    assert.doesNotMatch(text, /admin/i, kind); // never point buyers at the hidden admin
  }
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
  /* a release photo on a sold car's review is in use too */
  const release = newPhotoId(new Date(NOW.getTime() - 5 * DAY));
  const sold = { ...data, cars: [...data.cars, car({ id: 'c2', status: 'sold', sale: { review: { photoId: release } } })] };
  assert.deepEqual(orphanPhotoIds([release, old], sold, NOW), [old]);
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

test('the financing checklist and the FAQ have every line in both languages', () => {
  for (const [group, n] of Object.entries(FINANCING_DOCS)) {
    for (let i = 1; i <= n; i++) {
      for (const lang of ['en', 'ceb']) assert.ok(DICT[lang][`req.${group}.${i}`], `${lang} req.${group}.${i}`);
    }
  }
  assert.deepEqual(Object.keys(FINANCING_DOCS), ['all', 'employed', 'business', 'ofw']);
  assert.ok(FAQ_IDS.length >= 5);
  for (const id of FAQ_IDS) {
    for (const lang of ['en', 'ceb']) assert.ok(DICT[lang][`faq.q.${id}`] && DICT[lang][`faq.a.${id}`], `${lang} faq ${id}`);
  }
  /* the downpayment answer names the shop's own minimum */
  assert.match(t('en', 'faq.a.down', { pct: 30 }), /30%/);
  assert.match(t('ceb', 'faq.a.down', { pct: 30 }), /30%/);
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

test('only the superadmin can open Settings, History and Agents', () => {
  for (const page of ['dashboard', 'cars', 'events', 'leads']) {
    assert.equal(canOpen('admin', page), true, page);
    assert.equal(canOpen('superadmin', page), true, page);
  }
  for (const page of ['settings', 'history', 'agents']) {
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

test('only the superadmin can add an event; the admin still opens the events page', () => {
  assert.equal(canAddEvent('superadmin'), true);
  assert.equal(canAddEvent('admin'), false);
  assert.equal(canAddEvent(null), false);
  assert.equal(canOpen('admin', 'events'), true);
});

/* ── photo viewer ── */

test('zoom stays inside the photo', () => {
  const box = { imgW: 400, imgH: 250, boxW: 400, boxH: 500 };
  assert.equal(ZOOM_MAX, 4);
  assert.equal(clampView({ s: 9, x: 0, y: 0 }, box).s, 4);
  assert.deepEqual(clampView({ s: 0.5, x: 30, y: 30 }, box), { s: 1, x: 0, y: 0 });
  /* at 2x the photo is 800 wide in a 400 box: 200 px each way; 500 tall in a 500 box: no room */
  assert.deepEqual(clampView({ s: 2, x: 999, y: 999 }, box), { s: 2, x: 200, y: 0 });
  assert.deepEqual(clampView({ s: 2, x: -999, y: -40 }, box), { s: 2, x: -200, y: 0 });
});

test('zooming at a point keeps that point still', () => {
  assert.deepEqual(zoomAt({ s: 1, x: 0, y: 0 }, 2, 100, 0), { s: 2, x: -100, y: 0 });
  /* zooming back out at the same point returns to where it was */
  assert.deepEqual(zoomAt({ s: 2, x: -100, y: 0 }, 1, 100, 0), { s: 1, x: 0, y: 0 });
});

/* ── sample buyers ── */

test('the sample buyers show every kind of task', () => {
  const seed = makeSeed(NOW);
  const tasks = todoList(seed, NOW);
  const kinds = new Set(tasks.map(x => x.kind));
  for (const k of ['reply', 'remind', 'followup', 'drop']) assert.ok(kinds.has(k), k);
  assert.ok(!kinds.has('wish'), 'nothing matches a waiting buyer until a price drop or a new car');
  assert.deepEqual(tasks.filter(x => x.kind === 'drop').map(x => x.car.model), ['BR-V', 'Montero Sport']);
  assert.equal(seed.settings.sampleLeads, 1);
});

test('applying the Montero price drop wakes a waiting buyer', () => {
  const seed = makeSeed(NOW);
  const montero = seed.cars.find(c => c.model === 'Montero Sport');
  assert.deepEqual(waitingFor(montero, seed.leads, seed.events, NOW), []);
  const dropped = applyPriceDrop(montero, suggestedDropPrice(montero.price, seed.settings.priceRule.pct), NOW);
  assert.equal(dropped.price, 897000);
  assert.deepEqual(waitingFor(dropped, seed.leads, seed.events, NOW).map(l => l.name), ['Ramon T.']);
});

test('saved demos get the sample buyers once, skipping any whose car is gone or changed', () => {
  const seed = makeSeed(NOW);
  const old = { ...seed, leads: [], settings: { ...seed.settings, sampleLeads: undefined } };
  const all = applySampleLeads(old, NOW);
  assert.equal(all.leads.length, seed.leads.length);
  assert.equal(all.data.leads.length, seed.leads.length);
  const noFortuner = { ...old, cars: old.cars.filter(c => c.model !== 'Fortuner') };
  assert.ok(!applySampleLeads(noFortuner, NOW).leads.some(l => l.name === 'Mark D.'));
  const changed = { ...old, cars: old.cars.map(c => (c.model === 'City' ? { ...c, make: 'Toyota', model: 'Vios' } : c)) };
  assert.ok(!applySampleLeads(changed, NOW).leads.some(l => l.name === 'Joy R.'));
  /* waitlist buyers have no car, so they always come along */
  assert.ok(applySampleLeads(noFortuner, NOW).leads.some(l => l.name === 'Ramon T.'));
  assert.deepEqual(applySampleLeads({ ...old, settings: { ...old.settings, sampleLeads: 1 } }, NOW).leads, []);
  /* a buyer already there is not added twice */
  assert.equal(applySampleLeads({ ...old, leads: [seed.leads[0]] }, NOW).leads.length, seed.leads.length - 1);
});

test('the sample buyers look made up: a first name and an initial, and a 0900 number', () => {
  const leads = sampleLeads(NOW, makeSeed(NOW).cars);
  assert.equal(leads.length, 6);
  for (const l of leads) {
    assert.match(l.name, /^[A-Z][a-z]+ [A-Z]\.$/);
    assert.ok(isPhMobile(l.mobile), l.mobile);
    assert.match(l.mobile, /^0900/);
    assert.ok(['en', 'ceb'].includes(l.lang));
  }
  assert.equal(new Set(leads.map(l => l.id)).size, 6);
});

test('the Facebook caption calls out a recent price drop', () => {
  const c = car({ price: 525000, priceDrop: { from: 548000, at: at(-1) } });
  const info = effectivePrice(c, [], NOW);
  const en = fbCaption(c, SETTINGS, info, 'en').split('\n');
  assert.match(en[0], /^PRICE DROP: 2019 Toyota Vios/);
  assert.equal(en[1], '₱525,000 (was ₱548,000)');
  assert.equal(fbCaption(c, SETTINGS, info, 'ceb').split('\n')[1], '₱525,000 (dati ₱548,000)');
  /* after two weeks it is an ordinary listing again */
  const later = fbCaption(c, SETTINGS, effectivePrice(c, [], new Date(NOW.getTime() + 20 * DAY)), 'en').split('\n');
  assert.match(later[0], /^FOR SALE: /);
});

test('a text message link opens the phone’s Messages app with the text typed', () => {
  assert.equal(smsUrl('0917 123 4567', 'Hi Joy! See you'), 'sms:+639171234567?&body=Hi%20Joy!%20See%20you');
});

/* ── promos: sample data ── */

test('a new demo comes with the sample promo on the Christmas Sale', () => {
  const seed = makeSeed(NOW);
  assert.equal(seed.promos.length, 1);
  assert.deepEqual(seed.claims, []);
  assert.deepEqual(validatePromo(seed.promos[0]), {});
  assert.equal(seed.events[0].promoId, seed.promos[0].id);
  assert.equal(activePromo(seed.events, seed.promos, NOW).promo.code, 'SPIN-XMAS');
  assert.deepEqual(seed.promos[0].prizes.map(p => p.chance), [40, 30, 25, 5]);
  assert.equal(seed.settings.samplePromo, 1);
});

test('saved demos get the sample promo once, without taking over another event or promo', () => {
  const seed = makeSeed(NOW);
  const old = { ...seed, promos: [], events: seed.events.map(e => ({ ...e, promoId: null })), settings: { ...seed.settings, samplePromo: undefined } };
  const r = applySamplePromo(old, NOW);
  assert.equal(r.promo.id, 'promo-sample');
  assert.equal(r.event.promoId, 'promo-sample');
  assert.equal(r.data.events.find(e => e.id === 'event-christmas').promoId, 'promo-sample');
  /* the sale was deleted: the promo comes, unattached */
  const noSale = applySamplePromo({ ...old, events: [] }, NOW);
  assert.ok(noSale.promo);
  assert.equal(noSale.event, null);
  /* the sale already has a promo: leave it */
  const taken = applySamplePromo({ ...old, events: old.events.map(e => ({ ...e, promoId: 'mine' })) }, NOW);
  assert.equal(taken.event, null);
  /* already done, or already there */
  assert.equal(applySamplePromo({ ...old, settings: { ...old.settings, samplePromo: 1 } }, NOW).promo, null);
  assert.equal(applySamplePromo({ ...old, promos: [seed.promos[0]] }, NOW).promo, null);
});

test('normalizeData repairs saved promos and claims', () => {
  const fixed = normalizeData({ promos: 'oops', claims: null, events: [{ id: 'e1', items: [] }] });
  assert.deepEqual(fixed.promos, []);
  assert.deepEqual(fixed.claims, []);
  assert.equal(fixed.events[0].promoId, null);
  const p = normalizeData({ promos: [{ id: 'p1', prizes: 'x' }], claims: [{ id: 'c1' }, 'junk'] });
  assert.deepEqual(p.promos[0].prizes, []);
  assert.equal(p.claims.length, 1);
  assert.equal(p.claims[0].redeemedAt, null);
});

test('only the superadmin manages promos; both roles open the Promos page', () => {
  assert.equal(canManagePromos('superadmin'), true);
  assert.equal(canManagePromos('admin'), false);
  assert.equal(canManagePromos(null), false);
  assert.equal(canOpen('admin', 'promos'), true);
  assert.equal(canOpen('superadmin', 'promos'), true);
});

test('the sample policies cover the promo wheel', () => {
  const all = (doc) => [doc.intro, ...doc.sections.flatMap(x => [x.heading, ...x.paras, ...(x.list || [])])].join(' ');
  const privacy = all(legalDoc('privacy', DEFAULT_SETTINGS));
  assert.match(privacy, /email/i);
  assert.match(privacy, /promo/i);
  const promos = legalDoc('terms', DEFAULT_SETTINGS).sections.find(x => x.heading === 'Promos');
  assert.ok(promos, 'a Promos section');
  const text = [...promos.paras, ...(promos.list || [])].join(' ');
  assert.match(text, /DTI/);
  assert.match(text, /30 days/);
  assert.match(text, /one spin/i);
});

/* ── dealer tools (2026-11-25) ── */

test('a reservation holds for the set days, counted from today', () => {
  assert.equal(reservedUntilFor('2026-11-25', 7), '2026-12-02');
  assert.equal(reservedUntilFor('2026-12-30', 3), '2027-01-02');
});

test('a reservation past its date goes back to available; one ending today still holds', () => {
  const cars = [
    car({ id: 'old', status: 'reserved', reservedUntil: '2026-11-24' }),
    car({ id: 'today', status: 'reserved', reservedUntil: '2026-11-25' }),
    car({ id: 'open', status: 'reserved' }),
    car({ id: 'avail', status: 'available', reservedUntil: '2026-11-01' }),
  ];
  const changed = expireReservations(cars, '2026-11-25');
  assert.deepEqual(changed.map(c => [c.id, c.status, c.reservedUntil]), [['old', 'available', null]]);
  assert.equal(cars[0].status, 'reserved');
});

test('the inspection report has 20 checks in 5 groups, each with its own id', () => {
  const ids = INSPECTION.flatMap(g => g.items.map(([id]) => id));
  assert.equal(INSPECTION.length, 5);
  assert.equal(ids.length, 20);
  assert.equal(new Set(ids).size, 20);
  for (const id of ids) for (const lang of ['en', 'ceb']) assert.ok(DICT[lang][`insp.${id}`], `${lang} insp.${id}`);
  for (const g of INSPECTION) for (const lang of ['en', 'ceb']) assert.ok(DICT[lang][`insp.g.${g.id}`], `${lang} insp.g.${g.id}`);
});

test('inspectionSummary counts passed and needs-work checks, and is empty until there is a report', () => {
  const [first, second] = INSPECTION[0].items.map(([id]) => id);
  assert.equal(inspectionSummary(undefined), null);
  assert.equal(inspectionSummary({ date: '', results: { [first]: 'pass' } }), null);
  assert.equal(inspectionSummary({ date: '2026-11-20', results: {} }), null);
  assert.deepEqual(
    inspectionSummary({ date: '2026-11-20', results: { [first]: 'pass', [second]: 'fix', bogus: 'pass' } }),
    { total: 20, checked: 2, passed: 1, fix: 1 });
});

test('the watermark names the shop and its phone, and can be turned off', () => {
  assert.equal(watermarkLabel({ shopName: 'Demo Motors Cebu', phone: '0900 000 0000' }), 'Demo Motors Cebu · 0900 000 0000');
  assert.equal(watermarkLabel({ shopName: 'Demo Motors Cebu', phone: '' }), 'Demo Motors Cebu');
  assert.equal(watermarkLabel({ shopName: 'Demo Motors Cebu', phone: '0900', watermark: false }), '');
  assert.equal(watermarkLabel({ shopName: '  ', phone: '' }), '');
});

test('an agent link code is read safely from the address bar', () => {
  assert.equal(refCode('?ref=Ana-2'), 'ana-2');
  assert.equal(refCode('?sort=newest&ref=%3Cb%3Ejun%3C%2Fb%3E'), 'bjunb');
  assert.equal(refCode('?ref='), '');
  assert.equal(refCode(''), '');
  assert.equal(refCode(`?ref=${'x'.repeat(40)}`).length, 24);
});

test('a new agent gets a short code from their first name, never one in use', () => {
  assert.equal(agentCodeFor('Ana Reyes', []), 'ana');
  assert.equal(agentCodeFor('Ana Cruz', [{ code: 'ana' }]), 'ana-2');
  assert.equal(agentCodeFor('Ana Lim', [{ code: 'ana' }, { code: 'ana-2' }]), 'ana-3');
  assert.equal(agentCodeFor('Ñoño Sy', []), 'nono');
  assert.equal(agentCodeFor('  ', []), 'agent');
});

test('agentStats counts an agent’s buyers, sales and the commission owed and paid', () => {
  const agent = { id: 'ag1', code: 'ana', rate: 5000 };
  const leads = [{ agentCode: 'ana' }, { agentCode: 'ana' }, { agentCode: 'jun' }, {}];
  const cars = [
    car({ id: 's1', status: 'sold', sale: { agentId: 'ag1', commission: 5000 } }),
    car({ id: 's2', status: 'sold', sale: { agentId: 'ag1', commission: 7000, commissionPaidAt: '2026-11-20T00:00:00Z' } }),
    car({ id: 's3', status: 'sold', sale: { agentId: 'ag2', commission: 5000 } }),
    car({ id: 'a1', status: 'available', sale: { agentId: 'ag1', commission: 5000 } }),
  ];
  assert.deepEqual(agentStats(agent, leads, cars), { leads: 2, sold: 2, owed: 5000, paid: 7000 });
});

test('affordablePrice: 30% of take-home pay at the longest term, cash covering the all-in downpayment', () => {
  const fin = DEFAULT_FINANCING;
  /* the downpayment is the limit: ₱200,000 covers 30% down + 5% fees up to ₱571k */
  assert.equal(affordablePrice({ income: 40000, cash: 200000 }, fin), 570000);
  /* the monthly is the limit: ₱7,500 a month */
  const p = affordablePrice({ income: 25000, cash: 300000 }, fin);
  assert.equal(p, 580000);
  const down = 300000 - Math.round(p * fin.feesPct / 100);
  assert.ok(loanQuote(p, down / p * 100, 60, fin).monthly <= 7500);
  assert.equal(affordablePrice({ income: 0, cash: 300000 }, fin), 0);
  assert.equal(affordablePrice({ income: 40000, cash: 0 }, fin), 0);
  assert.equal(affordablePrice({ income: 'abc', cash: 100000 }, fin), 0);
});

test('the compare page has its own address', () => {
  assert.deepEqual(parseShowroomPath('/showroom/compare'), { view: 'compare' });
  assert.deepEqual(parseShowroomPath('/showroom/compare/x'), { view: 'notfound' });
});

test('a fresh demo shows the dealer tools with sample data', () => {
  const seed = makeSeed(NOW);
  const byId = Object.fromEntries(seed.cars.map(c => [c.id, c]));
  assert.equal(seed.settings.sampleTools, 1);
  assert.deepEqual(seed.settings.reservation, { fee: 5000, days: 7, refund: 'denied' });
  assert.equal(seed.agents.length, 2);
  assert.equal(inspectionSummary(byId['car-04'].inspection).fix, 1);
  assert.equal(inspectionSummary(byId['car-01'].inspection).passed, 20);
  assert.ok(byId['car-05'].consign.net < byId['car-05'].price);
  assert.equal(byId['car-08'].status, 'reserved');
  assert.ok(byId['car-08'].reservedUntil > '2026-11-23');
  assert.equal(byId['car-10'].sale.agentId, seed.agents[0].id);
  const reviewed = seed.cars.filter(c => c.sale?.review);
  assert.ok(reviewed.length > 0 && reviewed.every(c => c.status === 'sold' && c.sale.review.sample && c.sale.review.consent));
  assert.equal(seed.leads.find(l => l.id === 'lead-sample-6').agentCode, 'ana');
  /* placeholders, never a real registration */
  assert.match(seed.settings.dtiNo, /^0+$/);
});

test('an older demo gets the sample dealer tools once, leaving what the dealer changed alone', () => {
  const seed = makeSeed(NOW);
  const old = {
    ...seed,
    agents: [],
    cars: seed.cars.map(({ inspection, hpgCleared, consign, reservedUntil, sale, ...c }) => (c.id === 'car-04' ? { ...c, model: 'Hilux' } : c)),
    leads: seed.leads.map(({ agentCode, ...l }) => l),
  };
  const { cars, agents, leads } = applySampleTools(old, NOW);
  const ids = cars.map(c => c.id);
  assert.ok(!ids.includes('car-04'));
  assert.ok(ids.includes('car-01') && ids.includes('car-10'));
  assert.equal(agents.length, 2);
  assert.deepEqual(leads.map(l => [l.id, l.agentCode]), [['lead-sample-6', 'ana']]);
  /* a demo with its own agents keeps them; a filled field is never overwritten */
  assert.deepEqual(applySampleTools({ ...old, agents: [{ id: 'x', code: 'x' }] }, NOW).agents, []);
  const inspected = { ...old, cars: old.cars.map(c => (c.id === 'car-01' ? { ...c, hpgCleared: '2026-01-01' } : c)) };
  assert.equal(applySampleTools(inspected, NOW).cars.find(c => c.id === 'car-01').hpgCleared, '2026-01-01');
});
