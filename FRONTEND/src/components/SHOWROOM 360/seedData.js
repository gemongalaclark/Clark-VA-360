/* Sample shop for the pitch demo. Everything here is made up: the shop, the phone
   number (0900 is not a live prefix) and the cars. Prices sit inside CarMark 360's
   used-price range for the same generation (genId), checked by the tests. */
import { DEFAULT_FINANCING, DEFAULT_PRICE_RULE, carTitle } from './showroomRules.js';
import { samplePhotoSet } from './samplePhotos.js';

export const DEFAULT_SETTINGS = {
  shopName: 'Demo Motors Cebu',
  tagline: 'Pre-owned cars, checked and ready for Cebu roads.',
  about: 'A family-run used-car shop in Mandaue. Every unit is inspected for flood and accident damage before it goes on the lot, and we walk you through the papers and the bank financing.',
  phone: '0900 000 0000',
  messenger: '',
  viber: '',
  address: 'Mandaue City, Cebu',
  mapsUrl: '',
  lat: 10.3236,
  lng: 123.9223,
  hours: 'Mon–Sat, 8:00 AM – 6:00 PM',
  logoPhotoId: null,
  pin: '0360',          /* admin: cars, events, leads */
  superPin: '0361',     /* superadmin: everything, plus Settings and History */
  financing: DEFAULT_FINANCING,
  priceRule: DEFAULT_PRICE_RULE,
};

const DAY = 864e5;

/* [genId, year, make, model, variant, body, transmission, fuel, engine, drive, seats, km, color, price, listed days ago, extra]
   extra.photos names the car's bundled photo set (samplePhotos.js); color matches its front photo */
const ROWS = [
  ['vios-2018', 2019, 'Toyota', 'Vios', '1.3 E', 'sedan', 'cvt', 'gasoline', '1.3L', '4x2', 5, 42000, 'black', 548000, 12,
    { photos: 'vios-2019', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-04', plateEnding: '4',
      description: 'Casa-maintained with complete service records. Fresh tires, very clean interior. Ideal first car or Grab-ready sedan.' }],
  ['vios-2020', 2021, 'Toyota', 'Vios', '1.3 XLE', 'sedan', 'cvt', 'gasoline', '1.3L', '4x2', 5, 28500, 'white', 648000, 20,
    { photos: 'vios-2021', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-01',
      description: 'Low mileage, lady-driven. Dual front airbags, touchscreen with Android Auto. Under casa records until last PMS.' }],
  ['wigo-2014', 2020, 'Toyota', 'Wigo', '1.0 G', 'hatchback', 'automatic', 'gasoline', '1.0L', '4x2', 5, 35000, 'gray', 418000, 9,
    { photos: 'wigo-2020', floodFree: 'yes', accidentFree: 'unknown', casaMaintained: 'no', owners: '2', regUntil: '2026-12',
      description: 'Easy to park, cheap to run. City driving only. New battery (Sept 2026).' }],
  ['fortuner-2016', 2018, 'Toyota', 'Fortuner', '2.4 V 4x2', 'suv', 'automatic', 'diesel', '2.4L', '4x2', 7, 78000, 'white', 1185000, 6,
    { photos: 'fortuner-2018', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-06', featured: true,
      description: 'Top-of-the-line 4x2 diesel. Leather seats, power tailgate, reverse camera. Complete casa records.' }],
  ['montero-2016', 2017, 'Mitsubishi', 'Montero Sport', 'GLS Premium 2WD', 'suv', 'automatic', 'diesel', '2.4L', '4x2', 7, 92000, 'silver', 925000, 72,
    { photos: 'montero-2017', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'unknown', owners: '2', regUntil: '2027-02',
      knownIssues: 'Light scratches on the rear bumper. Aircon cleaned October 2026.',
      description: '8-speed automatic, keyless entry, 7 seats. Strong engine, no warning lights.' }],
  ['xpander-2018', 2020, 'Mitsubishi', 'Xpander', 'GLS', 'mpv', 'automatic', 'gasoline', '1.5L', '4x2', 7, 55000, 'gray', 698000, 15,
    { photos: 'xpander-2020', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-03',
      description: 'Family 7-seater with rear aircon. Fuel pump recall work already done at casa (receipt available).' }],
  ['xpander-2022', 2023, 'Mitsubishi', 'Xpander', 'Cross', 'mpv', 'automatic', 'gasoline', '1.5L', '4x2', 7, 18000, 'green', 985000, 4,
    { photos: 'xpander-cross-2023', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2026-12', featured: true,
      description: 'Practically new. LED headlights, Apple CarPlay, 225 mm ground clearance. Remaining casa warranty.' }],
  ['avanza-2012', 2019, 'Toyota', 'Avanza', '1.5 G', 'mpv', 'automatic', 'gasoline', '1.5L', '4x2', 7, 61000, 'black', 568000, 26,
    { photos: 'avanza-2019', floodFree: 'yes', accidentFree: 'unknown', casaMaintained: 'no', owners: '1', regUntil: '2027-05', status: 'reserved',
      description: 'Reliable 7-seater, well kept. Reserved, ask us about similar units.' }],
  ['city-2020', 2021, 'Honda', 'City', '1.5 V', 'sedan', 'cvt', 'gasoline', '1.5L', '4x2', 5, 24000, 'white', 788000, 3,
    { photos: 'city-2021', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-07', featured: true,
      description: 'New-generation City with 6 airbags, LED lights and a smooth CVT. One owner, garage kept.' }],
  ['civic-2016', 2018, 'Honda', 'Civic', '1.5 RS Turbo', 'sedan', 'cvt', 'gasoline', '1.5L Turbo', '4x2', 5, 48000, 'silver', 965000, 40,
    { photos: 'civic-2018', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-01', status: 'sold', soldDaysAgo: 6,
      description: 'RS Turbo with paddle shifters and LED headlights.' }],
  ['brv-2017', 2019, 'Honda', 'BR-V', '1.5 V', 'mpv', 'cvt', 'gasoline', '1.5L', '4x2', 7, 52000, 'silver', 638000, 95,
    { photos: 'brv-2019', floodFree: 'unknown', accidentFree: 'yes', casaMaintained: 'no', owners: '2', regUntil: '2026-11',
      description: '7 seats with high ground clearance for Cebu floods and rough roads. Registration due this month.' }],
  ['hiace-2005', 2016, 'Toyota', 'HiAce', 'GL Grandia 3.0', 'van', 'automatic', 'diesel', '3.0L', '4x2', 12, 110000, 'pearl', 1095000, 50,
    { photos: 'hiace-2016', floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'unknown', owners: '1', regUntil: '2027-03', status: 'sold', soldDaysAgo: 15,
      description: 'Company-owned shuttle, maintained on schedule.' }],
];

