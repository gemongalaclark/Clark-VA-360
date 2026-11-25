// Run: node --test "FRONTEND/src/components/SHOWROOM 360/historyRules.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  carEntry, carDeletedEntry, eventEntry, eventDeletedEntry, settingsEntry, leadEntry, resetEntry,
  addToHistory, groupByDay, normalizeHistory, HISTORY_LIMIT, HISTORY_KINDS, promoEntry, promoDeletedEntry, redeemEntry,
  agentEntry, agentDeletedEntry,
} from './historyRules.js';
import { DEFAULT_SETTINGS } from './seedData.js';
import { applyPriceDrop, skipPriceDrop, markPaid, recordCarTask } from './autoRules.js';

const NOW = new Date(2026, 10, 23, 15, 42);
const car = (over = {}) => ({
  id: 'c1', stockNo: 'SR-0001', year: 2019, make: 'Toyota', model: 'Vios', variant: '1.3 E', body: 'sedan',
  transmission: 'cvt', fuel: 'gasoline', engine: '1.3L', drive: '4x2', seats: 5, odometer: 42000, color: 'silver',
  price: 548000, negotiable: true, financing: true, orcr: 'complete', regUntil: '2027-04', owners: '1', plateEnding: '',
  floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', knownIssues: '', description: 'Clean.',
  status: 'available', soldAt: null, featured: false, photoIds: [], listedAt: '2026-11-11T02:00:00.000Z', ...over,
});
const row = (entry, label) => entry.changes.find(r => r.label === label);

/* ── cars ── */

test('editing a car records each changed field as old and new', () => {
  const e = carEntry(car(), car({ price: 525000, odometer: 43500, transmission: 'automatic' }), NOW);
  assert.equal(e.kind, 'car');
  assert.equal(e.action, 'Edited');
  assert.equal(e.title, '2019 Toyota Vios 1.3 E AT');   /* the car's name as it is now */
  assert.equal(e.targetId, 'c1');
  assert.equal(e.at, NOW.toISOString());
  assert.deepEqual(row(e, 'Price'), { label: 'Price', from: '₱548,000', to: '₱525,000' });
  assert.deepEqual(row(e, 'Odometer'), { label: 'Odometer', from: '42,000 km', to: '43,500 km' });
  assert.deepEqual(row(e, 'Transmission'), { label: 'Transmission', from: 'CVT', to: 'Automatic' });
  assert.equal(e.changes.length, 3);
});

test('a save that changes nothing is not logged', () => {
  assert.equal(carEntry(car(), car(), NOW), null);
  assert.equal(carEntry(car({ plateEnding: '' }), car({ plateEnding: null }), NOW), null);
});

test('status and featured changes from the cars list read as what happened', () => {
  const sold = carEntry(car(), car({ status: 'sold', soldAt: NOW.toISOString() }), NOW);
  assert.equal(sold.action, 'Marked sold');
  assert.deepEqual(row(sold, 'Status'), { label: 'Status', from: 'Available', to: 'Sold' });
  assert.equal(row(sold, 'soldAt'), undefined);
  assert.equal(carEntry(car(), car({ status: 'reserved' }), NOW).action, 'Marked reserved');
  assert.equal(carEntry(car({ featured: false }), car({ featured: true }), NOW).action, 'Featured on home');
  assert.equal(carEntry(car({ featured: true }), car({ featured: false }), NOW).action, 'Removed from home');
  assert.equal(carEntry(car(), car({ status: 'sold', price: 500000 }), NOW).action, 'Edited');
});

test('long text only says it changed, empty values show a dash', () => {
  const e = carEntry(car(), car({ description: 'Clean. New tires.', knownIssues: 'Small dent', plateEnding: '4' }), NOW);
  assert.deepEqual(row(e, 'Description'), { label: 'Description', note: 'changed' });
  assert.deepEqual(row(e, 'Known issues'), { label: 'Known issues', note: 'added' });
  assert.deepEqual(row(e, 'Plate ends in'), { label: 'Plate ends in', from: '—', to: '4' });
});

