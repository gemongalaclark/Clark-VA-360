/* Sample shop for the pitch demo. Everything here is made up: the shop, the phone
   number (0900 is not a live prefix) and the cars. Prices sit inside CarMark 360's
   used-price range for the same generation (genId), checked by the tests. */
import { DEFAULT_FINANCING } from './showroomRules.js';

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
};

const DAY = 864e5;

/* [genId, year, make, model, variant, body, transmission, fuel, engine, drive, seats, km, color, price, listed days ago, extra] */
const ROWS = [
  ['vios-2018', 2019, 'Toyota', 'Vios', '1.3 E', 'sedan', 'cvt', 'gasoline', '1.3L', '4x2', 5, 42000, 'silver', 548000, 12,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-04', plateEnding: '4',
      description: 'Casa-maintained with complete service records. Fresh tires, very clean interior. Ideal first car or Grab-ready sedan.' }],
  ['vios-2020', 2021, 'Toyota', 'Vios', '1.3 XLE', 'sedan', 'cvt', 'gasoline', '1.3L', '4x2', 5, 28500, 'white', 648000, 20,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-01',
      description: 'Low mileage, lady-driven. Dual front airbags, touchscreen with Android Auto. Under casa records until last PMS.' }],
  ['wigo-2014', 2020, 'Toyota', 'Wigo', '1.0 G', 'hatchback', 'automatic', 'gasoline', '1.0L', '4x2', 5, 35000, 'red', 418000, 9,
    { floodFree: 'yes', accidentFree: 'unknown', casaMaintained: 'no', owners: '2', regUntil: '2026-12',
      description: 'Easy to park, cheap to run. City driving only. New battery (Sept 2026).' }],
  ['fortuner-2016', 2018, 'Toyota', 'Fortuner', '2.4 V 4x2', 'suv', 'automatic', 'diesel', '2.4L', '4x2', 7, 78000, 'black', 1185000, 6,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-06', featured: true,
      description: 'Top-of-the-line 4x2 diesel. Leather seats, power tailgate, reverse camera. Complete casa records.' }],
  ['montero-2016', 2017, 'Mitsubishi', 'Montero Sport', 'GLS Premium 2WD', 'suv', 'automatic', 'diesel', '2.4L', '4x2', 7, 92000, 'pearl', 925000, 72,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'unknown', owners: '2', regUntil: '2027-02',
      knownIssues: 'Light scratches on the rear bumper. Aircon cleaned October 2026.',
      description: '8-speed automatic, keyless entry, 7 seats. Strong engine, no warning lights.' }],
  ['xpander-2018', 2020, 'Mitsubishi', 'Xpander', 'GLS', 'mpv', 'automatic', 'gasoline', '1.5L', '4x2', 7, 55000, 'gray', 698000, 15,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-03',
      description: 'Family 7-seater with rear aircon. Fuel pump recall work already done at casa (receipt available).' }],
  ['xpander-2022', 2023, 'Mitsubishi', 'Xpander', 'Cross', 'mpv', 'automatic', 'gasoline', '1.5L', '4x2', 7, 18000, 'blue', 985000, 4,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2026-12', featured: true,
      description: 'Practically new. LED headlights, Apple CarPlay, 225 mm ground clearance. Remaining casa warranty.' }],
  ['avanza-2012', 2019, 'Toyota', 'Avanza', '1.5 G', 'mpv', 'automatic', 'gasoline', '1.5L', '4x2', 7, 61000, 'brown', 568000, 26,
    { floodFree: 'yes', accidentFree: 'unknown', casaMaintained: 'no', owners: '1', regUntil: '2027-05', status: 'reserved',
      description: 'Reliable 7-seater, well kept. Reserved, ask us about similar units.' }],
  ['city-2020', 2021, 'Honda', 'City', '1.5 V', 'sedan', 'cvt', 'gasoline', '1.5L', '4x2', 5, 24000, 'red', 788000, 3,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-07', featured: true,
      description: 'New-generation City with 6 airbags, LED lights and a smooth CVT. One owner, garage kept.' }],
  ['civic-2016', 2018, 'Honda', 'Civic', '1.5 RS Turbo', 'sedan', 'cvt', 'gasoline', '1.5L Turbo', '4x2', 5, 48000, 'pearl', 965000, 40,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'yes', owners: '1', regUntil: '2027-01', status: 'sold', soldDaysAgo: 6,
      description: 'RS Turbo with paddle shifters and LED headlights.' }],
  ['brv-2017', 2019, 'Honda', 'BR-V', '1.5 V', 'mpv', 'cvt', 'gasoline', '1.5L', '4x2', 7, 52000, 'silver', 638000, 95,
    { floodFree: 'unknown', accidentFree: 'yes', casaMaintained: 'no', owners: '2', regUntil: '2026-11',
      description: '7 seats with high ground clearance for Cebu floods and rough roads. Registration due this month.' }],
  ['hiace-2005', 2016, 'Toyota', 'HiAce', 'GL Grandia 3.0', 'van', 'automatic', 'diesel', '3.0L', '4x2', 12, 110000, 'white', 1095000, 50,
    { floodFree: 'yes', accidentFree: 'yes', casaMaintained: 'unknown', owners: '1', regUntil: '2027-03', status: 'sold', soldDaysAgo: 15,
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
      name: '', tagline: '', ...e,
      items: Array.isArray(e.items) ? e.items.filter(i => isObj(i) && i.carId) : [],
    })),
    leads: list(data?.leads).map(l => ({ status: 'new', carLabel: '', ...l })),
    settings: { ...DEFAULT_SETTINGS, ...s, financing: { ...DEFAULT_FINANCING, ...fin, addOn } },
  };
}

export function makeSeed(now = new Date()) {
  const ago = (days) => new Date(now.getTime() - days * DAY).toISOString();
  const cars = ROWS.map((r, i) => {
    const [genId, year, make, model, variant, body, transmission, fuel, engine, drive, seats, odometer, color, price, listedDaysAgo, extra] = r;
    const { soldDaysAgo, ...rest } = extra;
    return {
      id: `car-${String(i + 1).padStart(2, '0')}`,
      stockNo: `SR-${String(i + 1).padStart(4, '0')}`,
      genId, year, make, model, variant, body, transmission, fuel, engine, drive, seats, odometer, color, price,
      negotiable: true, financing: body !== 'van', orcr: 'complete', regUntil: '', owners: 'unknown', plateEnding: '',
      floodFree: 'unknown', accidentFree: 'unknown', casaMaintained: 'unknown', knownIssues: '', description: '',
      status: 'available', soldAt: soldDaysAgo ? ago(soldDaysAgo) : null, featured: false, photoIds: [],
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
    items: [
      { carId: 'car-01', salePrice: 525000 },
      { carId: 'car-03', salePrice: 398000 },
      { carId: 'car-06', salePrice: 668000 },
    ],
  };

  return { cars, events: [event], leads: [], settings: { ...DEFAULT_SETTINGS, financing: { ...DEFAULT_FINANCING, addOn: { ...DEFAULT_FINANCING.addOn } } } };
}
