/* Showroom 360 data, saved in this browser (IndexedDB). Each visitor gets their own
   copy seeded with sample cars. Other open tabs refresh through a BroadcastChannel,
   so the admin and the public site can sit side by side during a pitch.
   If IndexedDB is unavailable (some private windows), everything still works in
   memory and `persistent` is false so the UI can say changes won't be kept. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { makeSeed, normalizeData, applySamplePhotos } from './seedData.js';
import { newPhotoId, orphanPhotoIds } from './showroomRules.js';
import { isSamplePhoto, samplePhotoUrl } from './samplePhotos.js';
import {
  carEntry, carDeletedEntry, eventEntry, eventDeletedEntry, settingsEntry, leadEntry, resetEntry,
  addToHistory, normalizeHistory,
} from './historyRules.js';

const DB_NAME = 'showroom360';
const DB_VERSION = 1;
const RECORD_STORES = ['cars', 'events', 'leads'];
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('showroom360') : null;

export const ShowroomContext = createContext(null);
export const useShowroom = () => useContext(ShowroomContext);

export const newId = (prefix) =>
  `${prefix}-${(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 13)}`;

/* ── backends: one for IndexedDB, one in memory, same shape ── */

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      for (const s of RECORD_STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('blocked'));
  });
}

function idbBackend(db) {
  /* `entry` (optional) is added to the history inside the same transaction as the change */
  const run = (stores, fn, entry) => new Promise((resolve, reject) => {
    const t = db.transaction(entry ? [...new Set([...stores, 'kv'])] : stores, 'readwrite');
    fn(t);
    if (entry) {
      const kv = t.objectStore('kv');
      const r = kv.get('history');
      r.onsuccess = () => kv.put(addToHistory(normalizeHistory(r.result), entry), 'history');
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  return {
    async load() {
      const t = db.transaction([...RECORD_STORES, 'kv'], 'readonly');
      const [cars, events, leads, settings, history] = await Promise.all([
        req(t.objectStore('cars').getAll()),
        req(t.objectStore('events').getAll()),
        req(t.objectStore('leads').getAll()),
        req(t.objectStore('kv').get('settings')),
        req(t.objectStore('kv').get('history')),
      ]);
      return { cars, events, leads, settings, history };
    },
    async photoIds() { return req(db.transaction('photos').objectStore('photos').getAllKeys()); },
    async photo(id) { return req(db.transaction('photos').objectStore('photos').get(id)); },
    put: (store, value, entry) => run([store], t => t.objectStore(store).put(value), entry),
    del: (store, id, entry) => run([store], t => t.objectStore(store).delete(id), entry),
    putSettings: (s, entry) => run(['kv'], t => t.objectStore('kv').put(s, 'settings'), entry),
    putPhoto: (id, blob) => run(['photos'], t => t.objectStore('photos').put(blob, id)),
    delPhotos: (ids) => run(['photos'], t => ids.forEach(id => t.objectStore('photos').delete(id))),
    /* Car delete touches cars, events and photos in one transaction */
    deleteCar: (id, photoIds, events, entry) => run(['cars', 'events', 'photos'], t => {
      t.objectStore('cars').delete(id);
      photoIds.forEach(p => t.objectStore('photos').delete(p));
      events.forEach(e => t.objectStore('events').put(e));
    }, entry),
    /* Clears everything, history included; `entry` becomes the only history line */
    reset: (seed, entry) => run([...RECORD_STORES, 'kv', 'photos'], t => {
      [...RECORD_STORES, 'kv', 'photos'].forEach(s => t.objectStore(s).clear());
      for (const s of RECORD_STORES) seed[s].forEach(v => t.objectStore(s).put(v));
      t.objectStore('kv').put(seed.settings, 'settings');
      if (entry) t.objectStore('kv').put([entry], 'history');
    }),
  };
}

function memoryBackend() {
  let mem = { cars: [], events: [], leads: [], settings: null, history: [] };
  const log = (entry) => { if (entry) mem = { ...mem, history: addToHistory(mem.history, entry) }; };
  const photos = new Map();
  const upsert = (list, v) => [...list.filter(x => x.id !== v.id), v];
  return {
    async load() { return mem; },
    async photoIds() { return [...photos.keys()]; },
    async photo(id) { return photos.get(id); },
    async put(store, value, entry) { mem = { ...mem, [store]: upsert(mem[store], value) }; log(entry); },
    async del(store, id, entry) { mem = { ...mem, [store]: mem[store].filter(x => x.id !== id) }; log(entry); },
    async putSettings(s, entry) { mem = { ...mem, settings: s }; log(entry); },
    async putPhoto(id, blob) { photos.set(id, blob); },
    async delPhotos(ids) { ids.forEach(id => photos.delete(id)); },
    async deleteCar(id, photoIds, events, entry) {
      photoIds.forEach(p => photos.delete(p));
      mem = { ...mem, cars: mem.cars.filter(c => c.id !== id), events: events.reduce(upsert, mem.events) };
      log(entry);
    },
    async reset(seed, entry) {
      photos.clear();
      mem = { cars: seed.cars, events: seed.events, leads: seed.leads, settings: seed.settings, history: entry ? [entry] : [] };
    },
  };
}

/* ── photos ── */

/* Shrinks a phone photo before saving it. Rejects files the browser can't decode (e.g. HEIC in Chrome). */
export async function resizeImage(file, maxEdge = 1600, quality = 0.82) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('unreadable'); }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  /* JPEG has no transparency: paint white first, or a transparent PNG logo turns black */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('unreadable'))), 'image/jpeg', quality));
}

/* ── the hook, used once at the app root and shared through ShowroomContext ── */

