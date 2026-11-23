// Run: node --test "FRONTEND/src/components/CARMARK 360/carmarkRules.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURES, SPEC_ROWS, MODELS, POPULAR_PAIRS } from './carData.js';
import {
  allVariants, findVariant, findGeneration, resolveVariant, diffVariants, formatPeso, priceRange,
  mapsOpenUrl, directionsUrl, project, fitView, visibleTiles, withPins, pinFromMapsLink, clusterPins,
} from './carmarkRules.js';
import { DEALERS } from './dealerList.js';
import { PINS } from './dealerPins.js';
import { GEN_CHECKS } from './carChecks.js';

/* A tiny model so the rule tests don't depend on the real data */
const TOY = {
  id: 'toy', make: 'Test', name: 'Toy',
  generations: [{
    id: 'toy-2020', label: '1st gen', years: '2020–2023',
    price: { min: 500000, max: 1250000 },
    base: { specs: { engine: '1.5L', seats: '7', wheels: '16-inch steel' }, features: ['abs', 'airbags2'] },
    variants: [
      { id: 'toy-2020:base', name: 'Base MT', specs: { transmission: '5-speed MT' } },
      { id: 'toy-2020:top', name: 'Top AT', specs: { transmission: '4-speed AT', wheels: '17-inch alloy' }, features: ['pushStart', 'fog'] },
    ],
  }],
};

test('a variant inherits its generation base and adds its own', () => {
  const top = resolveVariant(TOY, TOY.generations[0], TOY.generations[0].variants[1]);
  assert.equal(top.specs.engine, '1.5L');
  assert.equal(top.specs.wheels, '17-inch alloy');
  assert.deepEqual(top.features, ['abs', 'airbags2', 'pushStart', 'fog']);
  assert.equal(top.fullName, 'Toy Top AT');
  assert.equal(top.years, '2020–2023');
});

test('a variant can carry its own years', () => {
  const g = { ...TOY.generations[0], variants: [{ id: 'x', name: 'Cross AT', years: '2023–2025' }] };
  assert.equal(resolveVariant(TOY, g, g.variants[0]).years, '2023–2025');
});

test('diff lists what each car has that the other lacks', () => {
  const [base, top] = TOY.generations[0].variants.map(v => resolveVariant(TOY, TOY.generations[0], v));
  const d = diffVariants(top, base);
  assert.deepEqual(d.onlyA, ['pushStart', 'fog']);
  assert.deepEqual(d.onlyB, []);
  assert.deepEqual(d.shared, ['abs', 'airbags2']);
  const wheels = d.rows.find(r => r.key === 'wheels');
  assert.equal(wheels.same, false);
  assert.equal(d.rows.find(r => r.key === 'engine').same, true);
  /* a spec missing on one side shows as a dash and counts as different */
  const missing = diffVariants({ ...top, specs: { engine: '1.5L' } }, base).rows.find(r => r.key === 'seats');
  assert.equal(missing.a, '—');
  assert.equal(missing.same, false);
});

test('a spec neither car lists is left out', () => {
  const g = TOY.generations[0];
  const [base, top] = g.variants.map(v => resolveVariant(TOY, g, v));
  assert.equal(diffVariants(top, base).rows.some(r => r.key === 'clearance'), false);
});

test('a 360° camera counts as a reverse camera, CarPlay as a touchscreen', () => {
  const g = { ...TOY.generations[0], variants: [{ id: 'y', name: 'Y', features: ['camera360', 'carplay'] }] };
  const v = resolveVariant(TOY, g, g.variants[0]);
  assert.ok(v.features.includes('reverseCam') && v.features.includes('touchscreen'));
  assert.equal(new Set(v.features).size, v.features.length);
});

test('peso formatting', () => {
  assert.equal(formatPeso(500000), '₱500k');
  assert.equal(formatPeso(1000000), '₱1M');
  assert.equal(formatPeso(1250000), '₱1.25M');
  assert.equal(formatPeso(1100000), '₱1.1M');
  assert.equal(priceRange({ min: 500000, max: 1250000 }), '₱500k – ₱1.25M');
});

test('map links prefer the pasted link, then coordinates, then the address', () => {
  const pinned = { name: 'A Cars', address: 'Mandaue City', lat: 10.33, lng: 123.93 };
  assert.equal(mapsOpenUrl({ ...pinned, mapsUrl: 'https://maps.app.goo.gl/x' }), 'https://maps.app.goo.gl/x');
  assert.equal(mapsOpenUrl(pinned), 'https://www.google.com/maps/search/?api=1&query=10.33%2C123.93');
  const unpinned = { name: 'B & Sons Auto', address: 'Talisay City, Cebu' };
  assert.equal(mapsOpenUrl(unpinned), 'https://www.google.com/maps/search/?api=1&query=B%20%26%20Sons%20Auto%2C%20Talisay%20City%2C%20Cebu');
  assert.equal(directionsUrl(pinned), 'https://www.google.com/maps/dir/?api=1&destination=10.33%2C123.93');
});