test('photos say how many were added or removed, or that the cover changed', () => {
  assert.deepEqual(row(carEntry(car(), car({ photoIds: ['a', 'b', 'c'] }), NOW), 'Photos'), { label: 'Photos', note: '3 added' });
  assert.deepEqual(row(carEntry(car({ photoIds: ['a', 'b'] }), car({ photoIds: ['b', 'c'] }), NOW), 'Photos'), { label: 'Photos', note: '1 added, 1 removed' });
  assert.deepEqual(row(carEntry(car({ photoIds: ['a', 'b'] }), car({ photoIds: ['b', 'a'] }), NOW), 'Photos'), { label: 'Photos', note: 'new cover photo' });
  assert.deepEqual(row(carEntry(car({ photoIds: ['a', 'b', 'c'] }), car({ photoIds: ['a', 'c', 'b'] }), NOW), 'Photos'), { label: 'Photos', note: 'reordered' });
});

test('a new car is logged as added with its price and stock number', () => {
  const e = carEntry(undefined, car({ photoIds: ['a'] }), NOW);
  assert.equal(e.action, 'Added');
  assert.deepEqual(row(e, 'Price'), { label: 'Price', to: '₱548,000' });
  assert.deepEqual(row(e, 'Stock no.'), { label: 'Stock no.', to: 'SR-0001' });
  assert.deepEqual(row(e, 'Photos'), { label: 'Photos', to: '1' });
});

test('a deleted car notes the events it was taken out of', () => {
  const e = carDeletedEntry(car(), [{ id: 'e1', name: 'Christmas Sale', items: [{ carId: 'c1', salePrice: 1 }] }, { id: 'e2', name: 'Other', items: [] }], NOW);
  assert.equal(e.action, 'Deleted');
  assert.equal(e.targetId, null);
  assert.deepEqual(row(e, 'Removed from'), { label: 'Removed from', to: 'Christmas Sale' });
  assert.equal(carDeletedEntry(undefined, [], NOW), null);
});

/* ── events ── */

const CARS = [car(), car({ id: 'c2', model: 'Wigo', variant: '1.0 G', transmission: 'automatic', year: 2020 })];
const ev = (over = {}) => ({
  id: 'e1', name: 'Christmas Sale', tagline: '', startsAt: '2026-11-20T10:50:00.000Z', endsAt: '2026-12-23T10:50:00.000Z',
  items: [{ carId: 'c1', salePrice: 525000 }], ...over,
});

test('editing an event lists cars added, removed and re-priced', () => {
  const after = ev({ name: 'Christmas Mega Sale', items: [{ carId: 'c1', salePrice: 515000 }, { carId: 'c2', salePrice: 398000 }] });
  const e = eventEntry(ev(), after, CARS, NOW);
  assert.equal(e.kind, 'event');
  assert.equal(e.action, 'Edited');
  assert.equal(e.title, 'Christmas Mega Sale');
  assert.deepEqual(row(e, 'Name'), { label: 'Name', from: 'Christmas Sale', to: 'Christmas Mega Sale' });
  assert.deepEqual(row(e, 'Sale price · 2019 Toyota Vios 1.3 E CVT'), { label: 'Sale price · 2019 Toyota Vios 1.3 E CVT', from: '₱525,000', to: '₱515,000' });
  assert.deepEqual(row(e, 'Car added'), { label: 'Car added', to: '2020 Toyota Wigo 1.0 G AT at ₱398,000' });
  const removed = eventEntry(after, ev({ items: [{ carId: 'c2', salePrice: 398000 }] }), CARS, NOW);
  assert.deepEqual(row(removed, 'Car removed'), { label: 'Car removed', from: '2019 Toyota Vios 1.3 E CVT' });
});

test('a new event is logged as created with its dates and cars, without a name row', () => {
  const e = eventEntry(undefined, ev(), CARS, NOW);
  assert.equal(e.action, 'Created');
  assert.equal(row(e, 'Name'), undefined);
  assert.ok(row(e, 'Starts').to);
  assert.ok(row(e, 'Ends').to);
  assert.deepEqual(row(e, 'Car added'), { label: 'Car added', to: '2019 Toyota Vios 1.3 E CVT at ₱525,000' });
  assert.equal(eventEntry(ev(), ev(), CARS, NOW), null);
  assert.equal(eventDeletedEntry(ev(), NOW).action, 'Deleted');
});

