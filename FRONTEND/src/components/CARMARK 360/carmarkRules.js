/* CarMark 360 logic: plain functions, tested in carmarkRules.test.js */
import { MODELS, SPEC_ROWS } from './carData.js';

/* Features that come with another one, so a car is never shown as "lacking" them */
const IMPLIES = { camera360: ['reverseCam'], carplay: ['touchscreen'] };

/* A variant = its generation's base specs and features, plus its own */
export function resolveVariant(model, gen, variant) {
  const features = [];
  const add = (f) => { if (!features.includes(f)) features.push(f); (IMPLIES[f] || []).forEach(add); };
  [...(gen.base?.features || []), ...(variant.features || [])].forEach(add);
  return {
    id: variant.id,
    name: variant.name,
    fullName: `${model.name} ${variant.name}`,
    years: variant.years || gen.years,
    model, gen,
    specs: { ...(gen.base?.specs || {}), ...(variant.specs || {}) },
    features,
  };
}

let cache = null;
export function allVariants() {
  if (!cache) {
    cache = MODELS.flatMap(m => m.generations.flatMap(g => g.variants.map(v => resolveVariant(m, g, v))));
  }
  return cache;
}

export const findVariant = (id) => allVariants().find(v => v.id === id) || null;

/* A generation by id, with its model: { model, gen } or null */
export function findGeneration(id) {
  for (const model of MODELS) {
    const gen = model.generations.find(g => g.id === id);
    if (gen) return { model, gen };
  }
  return null;
}

export function diffVariants(a, b) {
  const rows = SPEC_ROWS
    .filter(({ key }) => a.specs[key] || b.specs[key])
    .map(({ key, label }) => {
      const av = a.specs[key] || '—';
      const bv = b.specs[key] || '—';
      return { key, label, a: av, b: bv, same: av === bv };
    });
  return {
    rows,
    onlyA: a.features.filter(f => !b.features.includes(f)),
    onlyB: b.features.filter(f => !a.features.includes(f)),
    shared: a.features.filter(f => b.features.includes(f)),
  };
}

export function formatPeso(n) {
  if (n >= 1e6) return `₱${+(n / 1e6).toFixed(2)}M`;
  return `₱${Math.round(n / 1000)}k`;
}

export const priceRange = (p) => `${formatPeso(p.min)} – ${formatPeso(p.max)}`;

/* ---- Google Maps links (no API key needed) ---- */
const where = (d) => (d.lat != null && d.lng != null ? `${d.lat},${d.lng}` : `${d.name}, ${d.address}`);

export const mapsOpenUrl = (d) => d.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where(d))}`;

export const directionsUrl = (d) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where(d))}`;

/* ---- Dealer map: Web Mercator maths for 256 px map tiles ---- */
export const TILE = 256;
const CEBU = { lat: 10.3157, lng: 123.8854 };

/* A point's position in pixels on the whole world map at zoom z */
export function project(lat, lng, z) {
  const size = TILE * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

/* The closest zoom (and its centre, in world pixels) that keeps every pin inside the frame */
export function fitView(points, width, height, pad = 36, maxZoom = 16) {
  if (!points.length) {
    const c = project(CEBU.lat, CEBU.lng, 11);
    return { z: 11, cx: c.x, cy: c.y };
  }
  if (points.length === 1) {
    const c = project(points[0].lat, points[0].lng, 15);
    return { z: 15, cx: c.x, cy: c.y };
  }
  for (let z = maxZoom; z >= 3; z--) {
    const px = points.map(p => project(p.lat, p.lng, z));
    const xs = px.map(p => p.x);
    const ys = px.map(p => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    if (maxX - minX <= width - 2 * pad && maxY - minY <= height - 2 * pad) {
      return { z, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    }
  }
  const c = project(points[0].lat, points[0].lng, 3);
  return { z: 3, cx: c.x, cy: c.y };
}

/* The tiles needed to fill a width × height frame centred on the view */
export function visibleTiles({ z, cx, cy }, width, height) {
  const n = 2 ** z;
  const left = cx - width / 2;
  const top = cy - height / 2;
  const tiles = [];
  for (let ty = Math.floor(top / TILE); ty <= Math.ceil((top + height) / TILE) - 1; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(left / TILE); tx <= Math.ceil((left + width) / TILE) - 1; tx++) {
      const x = ((tx % n) + n) % n;
      tiles.push({ key: `${z}/${x}/${ty}`, z, x, y: ty, left: tx * TILE - left, top: ty * TILE - top });
    }
  }
  return tiles;
}

/* ---- Dealer pins ---- */

/* The shop's pin from a full Google Maps place link. The "!3d…!4d…" part is the shop itself;
   the "@lat,lng" part is only where the map was centred, so it is the fallback. */
export function pinFromMapsLink(url) {
  const shop = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const centre = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = shop || centre;
  if (!m) return null;
  const place = url.match(/\/maps\/place\/([^/]+)/);
  return { lat: Number(m[1]), lng: Number(m[2]), place: place ? decodeURIComponent(place[1].replace(/\+/g, ' ')) : '' };
}

/* Dealers with their pin: one typed into the dealer wins, else the one looked up from its link */
export const withPins = (dealers, pins) => dealers.map((d) => {
  if (d.lat != null && d.lng != null) return d;
  const pin = d.mapsUrl && pins[d.mapsUrl];
  return pin ? { ...d, lat: pin.lat, lng: pin.lng } : d;
});

/* Group pins closer than `radius` screen pixels, so they don't pile on top of each other.
   Items: [{ x, y, ... }] in screen pixels. Returns [{ x, y, members }], x/y = the members' middle. */
export function clusterPins(items, radius) {
  const groups = [];
  for (const item of items) {
    const near = groups.find(g => Math.hypot(g.x - item.x, g.y - item.y) < radius);
    if (near) {
      near.members.push(item);
      near.x = near.members.reduce((s, m) => s + m.x, 0) / near.members.length;
      near.y = near.members.reduce((s, m) => s + m.y, 0) / near.members.length;
    } else {
      groups.push({ x: item.x, y: item.y, members: [item] });
    }
  }
  return groups;
}