/* Saved data from an older version (or a broken save) is repaired on load instead
   of crashing the page: missing settings fall back to the defaults, and records get
   the fields the app relies on. Good data comes back unchanged. */
export function normalizeData(data, now = new Date()) {
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const list = (v) => (Array.isArray(v) ? v.filter(r => isObj(r) && r.id) : []);
  const s = isObj(data?.settings) ? data.settings : {};
  const fin = isObj(s.financing) ? s.financing : {};
  const addOn = isObj(fin.addOn) && Object.keys(fin.addOn).length ? fin.addOn : DEFAULT_FINANCING.addOn;
  return {
    cars: list(data?.cars).map(c => ({
      status: 'available', featured: false, soldAt: null, listedAt: now.toISOString(), stockNo: '',
      ...c,
      photoIds: Array.isArray(c.photoIds) ? c.photoIds : [],
    })),
    events: list(data?.events).map(e => ({
      name: '', tagline: '', promoId: null, ...e,
      items: Array.isArray(e.items) ? e.items.filter(i => isObj(i) && i.carId) : [],
    })),
    leads: list(data?.leads).map(l => {
      const lead = { status: 'new', carLabel: '', ...l };
      if (lead.type !== 'wish') return lead;
      return {
        ...lead,
        query: isObj(lead.query) ? lead.query : {},
        notifiedCarIds: Array.isArray(lead.notifiedCarIds) ? lead.notifiedCarIds : [],
      };
    }),
    promos: list(data?.promos).map(p => ({
      name: '', code: '', permit: '', ...p,
      prizes: Array.isArray(p.prizes) ? p.prizes.filter(isObj) : [],
    })),
    claims: list(data?.claims).map(c => ({ redeemedAt: null, stockNo: '', ...c })),
    settings: {
      ...DEFAULT_SETTINGS, ...s,
      financing: { ...DEFAULT_FINANCING, ...fin, addOn },
      priceRule: { ...DEFAULT_PRICE_RULE, ...(isObj(s.priceRule) ? s.priceRule : {}) },
    },
  };
}