/* ── settings, leads, reset ── */

test('settings changes show old and new, but never the PIN digits', () => {
  const after = { ...DEFAULT_SETTINGS, phone: '0917 123 4567', pin: '9999', superPin: '8888', financing: { ...DEFAULT_SETTINGS.financing, minDownPct: 20, addOn: { ...DEFAULT_SETTINGS.financing.addOn, 60: 40 } } };
  const e = settingsEntry(DEFAULT_SETTINGS, after, NOW);
  assert.equal(e.kind, 'settings');
  assert.equal(e.title, 'Shop settings');
  assert.deepEqual(row(e, 'Phone'), { label: 'Phone', from: '0900 000 0000', to: '0917 123 4567' });
  assert.deepEqual(row(e, 'Admin PIN'), { label: 'Admin PIN', note: 'changed' });
  assert.deepEqual(row(e, 'Superadmin PIN'), { label: 'Superadmin PIN', note: 'changed' });
  assert.deepEqual(row(e, 'Minimum downpayment'), { label: 'Minimum downpayment', from: '30%', to: '20%' });
  assert.deepEqual(row(e, 'Add-on rate, 60 months'), { label: 'Add-on rate, 60 months', from: '44.32%', to: '40%' });
  assert.ok(!JSON.stringify(e).includes('9999'));
  assert.ok(!JSON.stringify(e).includes('8888'));
  assert.equal(settingsEntry(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS }, NOW), null);
  assert.deepEqual(row(settingsEntry(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, logoPhotoId: 'ph-1' }, NOW), 'Logo'), { label: 'Logo', note: 'added' });
});

test('only lead changes the admin makes are logged, never a buyer’s new request', () => {
  const lead = { id: 'l1', name: 'Maria Santos', type: 'test-drive', carLabel: '2019 Toyota Vios 1.3 E CVT', status: 'new' };
  assert.equal(leadEntry(undefined, lead, NOW), null);
  const e = leadEntry(lead, { ...lead, status: 'contacted' }, NOW);
  assert.equal(e.kind, 'lead');
  assert.equal(e.action, 'Marked contacted');
  assert.equal(e.title, 'Maria Santos · Test drive');
  assert.deepEqual(row(e, 'Status'), { label: 'Status', from: 'New', to: 'Contacted' });
  assert.equal(leadEntry(lead, { ...lead }, NOW), null);
  const trade = { ...lead, type: 'trade-in', carLabel: '' };
  assert.equal(leadEntry(trade, { ...trade, status: 'contacted' }, NOW).title, 'Maria Santos · Trade-in');
});

test('history keeps the newest entries first and stops at the limit', () => {
  const r = resetEntry(NOW);
  assert.equal(r.kind, 'demo');
  let list = [];
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) list = addToHistory(list, { ...r, id: `h${i}` });
  assert.equal(list.length, HISTORY_LIMIT);
  assert.equal(list[0].id, `h${HISTORY_LIMIT + 4}`);
  assert.equal(addToHistory(list, null), list);
  const ids = new Set([carEntry(undefined, car(), NOW).id, carEntry(undefined, car(), NOW).id]);
  assert.equal(ids.size, 2);
});

test('groupByDay labels today, yesterday, then the date', () => {
  const at = (d, h) => ({ ...resetEntry(new Date(2026, 10, d, h)) });
  const groups = groupByDay([at(23, 9), at(23, 8), at(22, 20), at(20, 10)], NOW);
  assert.deepEqual(groups.map(g => g.entries.length), [2, 1, 1]);
  assert.equal(groups[0].label, 'Today');
  assert.equal(groups[1].label, 'Yesterday');
  assert.match(groups[2].label, /Nov 20/);
});

test('normalizeHistory drops broken entries from old or damaged data', () => {
  const good = resetEntry(NOW);
  assert.deepEqual(normalizeHistory([good, null, { kind: 'car' }, 'x']), [good]);
  assert.deepEqual(normalizeHistory(undefined), []);
});