export function useShowroomStore() {
  const [state, setState] = useState({ ready: false, persistent: true, cars: [], events: [], leads: [], settings: null, history: [] });
  const backend = useRef(null);
  /* Who is signed in to the admin ('admin' | 'superadmin'); stamped on each history entry */
  const actor = useRef(null);
  const urls = useRef(new Map());
  /* Photos added in this tab that a reload may not have seen yet: never revoke these */
  const fresh = useRef(new Set());
  const reloadSeq = useRef(0);

  const syncPhotos = useCallback(async () => {
    const b = backend.current;
    const ids = new Set(await b.photoIds());
    for (const [id, url] of urls.current) {
      if (ids.has(id)) { fresh.current.delete(id); continue; }
      if (fresh.current.has(id)) continue;
      URL.revokeObjectURL(url);
      urls.current.delete(id);
    }
    for (const id of ids) {
      if (urls.current.has(id)) continue;
      const blob = await b.photo(id);
      if (blob) urls.current.set(id, URL.createObjectURL(blob));
    }
  }, []);

  /* Reloads can overlap (a save here plus a change from another tab): only the newest one wins */
  const reload = useCallback(async () => {
    const b = backend.current;
    if (!b) return;
    const seq = ++reloadSeq.current;
    const loaded = await b.load();
    const data = { ...normalizeData(loaded), history: normalizeHistory(loaded.history) };
    await syncPhotos();
    if (seq !== reloadSeq.current) return;
    setState(s => ({ ...s, ...data, ready: true }));
  }, [syncPhotos]);

  useEffect(() => {
    let alive = true;
    (async () => {
      let b;
      let persistent = true;
      try {
        b = idbBackend(await openDb());
        const loaded = await b.load();
        if (!loaded.settings) await b.reset(makeSeed(new Date()));
        else {
          /* A demo saved before the sample photos shipped gets them, once (not logged in History) */
          if (!loaded.settings.samplePhotos) {
            const { cars } = applySamplePhotos(normalizeData(loaded), new Date());
            for (const car of cars) await b.put('cars', car);
            await b.putSettings({ ...loaded.settings, samplePhotos: 1 });
          }
          /* Clear photos left behind by forms that were never saved (older than a day) */
          const orphans = orphanPhotoIds(await b.photoIds(), normalizeData(loaded), new Date());
          if (orphans.length) await b.delPhotos(orphans);
        }
        navigator.storage?.persist?.().catch(() => {});
      } catch {
        b = memoryBackend();
        await b.reset(makeSeed(new Date()));
        persistent = false;
      }
      if (!alive) return;
      backend.current = b;
      setState(s => ({ ...s, persistent }));
      await reload();
    })();
    const onMessage = () => { reload(); };
    channel?.addEventListener('message', onMessage);
    return () => { alive = false; channel?.removeEventListener('message', onMessage); };
  }, [reload]);

  /* Every change: write, re-read, tell the other tabs */
  const commit = useCallback(async (fn) => {
    await fn(backend.current);
    await reload();
    channel?.postMessage('changed');
  }, [reload]);

  /* A history entry for this change, stamped with who made it (null: nothing to log) */
  const stamp = (entry) => (entry ? { ...entry, by: actor.current || 'admin' } : null);

  const actions = {
    setActor: (role) => { actor.current = role; },
    saveCar: (car) => commit(b => b.put('cars', car,
      stamp(carEntry(state.cars.find(c => c.id === car.id), car, new Date())))),
    deleteCar: (id) => commit(b => {
      const car = state.cars.find(c => c.id === id);
      const events = state.events
        .filter(e => e.items.some(i => i.carId === id))
        .map(e => ({ ...e, items: e.items.filter(i => i.carId !== id) }));
      return b.deleteCar(id, car?.photoIds || [], events, stamp(carDeletedEntry(car, state.events, new Date())));
    }),
    saveEvent: (ev) => commit(b => b.put('events', ev,
      stamp(eventEntry(state.events.find(e => e.id === ev.id), ev, state.cars, new Date())))),
    deleteEvent: (id) => commit(b => b.del('events', id,
      stamp(eventDeletedEntry(state.events.find(e => e.id === id), new Date())))),
    /* A buyer's new request has no "before", so leadEntry logs nothing for it */
    saveLead: (lead) => commit(b => b.put('leads', lead,
      stamp(leadEntry(state.leads.find(l => l.id === lead.id), lead, new Date())))),
    saveSettings: (s) => commit(b => b.putSettings(s, stamp(settingsEntry(state.settings, s, new Date())))),
    async addPhoto(file, maxEdge) {
      const blob = await resizeImage(file, maxEdge);
      const id = newPhotoId();
      fresh.current.add(id);
      await backend.current.putPhoto(id, blob);
      urls.current.set(id, URL.createObjectURL(blob));
      return id;
    },
    /* sample photos ship with the site, so there is nothing saved to delete */
    removePhotos: (ids) => {
      const saved = ids.filter(id => !isSamplePhoto(id));
      saved.forEach(id => fresh.current.delete(id));
      return saved.length ? commit(b => b.delPhotos(saved)) : Promise.resolve();
    },
    photoUrl: (id) => samplePhotoUrl(id) || (id && urls.current.get(id)) || null,
    async photoBlob(id) {
      if (!isSamplePhoto(id)) return backend.current.photo(id);
      const url = samplePhotoUrl(id);
      try { return url ? await (await fetch(url)).blob() : null; } catch { return null; }
    },
    resetDemo: () => commit(b => b.reset(makeSeed(new Date()), stamp(resetEntry(new Date())))),
  };

  return { ...state, ...actions };
}