/* ---- The dealer map (Web Mercator, 256 px tiles) ---- */

test('project puts 0,0 in the middle of the world', () => {
  assert.deepEqual(project(0, 0, 0), { x: 128, y: 128 });
  const p = project(0, 0, 2);
  assert.equal(p.x, 512);
  assert.equal(p.y, 512);
  assert.ok(project(10, 123, 10).y < project(0, 123, 10).y, 'north is up');
});

test('fitView shows every pin inside the padded frame, as zoomed-in as possible', () => {
  const pins = [{ lat: 10.2423, lng: 123.7839 }, { lat: 10.2826, lng: 123.8723 }, { lat: 10.2377, lng: 123.8388 }];
  const W = 360; const H = 270; const PAD = 36;
  const v = fitView(pins, W, H, PAD);
  const inside = (z) => pins.every(({ lat, lng }) => {
    const { x, y } = project(lat, lng, z);
    const cx = v.cx * 2 ** (z - v.z); const cy = v.cy * 2 ** (z - v.z);
    return Math.abs(x - cx) <= W / 2 - PAD && Math.abs(y - cy) <= H / 2 - PAD;
  });
  assert.ok(inside(v.z), 'all pins fit');
  assert.equal(inside(v.z + 1), false, 'one more zoom level would cut a pin off');
});

test('fitView: one pin gets a street-level zoom, none falls back to Cebu', () => {
  assert.equal(fitView([{ lat: 10.24, lng: 123.78 }], 300, 200).z, 15);
  const cebu = fitView([], 300, 200);
  assert.equal(cebu.z, 11);
  assert.deepEqual(project(10.3157, 123.8854, 11), { x: cebu.cx, y: cebu.cy });
});

test('visibleTiles covers the whole frame with no gaps', () => {
  const view = { z: 12, cx: 1000.5, cy: 2000.25 };
  const tiles = visibleTiles(view, 375, 281);
  const left = view.cx - 375 / 2; const top = view.cy - 281 / 2;
  assert.ok(tiles.every(t => t.left > -256 && t.left < 375 && t.top > -256 && t.top < 281));
  assert.equal(Math.min(...tiles.map(t => t.left)) <= 0 && Math.max(...tiles.map(t => t.left + 256)) >= 375, true);
  assert.equal(Math.min(...tiles.map(t => t.top)) <= 0 && Math.max(...tiles.map(t => t.top + 256)) >= 281, true);
  assert.equal(tiles[0].left, Math.floor(left / 256) * 256 - left);
  assert.equal(new Set(tiles.map(t => t.key)).size, tiles.length);
});

test('pins that would overlap are grouped, far ones stay apart', () => {
  const groups = clusterPins([
    { id: 1, x: 100, y: 100 }, { id: 2, x: 110, y: 104 }, { id: 3, x: 300, y: 300 }, { id: 4, x: 112, y: 96 },
  ], 32);
  assert.equal(groups.length, 2);
  const big = groups.find(g => g.members.length === 3);
  assert.deepEqual(big.members.map(m => m.id).sort(), [1, 2, 4]);
  assert.ok(Math.abs(big.x - 107.33) < 0.01 && Math.abs(big.y - 100) < 0.01, 'group sits at the middle of its pins');
  assert.equal(groups.find(g => g.members.length === 1).members[0].id, 3);
  assert.equal(clusterPins([], 32).length, 0);
});

test('pins come from the dealer itself first, then from dealerPins.js by link', () => {
  const pins = { 'https://maps.app.goo.gl/a': { lat: 10.25, lng: 123.8, place: 'A Cars' } };
  const [own, looked, none] = withPins([
    { name: 'Own', mapsUrl: 'https://maps.app.goo.gl/a', lat: 10.3, lng: 123.9 },
    { name: 'Looked up', mapsUrl: 'https://maps.app.goo.gl/a' },
    { name: 'None', mapsUrl: 'https://maps.app.goo.gl/zzz' },
  ], pins);
  assert.deepEqual([own.lat, own.lng], [10.3, 123.9]);
  assert.deepEqual([looked.lat, looked.lng], [10.25, 123.8]);
  assert.equal(none.lat, undefined);
  assert.equal(looked.name, 'Looked up');
});