test('a value that looks the same after saving is not a change (event times saved to the minute)', () => {
  const before = ev({ startsAt: '2026-11-20T10:50:23.456Z', endsAt: '2026-12-23T10:50:41.002Z' });
  const after = ev({ startsAt: '2026-11-20T10:50:00.000Z', endsAt: '2026-12-23T10:50:00.000Z', items: [{ carId: 'c1', salePrice: 519000 }] });
  const e = eventEntry(before, after, CARS, NOW);
  assert.deepEqual(e.changes.map(r => r.label), ['Sale price · 2019 Toyota Vios 1.3 E CVT']);
  assert.equal(carEntry(car({ listedAt: '2026-11-11T02:00:00.000Z' }), car({ listedAt: '2026-11-11T05:30:00.000Z' }), NOW), null);
});

/* ── autopilot ── */

test('a price drop from the to-do list reads as Price dropped', () => {
  const e = carEntry(car(), applyPriceDrop(car(), 525000, NOW), NOW);
  assert.equal(e.action, 'Price dropped');
  assert.deepEqual(e.changes, [{ label: 'Price', from: '₱548,000', to: '₱525,000' }]);
  /* a price typed in by hand is still an ordinary edit */
  assert.equal(carEntry(car(), car({ price: 525000 }), NOW).action, 'Edited');
});

test('skipping a suggested price drop logs nothing', () => {
  assert.equal(carEntry(car(), skipPriceDrop(car(), NOW), NOW), null);
});

test('the price-drop rule shows in the settings history', () => {
  const e = settingsEntry(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, priceRule: { on: false, days: 60, pct: 5 } }, NOW);
  assert.deepEqual(row(e, 'Price-drop rule'), { label: 'Price-drop rule', from: 'On', to: 'Off' });
  assert.deepEqual(row(e, 'Price drop after'), { label: 'Price drop after', from: '45 days', to: '60 days' });
  assert.deepEqual(row(e, 'Price drop size'), { label: 'Price drop size', from: '3%', to: '5%' });
  assert.equal(settingsEntry(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS, priceRule: { ...DEFAULT_SETTINGS.priceRule } }, NOW), null);
});

/* ── promos ── */

const PROMO = {
  id: 'promo-1', name: 'Christmas Spin', code: 'SPIN-XMAS', permit: '',
  prizes: [{ id: 'a', label: '₱5,000 off', chance: 60 }, { id: 'b', label: 'Full tank', chance: 40 }],
  startsAt: '2026-11-20T00:00:00.000Z', endsAt: '2026-12-20T00:00:00.000Z',
};

test('creating, editing and deleting a promo is logged', () => {
  assert.equal(HISTORY_KINDS.promo, 'Promos');
  const made = promoEntry(undefined, PROMO, NOW);
  assert.equal(made.kind, 'promo');
  assert.equal(made.action, 'Created');
  assert.equal(made.title, 'Christmas Spin');
  assert.deepEqual(row(made, 'Prizes'), { label: 'Prizes', to: '₱5,000 off 60%, Full tank 40%' });
  assert.deepEqual(row(made, 'Promo code'), { label: 'Promo code', to: 'SPIN-XMAS' });
  const edited = promoEntry(PROMO, { ...PROMO, prizes: [{ id: 'a', label: '₱5,000 off', chance: 70 }, { id: 'b', label: 'Full tank', chance: 30 }], permit: 'FTEB 123' }, NOW);
  assert.equal(edited.action, 'Edited');
  assert.deepEqual(row(edited, 'Prizes'), { label: 'Prizes', from: '₱5,000 off 60%, Full tank 40%', to: '₱5,000 off 70%, Full tank 30%' });
  assert.deepEqual(row(edited, 'DTI permit no.'), { label: 'DTI permit no.', from: '—', to: 'FTEB 123' });
  assert.equal(promoEntry(PROMO, { ...PROMO }, NOW), null);
  assert.equal(promoDeletedEntry(PROMO, NOW).action, 'Deleted');
});