export function makeSeed(now = new Date()) {
  const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();
  const cars = ROWS.map((r, i) => {
    const [genId, year, make, model, variant, body, transmission, fuel, engine, drive, seats, odometer, color, price, listedDaysAgo, extra] = r;
    const { soldDaysAgo, photos, ...rest } = extra;
    return {
      id: `car-${String(i + 1).padStart(2, '0')}`,
      stockNo: `SR-${String(i + 1).padStart(4, '0')}`,
      genId, year, make, model, variant, body, transmission, fuel, engine, drive, seats, odometer, color, price,
      negotiable: true, financing: body !== 'van', orcr: 'complete', regUntil: '', owners: 'unknown', plateEnding: '',
      floodFree: 'unknown', accidentFree: 'unknown', casaMaintained: 'unknown', knownIssues: '', description: '',
      status: 'available', soldAt: soldDaysAgo ? ago(soldDaysAgo) : null, featured: false,
      photoIds: photos ? samplePhotoSet(photos) : [],
      listedAt: ago(listedDaysAgo),
      ...rest,
    };
  });

  const event = {
    id: 'event-christmas',
    name: 'Christmas Sale',
    tagline: 'Year-end prices on selected units. Reserve before the holidays.',
    startsAt: ago(3),
    endsAt: ago(-30),
    promoId: SAMPLE_PROMO_ID,
    items: [
      { carId: 'car-01', salePrice: 525000 },
      { carId: 'car-03', salePrice: 398000 },
      { carId: 'car-06', salePrice: 668000 },
    ],
  };

  return {
    cars, events: [event], leads: sampleLeads(now, cars), promos: [samplePromo(now)], claims: [],
    settings: {
      ...DEFAULT_SETTINGS, samplePhotos: 1, sampleLeads: 1, samplePromo: 1,
      financing: { ...DEFAULT_FINANCING, addOn: { ...DEFAULT_FINANCING.addOn } }, priceRule: { ...DEFAULT_PRICE_RULE },
    },
  };
}

/* Sample promo (2026-11-24): a prize wheel on the Christmas Sale, so a fresh demo shows
   the buyer pop-up. The odds keep the dear prize rare. No DTI permit: it says "sample". */
const SAMPLE_PROMO_ID = 'promo-sample';
export function samplePromo(now) {
  const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();
  return {
    id: SAMPLE_PROMO_ID, name: 'Christmas Spin', code: 'SPIN-XMAS', permit: '',
    prizes: [
      { id: 'prize-1', label: '₱5,000 off', chance: 40 },
      { id: 'prize-2', label: 'Full tank of gas', chance: 30 },
      { id: 'prize-3', label: 'Free window tint', chance: 25 },
      { id: 'prize-4', label: '₱10,000 off', chance: 5 },
    ],
    startsAt: ago(3), endsAt: ago(-30), createdAt: ago(3),
  };
}

/* A demo saved before promos shipped gets the sample promo once (settings.samplePromo marks
   it done). It is put on the Christmas Sale only if that sale is still there and has no
   promo of its own. Returns the data, the added promo and the changed event (or nulls). */
export function applySamplePromo(data, now = new Date()) {
  if (data.settings?.samplePromo || data.promos.some(p => p.id === SAMPLE_PROMO_ID)) return { data, promo: null, event: null };
  const promo = samplePromo(now);
  const sale = data.events.find(e => e.id === 'event-christmas' && !e.promoId);
  const event = sale ? { ...sale, promoId: promo.id } : null;
  return {
    data: { ...data, promos: [...data.promos, promo], events: data.events.map(e => (event && e.id === event.id ? event : e)) },
    promo, event,
  };
}

/* Sample buyers (2026-11-24), so a fresh demo shows every autopilot task: a late reply
   (Mark), a test drive to remind (Joy), a quiet reservation (Liza), and two waitlist
   requests. Ramon's matches once the Montero's suggested price drop is applied; Ana's
   matches when a Toyota MPV up to ₱900,000 is added live during a pitch. Ben's closed
   test drive gives the week report something to count. Made-up names and 0900 numbers.
   Only buyers whose car is in `cars` are returned (waitlist buyers have no car). */