test('a Google Maps link gives the shop pin, not the map centre', () => {
  const link = 'https://www.google.com/maps/place/Mr+Suave/@10.2423038,123.7813224,17z/data=!3m1!4b1!4m6!3m5!1s0x33a9:0x84d5!8m2!3d10.2423038!4d123.7838973!16s';
  assert.deepEqual(pinFromMapsLink(link), { lat: 10.2423038, lng: 123.7838973, place: 'Mr Suave' });
  assert.deepEqual(pinFromMapsLink('https://www.google.com/maps/@10.5,123.5,15z'), { lat: 10.5, lng: 123.5, place: '' });
  assert.equal(pinFromMapsLink('https://example.com'), null);
});

test('every dealer is complete, and pins sit around Cebu', () => {
  for (const pin of Object.values(PINS)) assert.ok(pin.lat > 9 && pin.lat < 11.5 && pin.lng > 123 && pin.lng < 124.5, `${pin.place}: not in Cebu`);
  for (const d of DEALERS) {
    assert.ok(d.name && d.area && d.address, `${d.name || '?'}: name, area and address are required`);
    if (d.lat != null || d.lng != null) {
      assert.ok(d.lat > 9 && d.lat < 11.5 && d.lng > 123 && d.lng < 124.5, `${d.name}: pin is not in Cebu`);
    }
  }
});

/* ---- The real data: every record must be complete and consistent ---- */

test('every id is unique and findable', () => {
  const ids = allVariants().map(v => v.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length > 60, `only ${ids.length} variants`);
  assert.equal(findVariant(ids[0]).id, ids[0]);
  assert.equal(findVariant('nope'), null);
  assert.equal(new Set(MODELS.map(m => m.id)).size, MODELS.length);
  assert.ok(POPULAR_PAIRS.length >= 4, 'offer a few popular comparisons');
  for (const { a, b, label } of POPULAR_PAIRS) assert.ok(label && findVariant(a) && findVariant(b) && a !== b, `popular pair ${label}`);
});

test('every generation has years, a sane price, problems and sources', () => {
  for (const m of MODELS) {
    assert.ok(m.sources?.length, `${m.id} needs sources`);
    for (const g of m.generations) {
      const where = `${m.id}/${g.id}`;
      assert.ok(g.years && g.label && g.summary, `${where} needs years, label, summary`);
      assert.ok(g.price.min > 50000 && g.price.min < g.price.max && g.price.max < 5000000, `${where} price`);
      assert.ok(g.problems?.length >= 2, `${where} needs problems to check`);
      for (const p of g.problems) assert.ok(p.title && p.detail && ['high', 'check'].includes(p.level), `${where} problem shape`);
      assert.ok(g.variants.length, `${where} needs variants`);
    }
  }
});

test('every variant uses known features and specs', () => {
  const specKeys = SPEC_ROWS.map(r => r.key);
  for (const v of allVariants()) {
    for (const f of v.features) assert.ok(FEATURES[f], `${v.id}: unknown feature ${f}`);
    for (const k of Object.keys(v.specs)) assert.ok(specKeys.includes(k), `${v.id}: unknown spec ${k}`);
    for (const k of ['engine', 'transmission', 'drive', 'fuel']) assert.ok(v.specs[k], `${v.id}: missing ${k}`);
    assert.equal(new Set(v.features).size, v.features.length, `${v.id}: duplicate feature`);
  }
});

test('findGeneration returns the model and generation, or null', () => {
  const found = findGeneration('montero-2016');
  assert.equal(found.model.id, 'montero');
  assert.equal(found.gen.id, 'montero-2016');
  assert.equal(findGeneration('nope-1999'), null);
  assert.equal(findGeneration(null), null);
});

test('every generation has its own checklist with unique check ids', () => {
  const genIds = MODELS.flatMap(m => m.generations.map(g => g.id));
  for (const id of genIds) {
    const c = GEN_CHECKS[id];
    assert.ok(c, `${id} needs checks`);
    assert.ok(c.intro, `${id} needs an intro`);
    assert.ok(c.items.length >= 8, `${id} needs at least 8 checks`);
    const ids = c.items.map(([k]) => k);
    assert.equal(new Set(ids).size, ids.length, `${id}: duplicate check id`);
    for (const [k, text] of c.items) assert.ok(k && text && text.length > 20, `${id}: check ${k} needs text`);
  }
  for (const id of Object.keys(GEN_CHECKS)) assert.ok(genIds.includes(id), `checks for unknown generation ${id}`);
});