test('redeeming a voucher is logged with the car bought', () => {
  const claim = { id: 'c1', promoId: 'promo-1', name: 'Ana P.', email: 'ana@mail.com', prizeLabel: 'Full tank', voucher: 'DM-4F7K-9QXH' };
  const e = redeemEntry(claim, 'SR-0004', NOW);
  assert.equal(e.kind, 'promo');
  assert.equal(e.action, 'Voucher redeemed');
  assert.equal(e.title, 'Ana P. · Full tank');
  assert.deepEqual(row(e, 'Voucher'), { label: 'Voucher', to: 'DM-4F7K-9QXH' });
  assert.deepEqual(row(e, 'Car'), { label: 'Car', to: 'SR-0004' });
  assert.equal(row(redeemEntry(claim, '', NOW), 'Car'), undefined);
});

test('adding a promo to an event is logged on the event', () => {
  const ev = { id: 'e1', name: 'Christmas Sale', tagline: '', startsAt: '2026-11-20T00:00:00.000Z', endsAt: '2026-12-20T00:00:00.000Z', items: [], promoId: null };
  const e = eventEntry(ev, { ...ev, promoId: 'promo-1' }, [], NOW, [PROMO]);
  assert.deepEqual(row(e, 'Promo'), { label: 'Promo', from: '—', to: 'Christmas Spin' });
  const off = eventEntry({ ...ev, promoId: 'promo-1' }, ev, [], NOW, [PROMO]);
  assert.deepEqual(row(off, 'Promo'), { label: 'Promo', from: 'Christmas Spin', to: '—' });
});

/* ── dealer tools (2026-11-25) ── */

test('the dealer-tool fields of a car show up in its history, but messages sent do not', () => {
  const before = car({ status: 'sold', sale: { buyer: 'Ben S.', mobile: '0900 000 0106', steps: { deed: '2026-11-20' }, told: {} } });
  const res = carEntry(car(), car({ status: 'reserved', reservedUntil: '2026-11-30' }), NOW);
  assert.deepEqual(row(res, 'Reserved until'), { label: 'Reserved until', from: '—', to: 'Nov 30, 2026' });
  const insp = carEntry(car(), car({ inspection: { date: '2026-11-20', results: { start: 'pass' } } }), NOW);
  assert.deepEqual(row(insp, 'Inspection report'), { label: 'Inspection report', note: 'added' });
  const hpg = carEntry(car(), car({ hpgCleared: '2026-11-18' }), NOW);
  assert.equal(row(hpg, 'HPG clearance').to, 'Nov 18, 2026');
  /* a paper-step message sent to the buyer is not an edit */
  assert.equal(carEntry(before, recordCarTask(before, { kind: 'papers', step: 'deed' }, NOW), NOW), null);
  const steps = carEntry(before, { ...before, sale: { ...before.sale, steps: { deed: '2026-11-20', hpg: '2026-11-22' } } }, NOW);
  assert.deepEqual(row(steps, 'Sale and papers'), { label: 'Sale and papers', note: 'updated' });
  const consigned = car({ status: 'sold', consign: { owner: 'Rico P.', net: 800000 } });
  const paid = carEntry(consigned, markPaid(consigned, 'payout', NOW), NOW);
  assert.equal(paid.action, 'Owner paid');
  const agentSale = car({ status: 'sold', sale: { agentId: 'ag1', commission: 5000 } });
  assert.equal(carEntry(agentSale, markPaid(agentSale, 'commission', NOW), NOW).action, 'Commission paid');
});

test('agents are logged when added, changed and deleted', () => {
  assert.equal(HISTORY_KINDS.agent, 'Agents');
  const ana = { id: 'ag1', name: 'Ana R.', mobile: '0900 000 0301', code: 'ana', rate: 5000 };
  const added = agentEntry(undefined, ana, NOW);
  assert.deepEqual([added.kind, added.action, added.title], ['agent', 'Added', 'Ana R.']);
  const edited = agentEntry(ana, { ...ana, rate: 7000 }, NOW);
  assert.deepEqual(row(edited, 'Commission per sale'), { label: 'Commission per sale', from: '₱5,000', to: '₱7,000' });
  assert.equal(agentEntry(ana, { ...ana }, NOW), null);
  assert.deepEqual([agentDeletedEntry(ana, NOW).action, agentDeletedEntry(ana, NOW).title], ['Deleted', 'Ana R.']);
});