export function sampleLeads(now, cars) {
  const at = (hours) => new Date(now.getTime() - hours * 36e5).toISOString();
  const day = (d) => {
    const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  const rows = [
    { id: 'lead-sample-1', type: 'test-drive', carId: 'car-04', name: 'Mark D.', mobile: '0900 000 0101', lang: 'en',
      date: day(1), slot: 'morning', note: 'Can I bring my own mechanic?', status: 'new', createdAt: at(3) },
    { id: 'lead-sample-2', type: 'test-drive', carId: 'car-09', name: 'Joy R.', mobile: '0900 000 0102', lang: 'ceb',
      date: day(1), slot: 'afternoon', note: '', status: 'contacted', createdAt: at(26), contactedAt: at(25) },
    { id: 'lead-sample-3', type: 'reserve', carId: 'car-06', name: 'Liza C.', mobile: '0900 000 0103', lang: 'en',
      date: '', slot: '', note: 'Planning to apply for a bank loan.', status: 'contacted', createdAt: at(5 * 24), contactedAt: at(4 * 24) },
    { id: 'lead-sample-4', type: 'wish', carId: null, carLabel: 'SUV · up to ₱900,000', query: { body: 'suv', priceMax: 900000 },
      notifiedCarIds: [], name: 'Ramon T.', mobile: '0900 000 0104', lang: 'en',
      date: '', slot: '', note: 'Diesel if possible.', status: 'contacted', createdAt: at(8 * 24), contactedAt: at(8 * 24 - 1) },
    { id: 'lead-sample-5', type: 'wish', carId: null, carLabel: 'Toyota · MPV · up to ₱900,000', query: { make: 'Toyota', body: 'mpv', priceMax: 900000 },
      notifiedCarIds: [], name: 'Ana P.', mobile: '0900 000 0105', lang: 'ceb',
      date: '', slot: '', note: '', status: 'contacted', createdAt: at(3 * 24), contactedAt: at(3 * 24 - 2) },
    { id: 'lead-sample-6', type: 'test-drive', carId: 'car-10', name: 'Ben S.', mobile: '0900 000 0106', lang: 'en',
      date: day(-7), slot: 'morning', note: '', status: 'closed', createdAt: at(8 * 24), contactedAt: at(8 * 24 - 1) },
  ];
  const byId = new Map(cars.map(c => [c.id, c]));
  return rows
    .filter(r => !r.carId || byId.has(r.carId))
    .map(r => (r.carId ? { ...r, carLabel: `${carTitle(byId.get(r.carId))} (${byId.get(r.carId).stockNo})` } : r));
}

/* A demo saved before the sample buyers shipped gets them once (settings.sampleLeads marks
   it done). A buyer is skipped if their car was deleted or is now a different make or model,
   or if they are already there. Returns the data and the added leads. */
export function applySampleLeads(data, now = new Date()) {
  if (data.settings?.sampleLeads) return { data, leads: [] };
  const seed = Object.fromEntries(makeSeed(now).cars.map(c => [c.id, c]));
  const same = data.cars.filter(c => seed[c.id] && seed[c.id].make === c.make && seed[c.id].model === c.model);
  const have = new Set(data.leads.map(l => l.id));
  const leads = sampleLeads(now, same).filter(l => !have.has(l.id));
  return { data: { ...data, leads: [...data.leads, ...leads] }, leads };
}

/* The sample cars' colours before they were matched to their photos (2026-11-24) */
const COLORS_BEFORE_PHOTOS = {
  'car-01': 'silver', 'car-03': 'red', 'car-04': 'black', 'car-05': 'pearl', 'car-07': 'blue',
  'car-08': 'brown', 'car-09': 'red', 'car-10': 'pearl', 'car-12': 'white',
};

/* A demo saved before the sample photos shipped gets them once (settings.samplePhotos
   marks it done, so photos a dealer removes later stay removed). Only a sample car that
   is still the same make and model and has no photos gets its set, and its colour moves
   to match only if it is still the old sample colour. Returns the data and the changed cars. */
export function applySamplePhotos(data, now = new Date()) {
  if (data.settings?.samplePhotos) return { data, cars: [] };
  const seed = Object.fromEntries(makeSeed(now).cars.map(c => [c.id, c]));
  const changed = [];
  const cars = data.cars.map(c => {
    const s = seed[c.id];
    if (!s || s.make !== c.make || s.model !== c.model || c.photoIds.length) return c;
    const next = { ...c, photoIds: s.photoIds };
    if (c.color === (COLORS_BEFORE_PHOTOS[c.id] || s.color)) next.color = s.color;
    changed.push(next);
    return next;
  });
  return { data: { ...data, cars, settings: { ...data.settings, samplePhotos: 1 } }, cars: changed };
}
