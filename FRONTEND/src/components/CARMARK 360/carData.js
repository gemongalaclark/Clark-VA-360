/* CarMark 360 car data: the reference "doc" the app reads.

   Shape: model → generations → variants.
   - A generation's `base` holds the specs and features every variant of it shares;
     each variant adds or overrides its own. Differences are worked out from this.
   - `price` is a rough secondhand ASKING price range in pesos for the generation
     (Carmudi, Philkotse and Automart listings, November 2026). It is a guide, not a quote.
   - `problems`: level 'high' = can cost you the car or a big repair; 'check' = inspect it.
   - Features are the main differences between Philippine variants at launch. Where sources
     disagreed, the feature was left out instead of guessed. Units can differ: check the car.

   To update a price, edit its `price`. To add a model, copy one and change it.
   Run the checks after editing: node --test "FRONTEND/src/components/CARMARK 360/carmarkRules.test.js" */

export const DATA_AS_OF = 'November 2026';

export const FEATURES = {
  abs: 'ABS brakes with EBD',
  airbags2: 'Front airbags (driver + passenger)',
  sideAirbags: 'Side and curtain airbags',
  stability: 'Stability and traction control',
  hillStart: 'Hill start assist',
  adas: 'Driver assist: auto emergency braking, lane assist, adaptive cruise',
  bsm: 'Blind spot monitor',
  reverseCam: 'Reverse camera',
  camera360: '360° camera',
  parkingSensors: 'Parking sensors',
  pushStart: 'Keyless push-button start',
  autoAC: 'Automatic climate control',
  rearAC: 'Rear A/C vents or blower',
  touchscreen: 'Touchscreen infotainment',
  carplay: 'Apple CarPlay / Android Auto',
  nav: 'Built-in navigation',
  cruise: 'Cruise control',
  ledHead: 'LED headlights',
  fog: 'Fog lamps',
  alloy: 'Alloy wheels',
  roofRails: 'Roof rails',
  skidPlates: 'Skid plates and body cladding',
  bodyKit: 'Sport body kit',
  sportTuned: 'Sport-tuned suspension',
  leather: 'Leather or synthetic-leather seats',
  powerSeat: 'Power-adjustable driver seat',
  powerTailgate: 'Power tailgate',
  paddles: 'Paddle shifters',
  diffLock: 'Rear differential lock',
  sunroof: 'Sunroof or moonroof',
  evMode: 'Hybrid with EV-only mode',
  captainSeats: 'Captain seats in the cabin',
};

export const SPEC_ROWS = [
  { key: 'engine', label: 'Engine' },
  { key: 'power', label: 'Power' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'drive', label: 'Drive' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'seats', label: 'Seats' },
  { key: 'clearance', label: 'Ground clearance' },
  { key: 'wheels', label: 'Wheels' },
];

/* One-tap starting points on the empty Compare page */
export const POPULAR_PAIRS = [
  { label: 'Xpander GLS vs Xpander Cross', a: 'xpander-2022:gls-at', b: 'xpander-2022:cross-at' },
  { label: 'Fortuner vs Montero Sport', a: 'fortuner-2016:v-at', b: 'montero-2016:gls-prem-at' },
  { label: 'Vios vs City', a: 'vios-2020:g-cvt', b: 'city-2020:v-cvt' },
  { label: 'Avanza vs Veloz', a: 'avanza-2022:g-cvt', b: 'veloz-2022:g-cvt' },
  { label: 'Stargazer vs Xpander', a: 'stargazer-2022:gls-ivt', b: 'xpander-2022:gls-at' },
  { label: 'Wigo vs Brio', a: 'wigo-2023:g-cvt', b: 'brio-2019:v-cvt' },
];

/* Reused problem notes */
const FLEET = (car) => ({
  level: 'high',
  title: 'Ex-Grab, taxi or fleet unit',
  detail: `Many ${car}s were used for ride-hailing or company fleets and run very high mileage. Check the CR for "for hire" history, look for worn driver-seat bolsters, steering wheel and pedals, and ask for the full service record.`,
});
const CVT = {
  level: 'check',
  title: 'CVT judder or delay',
  detail: 'On the test drive, pull away gently from a stop and at low speed. Shudder, a whining noise or a delay before it moves points to old CVT fluid or a worn CVT. Ask when the CVT fluid was last changed (usually every 40,000–50,000 km).',
};

export const MODELS = [
  /* ───────────── MITSUBISHI XPANDER ───────────── */
  {
    id: 'xpander', make: 'Mitsubishi', name: 'Xpander', body: '7-seat MPV',
    sources: [
      { label: 'Top Gear PH: 2026 Xpander launch', url: 'https://www.topgear.com.ph/news/car-news/my26-mitsubishi-xpander-launch-ph-a5100-20250829' },
      { label: 'Top Gear PH: 2023 Xpander Cross', url: 'https://www.topgear.com.ph/features/feature-articles/mitsubishi-xpander-cross-2023-specs-features-a4354-20230126' },
      { label: 'Philkotse: Xpander fuel pump issue', url: 'https://philkotse.com/market-news/mitsubishi-is-working-to-fix-the-xpanders-fuel-pump-problem-4837' },
      { label: 'Philkotse: Xpander common problems', url: 'https://philkotse.com/car-maintenance/mitsubishi-xpander-common-problems-10865' },
    ],
    generations: [
      {
        id: 'xpander-2018', label: '1st gen', years: '2018–2022',
        summary: 'Launched in the Philippines in 2018 with a 1.5 gas engine and a 4-speed automatic. The Xpander Cross arrived in March 2020 as the raised, SUV-styled version and replaced the GLS Sport.',
        price: { min: 480000, max: 800000, note: 'GLX at the low end, Cross at the top.' },
        base: {
          specs: { engine: '1.5L gas (4A91 MIVEC)', power: '104 hp · 141 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', clearance: '205 mm', wheels: 'Steel wheels' },
          features: ['abs', 'airbags2', 'rearAC'],
        },
        variants: [
          { id: 'xpander-2018:glx-mt', name: 'GLX MT' },
          { id: 'xpander-2018:gls-at', name: 'GLS AT', specs: { transmission: '4-speed automatic', wheels: '16-inch alloy' }, features: ['alloy', 'pushStart', 'touchscreen'] },
          { id: 'xpander-2018:gls-sport-at', name: 'GLS Sport AT', years: '2018–2020', specs: { transmission: '4-speed automatic', wheels: '16-inch alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'stability', 'hillStart', 'bodyKit'] },
          { id: 'xpander-2018:cross-at', name: 'Cross AT', years: '2020–2022', specs: { transmission: '4-speed automatic', clearance: '225 mm', wheels: '17-inch two-tone alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'stability', 'hillStart', 'ledHead', 'fog', 'roofRails', 'skidPlates'] },
        ],
        problems: [
          { level: 'high', title: 'Fuel pump recall (2018–2019 units)', detail: 'Units sold from May 2018 to October 2019 were recalled for a faulty fuel pump that can make the car hard to start or stall. Ask a Mitsubishi dealer to check the VIN and confirm the recall work was done.' },
          { level: 'check', title: 'Hard starting', detail: 'Owners report hard starts, often a fuse or the fuel pump. Start it cold in front of you.' },
          { level: 'check', title: 'Front brake judder', detail: 'A shaking steering wheel when braking from speed means warped front discs. Cheap to fix, but use it to bargain.' },
          { level: 'check', title: '4-speed automatic', detail: 'It feels slow, which is normal. Slipping, flaring revs or harsh 2nd-to-3rd shifts are not.' },
          FLEET('Xpander'),
        ],
      },
      {
        id: 'xpander-2022', label: '1st gen facelift', years: '2022–2025',
        summary: 'New face with T-shaped lights in May 2022, and ground clearance raised to 225 mm. The Philippine units kept the 4-speed automatic (the CVT is Indonesia-only). The Xpander Cross got the same refresh in early 2023.',
        price: { min: 650000, max: 1000000, note: 'Cross and late-model GLS at the top.' },
        base: {
          specs: { engine: '1.5L gas (4A91 MIVEC)', power: '104 hp · 141 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', clearance: '225 mm', wheels: '16-inch' },
          features: ['abs', 'airbags2', 'rearAC'],
        },
        variants: [
          { id: 'xpander-2022:glx-mt', name: 'GLX MT' },
          { id: 'xpander-2022:glx-at', name: 'GLX AT', specs: { transmission: '4-speed automatic' } },
          { id: 'xpander-2022:gls-at', name: 'GLS AT', specs: { transmission: '4-speed automatic', wheels: '17-inch alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'reverseCam', 'ledHead', 'stability', 'hillStart'] },
          { id: 'xpander-2022:cross-at', name: 'Cross AT', years: '2023–2025', specs: { transmission: '4-speed automatic', wheels: '17-inch two-tone alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'reverseCam', 'ledHead', 'stability', 'hillStart', 'fog', 'roofRails', 'skidPlates'] },
        ],
        problems: [
          { level: 'check', title: 'Warranty and PMS records', detail: 'Many are still young enough to carry factory warranty. Ask for the PMS booklet stamped by a Mitsubishi dealer; skipped services can void it.' },
          { level: 'check', title: 'Suspension knocks', detail: 'Drive over a few humps. Knocking from the front means worn links or bushings, common on heavily loaded family MPVs.' },
          FLEET('Xpander'),
        ],
      },
      {
        id: 'xpander-2026', label: '2026 update', years: '2025–present',
        summary: 'Updated in August 2025 with a 360° camera, Active Yaw Control and a bigger screen on the GLS and Cross. The Cross gets black and burgundy synthetic leather. Used units are nearly new.',
        price: { min: 1000000, max: 1300000, note: 'Very few on the used market yet.' },
        base: {
          specs: { engine: '1.5L gas (4A91 MIVEC)', power: '104 hp · 141 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', clearance: '225 mm', wheels: '16-inch' },
          features: ['abs', 'airbags2', 'rearAC', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'xpander-2026:glx-mt', name: 'GLX MT' },
          { id: 'xpander-2026:glx-at', name: 'GLX AT', specs: { transmission: '4-speed automatic' } },
          { id: 'xpander-2026:gls-at', name: 'GLS AT', specs: { transmission: '4-speed automatic', wheels: '17-inch alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'carplay', 'camera360', 'ledHead'] },
          { id: 'xpander-2026:cross-at', name: 'Cross AT', specs: { transmission: '4-speed automatic', wheels: '17-inch two-tone alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'carplay', 'camera360', 'ledHead', 'leather', 'fog', 'roofRails', 'skidPlates'] },
        ],
        problems: [
          { level: 'high', title: 'Why is a nearly new car being sold?', detail: 'Ask why it is being sold so soon. Check it was never in a flood (see the checklist) and that the bank loan is paid off or properly transferred.' },
          { level: 'check', title: 'Transfer the warranty', detail: 'Confirm the remaining factory warranty with a Mitsubishi dealer and that it moves to you.' },
        ],
      },
    ],
  },

  /* ───────────── TOYOTA FORTUNER ───────────── */
  {
    id: 'fortuner', make: 'Toyota', name: 'Fortuner', body: '7-seat diesel SUV',
    sources: [
      { label: 'Top Gear PH: used Fortuner guide', url: 'https://www.topgear.com.ph/features/feature-articles/toyota-fortuner-used-car-2015-present-a5100-20250313-lfrm' },
      { label: 'Philkotse: 2021 Fortuner launch', url: 'https://philkotse.com/new-releases/toyota-philippines-launches-new-fortuner-9031' },
      { label: 'AutoDeal: Fortuner', url: 'https://www.autodeal.com.ph/cars/toyota/fortuner' },
      { label: 'Carmudi: used Fortuner listings', url: 'https://www.carmudi.com.ph/used-cars/toyota-fortuner/' },
    ],
    generations: [
      {
        id: 'fortuner-2012', label: '1st gen (last facelift)', years: '2012–2015',
        summary: 'The last facelift of the first-generation Fortuner (sold since 2005). Older diesel engines with a timing belt and a 4-speed automatic. Still common and cheap in Cebu.',
        price: { min: 550000, max: 850000, note: 'Older 2005–2011 units go lower.' },
        base: {
          specs: { engine: '2.5L diesel (2KD-FTV)', power: 'about 142 hp', transmission: '5-speed manual', drive: 'Rear-wheel drive (4x2)', fuel: 'Diesel', seats: '7', wheels: '16-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy'],
        },
        variants: [
          { id: 'fortuner-2012:g-mt', name: '2.5 G 4x2 MT' },
          { id: 'fortuner-2012:g-at', name: '2.5 G 4x2 AT', specs: { transmission: '4-speed automatic' } },
          { id: 'fortuner-2012:v-at', name: '2.5 V 4x2 AT', specs: { transmission: '4-speed automatic', wheels: '17-inch alloy' }, features: ['leather', 'fog', 'touchscreen'] },
          { id: 'fortuner-2012:v-4x4', name: '3.0 V 4x4 AT', specs: { engine: '3.0L diesel (1KD-FTV)', power: 'about 170 hp', transmission: '4-speed automatic', drive: '4x4 with low range', wheels: '17-inch alloy' }, features: ['leather', 'fog', 'touchscreen'] },
          { id: 'fortuner-2012:g-gas', name: '2.7 G 4x2 AT (gas)', specs: { engine: '2.7L gas (2TR-FE)', power: 'about 160 hp', transmission: '4-speed automatic', fuel: 'Gasoline' } },
        ],
        problems: [
          { level: 'high', title: 'Flood damage', detail: 'Fortuners are the SUV people drive through floods, and many were caught in Typhoon Tino (Nov 2025). A diesel that swallowed water can bend its rods. Check for silt under the seats and rust on seat rails, and look inside the air box and intercooler pipes for water marks or dried mud.' },
          { level: 'high', title: 'Injectors (2KD / 1KD)', detail: 'Worn injectors cause rough idle, knocking and black or white smoke, and a full set is expensive. Watch a cold start and ask for injector service receipts.' },
          { level: 'high', title: 'Timing belt', detail: 'These engines use a rubber timing belt. If it snaps, the engine is badly damaged. Ask for proof it was replaced (usually around 100,000 km); if there is none, budget for it.' },
          { level: 'check', title: '4-speed automatic', detail: 'Check for slipping, flare or late shifts when warm. Ask when the ATF was last changed.' },
          { level: 'check', title: 'Rust and chassis', detail: 'Look under the car at the chassis rails, rear floor and leaf-spring hangers, especially on units from coastal towns.' },
        ],
      },
      {
        id: 'fortuner-2016', label: '2nd gen', years: '2016–2020',
        summary: 'All-new in early 2016: new GD diesel engines with a timing chain, 6-speed gearboxes and a far nicer cabin. A 2.7 gas G was sold until the 2020 facelift.',
        price: { min: 850000, max: 1450000, note: '2.4 G at the low end, 2.8 V 4x4 at the top.' },
        base: {
          specs: { engine: '2.4L diesel (2GD-FTV)', power: '148 hp · 343–400 Nm', transmission: '6-speed manual', drive: 'Rear-wheel drive (4x2)', fuel: 'Diesel', seats: '7', wheels: '17-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'fortuner-2016:g-mt', name: '2.4 G 4x2 MT' },
          { id: 'fortuner-2016:g-at', name: '2.4 G 4x2 AT', specs: { transmission: '6-speed automatic' } },
          { id: 'fortuner-2016:v-at', name: '2.4 V 4x2 AT', specs: { transmission: '6-speed automatic', wheels: '18-inch alloy' }, features: ['ledHead', 'leather', 'pushStart', 'autoAC', 'touchscreen', 'reverseCam'] },
          { id: 'fortuner-2016:v-4x4', name: '2.8 V 4x4 AT', specs: { engine: '2.8L diesel (1GD-FTV)', power: '174 hp · 450 Nm', transmission: '6-speed automatic', drive: '4x4 with low range', wheels: '18-inch alloy' }, features: ['ledHead', 'leather', 'pushStart', 'autoAC', 'touchscreen', 'reverseCam', 'powerTailgate'] },
          { id: 'fortuner-2016:g-gas', name: '2.7 G 4x2 AT (gas)', specs: { engine: '2.7L gas (2TR-FE)', power: '164 hp · 245 Nm', transmission: '6-speed automatic', fuel: 'Gasoline' } },
        ],
        problems: [
          { level: 'high', title: 'Flood damage', detail: 'The most-flooded SUV type in Cebu because owners trust it in deep water. Check carpets and seat rails, the fuse box and ECU plugs for corrosion, fogged lamps with a water line, and milky engine oil or ATF. Walk away from any hint of it.' },
          { level: 'check', title: 'Carbon build-up and smoke', detail: 'High-mileage GD diesels used in city traffic can clog the intake and EGR. Watch for black smoke under hard acceleration and a lumpy idle. Philippine units did not get the DPF problems seen in Australia.' },
          { level: 'check', title: 'Water in the fuel', detail: 'If the water-in-fuel light has come on, the fuel filter needs draining or replacing. Ask when it was last changed.' },
          { level: 'check', title: 'Automatic shudder', detail: 'Feel for a shudder or bump on light throttle between 40 and 70 km/h; it can point to old ATF or torque converter wear.' },
          { level: 'check', title: '4x4 system (V 4x4)', detail: 'Shift into 4H and 4L on a loose surface to prove they engage and disengage cleanly.' },
        ],
      },
      {
        id: 'fortuner-2021', label: '2nd gen facelift', years: '2021–present',
        summary: 'Facelifted October 2020. The 2.8 diesel was upgraded to 201 hp and 500 Nm, the 2.7 gas was dropped, and the Q, LTD and later GR Sport top variants were added.',
        price: { min: 1250000, max: 2100000, note: '2.4 G at the low end, LTD and GR Sport at the top.' },
        base: {
          specs: { engine: '2.4L diesel (2GD-FTV)', power: '148 hp · 343–400 Nm', transmission: '6-speed manual', drive: 'Rear-wheel drive (4x2)', fuel: 'Diesel', seats: '7', wheels: '17-inch alloy' },
          features: ['abs', 'airbags2', 'sideAirbags', 'rearAC', 'alloy', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'fortuner-2021:g-mt', name: '2.4 G 4x2 MT' },
          { id: 'fortuner-2021:g-at', name: '2.4 G 4x2 AT', specs: { transmission: '6-speed automatic' } },
          { id: 'fortuner-2021:v-at', name: '2.4 V 4x2 AT', specs: { transmission: '6-speed automatic', wheels: '18-inch alloy' }, features: ['ledHead', 'leather', 'pushStart', 'autoAC', 'touchscreen', 'carplay', 'reverseCam'] },
          { id: 'fortuner-2021:q-at', name: '2.8 Q 4x2 AT', specs: { engine: '2.8L diesel (1GD-FTV)', power: '201 hp · 500 Nm', transmission: '6-speed automatic', wheels: '18-inch alloy' }, features: ['ledHead', 'leather', 'pushStart', 'autoAC', 'touchscreen', 'carplay', 'reverseCam', 'powerTailgate'] },
          { id: 'fortuner-2021:ltd-4x4', name: '2.8 LTD 4x4 AT', specs: { engine: '2.8L diesel (1GD-FTV)', power: '201 hp · 500 Nm', transmission: '6-speed automatic', drive: '4x4 with low range', wheels: '18-inch alloy' }, features: ['ledHead', 'leather', 'pushStart', 'autoAC', 'touchscreen', 'carplay', 'camera360', 'powerTailgate'] },
          { id: 'fortuner-2021:grs-4x4', name: '2.8 GR Sport 4x4 AT', years: '2022–present', specs: { engine: '2.8L diesel (1GD-FTV)', power: '201 hp · 500 Nm', transmission: '6-speed automatic', drive: '4x4 with low range', wheels: '18-inch alloy' }, features: ['ledHead', 'leather', 'pushStart', 'autoAC', 'touchscreen', 'carplay', 'camera360', 'powerTailgate', 'bodyKit', 'sportTuned'] },
        ],
        problems: [
          { level: 'high', title: 'Flood damage', detail: 'Young, expensive Fortuners flooded in Typhoon Tino can be cleaned up and resold at a "too good" price. Do every flood check in the checklist and ask the seller\'s insurer whether a flood claim was ever filed.' },
          { level: 'high', title: 'Pasalo (assume balance) deals', detail: 'Many are still under a bank loan. A pasalo without the bank\'s written approval leaves the car in the original owner\'s name and you can lose both car and money.' },
          { level: 'check', title: 'Warranty and PMS records', detail: 'Confirm dealer-stamped PMS and remaining warranty with Toyota using the VIN.' },
        ],
      },
    ],
  },

  /* ───────────── MITSUBISHI MONTERO SPORT ───────────── */
  {
    id: 'montero', make: 'Mitsubishi', name: 'Montero Sport', body: '7-seat diesel SUV',
    sources: [
      { label: 'Autoindustriya: 2016 Montero Sport full specs', url: 'https://autoindustriya.com/auto-industry-news/full-specs-for-ph-2016-mitsubishi-montero-sport-revealed.html' },
      { label: 'AutoDeal: 2020 Montero Sport launch', url: 'https://autodeal.com.ph/articles/car-news-philippines/2020-mitsubishi-montero-sport-launched-specs-pricing-25-images' },
      { label: 'Top Gear PH: 2025 Montero Sport', url: 'https://www.topgear.com.ph/news/car-news/2025-mitsubishi-montero-sport-ph-specs-prices-features-a5100-20240625' },
      { label: 'Philkotse: Montero Sport common problems', url: 'https://philkotse.com/car-maintenance/mitsubishi-montero-sport-common-problems-10853' },
    ],
    generations: [
      {
        id: 'montero-2008', label: '2nd gen (old shape)', years: '2008–2015',
        summary: 'The older body-on-frame Montero Sport with the 2.5 4D56 diesel on 2WD variants and the 3.2 4M41 on the 4x4 GTV. Facelifted in 2013.',
        price: { min: 380000, max: 720000, note: 'Late 2013–2015 GTV at the top.' },
        base: {
          specs: { engine: '2.5L diesel (4D56)', power: 'about 136 hp', transmission: '5-speed manual', drive: 'Rear-wheel drive (2WD)', fuel: 'Diesel', seats: '7', wheels: '16-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy'],
        },
        variants: [
          { id: 'montero-2008:glx-mt', name: 'GLX 2WD MT' },
          { id: 'montero-2008:gls-at', name: 'GLS-V 2WD AT', specs: { transmission: 'Automatic' }, features: ['leather', 'touchscreen'] },
          { id: 'montero-2008:gtv-4x4', name: 'GTV 4WD AT', specs: { engine: '3.2L diesel (4M41)', power: 'about 163 hp', transmission: 'Automatic', drive: '4x4 with low range', wheels: '17-inch alloy' }, features: ['leather', 'touchscreen', 'fog'] },
        ],
        problems: [
          { level: 'high', title: 'Flood damage', detail: 'Like the Fortuner, it is a go-to car for flooded roads. Check for silt and rust under the seats, the air box for water marks, and the electrics (windows, lights, gauges) for glitches.' },
          { level: 'high', title: 'Timing belt (4D56)', detail: 'The 2.5 uses a timing belt. Ask for proof of replacement; if missing, budget for it right away.' },
          { level: 'check', title: 'Unintended acceleration complaints', detail: 'Units from this era were the subject of 2015–2016 sudden-acceleration complaints. Investigations found no vehicle defect, but test the brake-shift interlock and idle anyway.' },
          { level: 'check', title: 'Injectors and smoke (4M41)', detail: 'Watch a cold start for heavy smoke and listen for knocking; injector work on the 3.2 is costly.' },
          { level: 'check', title: 'Rust', detail: 'Check the chassis, the rear floor and around the tailgate.' },
        ],
      },
      {
        id: 'montero-2016', label: '3rd gen', years: '2016–2019',
        summary: 'All-new in early 2016 with the 2.4 4N15 MIVEC diesel (181 hp, 430 Nm) and an 8-speed automatic. The GT added driver-assist safety features rare for its time.',
        price: { min: 750000, max: 1200000, note: 'GLX at the low end, GT 4x4 at the top.' },
        base: {
          specs: { engine: '2.4L diesel (4N15 MIVEC)', power: '181 hp · 430 Nm', transmission: '6-speed manual', drive: 'Rear-wheel drive (2WD)', fuel: 'Diesel', seats: '7', wheels: '18-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'montero-2016:glx-mt', name: 'GLX 2WD MT', years: '2016–2019', specs: { wheels: '16-inch alloy' } },
          { id: 'montero-2016:gls-at', name: 'GLS 2WD AT', specs: { transmission: '8-speed automatic' }, features: ['touchscreen', 'pushStart'] },
          { id: 'montero-2016:gls-prem-at', name: 'GLS Premium 2WD AT', specs: { transmission: '8-speed automatic' }, features: ['touchscreen', 'pushStart', 'reverseCam', 'leather', 'powerSeat', 'autoAC', 'paddles'] },
          { id: 'montero-2016:gt-4x4', name: 'GT 4WD AT', specs: { transmission: '8-speed automatic', drive: '4x4 with low range' }, features: ['touchscreen', 'pushStart', 'reverseCam', 'leather', 'powerSeat', 'autoAC', 'paddles', 'ledHead', 'adas', 'bsm', 'powerTailgate', 'diffLock'] },
        ],
        problems: [
          { level: 'high', title: 'Flood damage', detail: 'Same as any big diesel SUV in Cebu: do every flood check. Water in the 8-speed automatic shows as milky or burnt-smelling fluid.' },
          { level: 'check', title: '8-speed automatic', detail: 'Shifts should be smooth and quick. Harsh or delayed shifts, or a gear warning, need a scan before you pay.' },
          { level: 'check', title: 'Valve clearance service', detail: 'The 4N15 needs its valve clearances checked at the scheduled interval. Ask for proof, or use a mechanic who knows this engine.' },
          { level: 'check', title: 'Alternator and charging', detail: 'Ageing units can develop alternator problems. With the engine running, battery voltage should read about 13.8–14.5 V.' },
          { level: 'check', title: 'Rust underneath', detail: 'Inspect the undercarriage and chassis for heavy corrosion.' },
        ],
      },
      {
        id: 'montero-2020', label: '3rd gen facelift', years: '2020–2023',
        summary: 'Facelifted in October 2019 with a new face and tail lights, a bigger screen and a digital gauge cluster on top variants. Same 2.4 diesel and 8-speed automatic.',
        price: { min: 1000000, max: 1550000, note: 'GT 4WD at the top.' },
        base: {
          specs: { engine: '2.4L diesel (4N15 MIVEC)', power: '181 hp · 430 Nm', transmission: '6-speed manual', drive: 'Rear-wheel drive (2WD)', fuel: 'Diesel', seats: '7', wheels: '18-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'montero-2020:glx-mt', name: 'GLX 2WD MT', specs: { wheels: '16-inch alloy' } },
          { id: 'montero-2020:gls-at', name: 'GLS 2WD AT', specs: { transmission: '8-speed automatic' }, features: ['touchscreen', 'carplay', 'pushStart', 'reverseCam'] },
          { id: 'montero-2020:gt-2wd', name: 'GT 2WD AT', specs: { transmission: '8-speed automatic' }, features: ['touchscreen', 'carplay', 'pushStart', 'leather', 'powerSeat', 'autoAC', 'paddles', 'ledHead', 'adas', 'bsm', 'powerTailgate', 'camera360'] },
          { id: 'montero-2020:gt-4x4', name: 'GT 4WD AT', specs: { transmission: '8-speed automatic', drive: '4x4 with low range' }, features: ['touchscreen', 'carplay', 'pushStart', 'leather', 'powerSeat', 'autoAC', 'paddles', 'ledHead', 'adas', 'bsm', 'powerTailgate', 'camera360', 'diffLock'] },
        ],
        problems: [
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check. On GT variants, also make sure every camera, sensor and driver-assist warning works; flood water kills these first.' },
          { level: 'check', title: '8-speed automatic', detail: 'Feel for harsh or delayed shifts and scan for stored transmission codes.' },
          FLEET('Montero Sport'),
        ],
      },
      {
        id: 'montero-2024', label: '3rd gen (2024 update)', years: '2024–present',
        summary: 'Updated mid-2024: new grille and bumpers, side and curtain airbags on the GLS, and Black Series variants replacing the GT, with auto emergency braking and adaptive cruise.',
        price: { min: 1350000, max: 2100000, note: 'Black Series 4WD at the top.' },
        base: {
          specs: { engine: '2.4L diesel (4N15 MIVEC)', power: '179 hp · 430 Nm', transmission: '6-speed manual', drive: 'Rear-wheel drive (2WD)', fuel: 'Diesel', seats: '7', wheels: '18-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'montero-2024:glx-mt', name: 'GLX 2WD MT', specs: { wheels: '16-inch alloy' } },
          { id: 'montero-2024:gls-at', name: 'GLS 2WD AT', specs: { transmission: '8-speed automatic' }, features: ['sideAirbags', 'touchscreen', 'carplay', 'pushStart', 'reverseCam'] },
          { id: 'montero-2024:black-2wd', name: 'Black Series 2WD AT', specs: { transmission: '8-speed automatic' }, features: ['sideAirbags', 'touchscreen', 'carplay', 'pushStart', 'leather', 'powerSeat', 'autoAC', 'ledHead', 'adas', 'bsm', 'powerTailgate', 'camera360'] },
          { id: 'montero-2024:black-4x4', name: 'Black Series 4WD AT', specs: { transmission: '8-speed automatic', drive: '4x4 with low range' }, features: ['sideAirbags', 'touchscreen', 'carplay', 'pushStart', 'leather', 'powerSeat', 'autoAC', 'ledHead', 'adas', 'bsm', 'powerTailgate', 'camera360', 'diffLock'] },
        ],
        problems: [
          { level: 'high', title: 'Pasalo and bank loans', detail: 'Most are still financed. Get the bank\'s written consent or a release of chattel mortgage before paying.' },
          { level: 'check', title: 'Warranty and PMS records', detail: 'Confirm the remaining warranty and dealer PMS with Mitsubishi using the VIN.' },
        ],
      },
    ],
  },

  /* ───────────── TOYOTA VIOS ───────────── */
  {
    id: 'vios', make: 'Toyota', name: 'Vios', body: '5-seat sedan',
    sources: [
      { label: 'Carmudi: Vios generations', url: 'https://www.carmudi.com.ph/journal/infographic-toyota-vios/' },
      { label: 'Autoindustriya: 2026 Vios Ativ variants', url: 'https://www.autoindustriya.com/auto-industry-news/2026-toyota-vios-ativ-all-the-new-variants-prices-plus-retained-vios-variants.html' },
      { label: 'Philkotse: Vios common issues', url: 'https://philkotse.com/car-maintenance/toyota-vios-common-problems-solutions-1333' },
      { label: 'Automart: buying a second-hand Vios', url: 'https://automart.ph/blog/buying-a-second-hand-toyota-vios-read-this-first' },
    ],
    generations: [
      {
        id: 'vios-2013', label: '3rd gen', years: '2013–2017',
        summary: 'Third generation, built in Santa Rosa, Laguna, from 2013. From 2016 it got the Dual VVT-i 1.3 and 1.5 engines and a CVT on automatic variants (earlier ones used a 4-speed automatic).',
        price: { min: 280000, max: 470000, note: '2016–2017 Dual VVT-i units sit at the top.' },
        base: {
          specs: { engine: '1.3L gas', power: 'about 86–98 hp', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '14–15-inch' },
          features: ['abs', 'airbags2'],
        },
        variants: [
          { id: 'vios-2013:j-mt', name: '1.3 J MT', specs: { wheels: '14-inch steel' } },
          { id: 'vios-2013:e-at', name: '1.3 E AT/CVT', specs: { transmission: '4-speed automatic (CVT from 2016)', wheels: '15-inch alloy' }, features: ['alloy'] },
          { id: 'vios-2013:g-at', name: '1.5 G AT/CVT', specs: { engine: '1.5L gas', power: 'about 105–107 hp', transmission: '4-speed automatic (CVT from 2016)', wheels: '15-inch alloy' }, features: ['alloy', 'fog', 'touchscreen'] },
        ],
        problems: [
          { level: 'high', title: 'Ex-taxi units', detail: 'White Vios of this era were common taxis. Look for patched holes in the roof (taxi sign), meter wiring under the dash and "for hire" in the CR history.' },
          FLEET('Vios'),
          { level: 'high', title: 'Flood damage', detail: 'A low sedan floods faster than an SUV. Water above the floor reaches the seats, wiring and ECU. Do every flood check.' },
          CVT,
        ],
      },
      {
        id: 'vios-2018', label: '3rd gen facelift', years: '2018–2020',
        summary: 'Big 2018 facelift with a new face and, importantly, 7 airbags and stability control across the range. Dual VVT-i 1.3 and 1.5 engines with a 5-speed manual or CVT.',
        price: { min: 430000, max: 600000 },
        base: {
          specs: { engine: '1.3L gas (1NR-FE Dual VVT-i)', power: '98 hp · 123 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '15-inch' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'vios-2018:j-mt', name: '1.3 J MT', specs: { wheels: '14-inch steel' } },
          { id: 'vios-2018:e-mt', name: '1.3 E MT', specs: { wheels: '15-inch alloy' }, features: ['alloy', 'touchscreen'] },
          { id: 'vios-2018:e-cvt', name: '1.3 E CVT', specs: { transmission: 'CVT', wheels: '15-inch alloy' }, features: ['alloy', 'touchscreen'] },
          { id: 'vios-2018:g-cvt', name: '1.5 G CVT', specs: { engine: '1.5L gas (2NR-FE Dual VVT-i)', power: '105 hp · 140 Nm', transmission: 'CVT', wheels: '15-inch alloy' }, features: ['alloy', 'touchscreen', 'pushStart', 'autoAC', 'fog', 'cruise'] },
        ],
        problems: [
          FLEET('Vios'),
          CVT,
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check; sedans are the first cars to take water inside.' },
          { level: 'check', title: 'Odometer tampering', detail: 'A ride-hailing Vios can do 60,000 km a year. A 2018 unit showing 40,000 km with a shiny, worn steering wheel is a red flag.' },
        ],
      },
      {
        id: 'vios-2020', label: '3rd gen 2nd facelift', years: '2020–2025',
        summary: 'Facelifted August 2020 with a new face and new variant names (XE, XLE). The sporty GR-S joined in March 2021. Some variants stay on sale for fleets alongside the all-new Vios Ativ.',
        price: { min: 520000, max: 780000, note: 'GR-S and late 1.5 G at the top.' },
        base: {
          specs: { engine: '1.3L gas (1NR-FE Dual VVT-i)', power: '98 hp · 123 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '15-inch' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'vios-2020:j-mt', name: '1.3 J MT', specs: { wheels: '14-inch steel' } },
          { id: 'vios-2020:xe-cvt', name: '1.3 XE CVT', specs: { transmission: 'CVT' }, features: ['touchscreen'] },
          { id: 'vios-2020:xle-cvt', name: '1.3 XLE CVT', specs: { transmission: 'CVT', wheels: '15-inch alloy' }, features: ['alloy', 'touchscreen', 'reverseCam'] },
          { id: 'vios-2020:g-cvt', name: '1.5 G CVT', specs: { engine: '1.5L gas (2NR-FE Dual VVT-i)', power: '105 hp · 140 Nm', transmission: 'CVT', wheels: '15-inch alloy' }, features: ['alloy', 'touchscreen', 'reverseCam', 'pushStart', 'autoAC', 'ledHead', 'cruise'] },
          { id: 'vios-2020:grs-cvt', name: 'GR-S 1.5 CVT', years: '2021–2025', specs: { engine: '1.5L gas (2NR-FE Dual VVT-i)', power: '105 hp · 140 Nm', transmission: 'CVT', wheels: '17-inch alloy' }, features: ['alloy', 'touchscreen', 'reverseCam', 'pushStart', 'autoAC', 'ledHead', 'cruise', 'bodyKit', 'sportTuned', 'paddles'] },
        ],
        problems: [
          FLEET('Vios'),
          CVT,
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check. Late models flooded in Typhoon Tino (Nov 2025) may be cleaned up and resold.' },
        ],
      },
      {
        id: 'vios-2025', label: '4th gen (Vios Ativ)', years: 'Oct 2025–present',
        summary: 'All-new Vios, sold as the Ativ, launched October 2025 with a bigger body, 1.3 and 1.5 engines and Toyota\'s first hybrid Vios.',
        price: { min: 850000, max: 1150000, note: 'Very few on the used market yet.' },
        base: {
          specs: { engine: '1.3L gas', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart', 'touchscreen'],
        },
        variants: [
          { id: 'vios-2025:e-mt', name: '1.3 E MT' },
          { id: 'vios-2025:e-cvt', name: '1.3 E CVT', specs: { transmission: 'CVT' } },
          { id: 'vios-2025:g-cvt', name: '1.5 G CVT', specs: { engine: '1.5L gas', transmission: 'CVT' }, features: ['alloy', 'pushStart', 'carplay'] },
          { id: 'vios-2025:hev', name: '1.5 HEV CVT', specs: { engine: '1.5L gas + electric motor', power: '111 PS combined', transmission: 'e-CVT', fuel: 'Hybrid (gasoline)' }, features: ['alloy', 'pushStart', 'carplay', 'evMode'] },
        ],
        problems: [
          { level: 'high', title: 'Why is a nearly new car being sold?', detail: 'Ask why, check for flood damage and confirm the loan is cleared or properly transferred through the bank.' },
          { level: 'check', title: 'Hybrid battery health (HEV)', detail: 'Ask a Toyota dealer to check the hybrid system and confirm the remaining hybrid battery warranty transfers to you.' },
        ],
      },
    ],
  },

  /* ───────────── TOYOTA WIGO ───────────── */
  {
    id: 'wigo', make: 'Toyota', name: 'Wigo', body: '5-seat hatchback',
    sources: [
      { label: 'GoFlatOut: 2020 Wigo facelift prices', url: 'https://goflatoutph.com/2020/06/15/2020-toyota-wigo-facelift-goes-on-sale-in-ph-starts-at-p568k/' },
      { label: 'Top Gear PH: all-new 2024 Wigo', url: 'https://www.topgear.com.ph/features/feature-articles/toyota-wigo-2024-specs-prices-features-a4354-20230714' },
      { label: 'Toyota PH: all-new Wigo launch', url: 'https://toyota.com.ph/news/Toyota-Motor-Philippines-launches-the-all-new-Wigo' },
    ],
    generations: [
      {
        id: 'wigo-2014', label: '1st gen', years: '2014–2023',
        summary: 'Launched 2014, facelifted in May 2017 and again in June 2020 (which added the sporty TRD S). 1.0 three-cylinder engine with a 5-speed manual or 4-speed automatic.',
        price: { min: 260000, max: 480000, note: '2014–2016 at the low end, 2020–2023 G and TRD S at the top.' },
        base: {
          specs: { engine: '1.0L 3-cylinder gas (1KR-FE)', power: 'about 66 hp · 89 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '14-inch' },
          features: ['abs', 'airbags2'],
        },
        variants: [
          { id: 'wigo-2014:e-mt', name: '1.0 E MT', specs: { wheels: '14-inch steel' } },
          { id: 'wigo-2014:g-mt', name: '1.0 G MT', specs: { wheels: '14-inch alloy' }, features: ['alloy', 'touchscreen'] },
          { id: 'wigo-2014:g-at', name: '1.0 G AT', specs: { transmission: '4-speed automatic', wheels: '14-inch alloy' }, features: ['alloy', 'touchscreen'] },
          { id: 'wigo-2014:trds-at', name: '1.0 TRD S AT', years: '2020–2023', specs: { transmission: '4-speed automatic', wheels: '14-inch alloy' }, features: ['alloy', 'touchscreen', 'bodyKit', 'reverseCam'] },
        ],
        problems: [
          { level: 'check', title: 'Engine shake', detail: 'A three-cylinder shakes a little at idle; that is normal. Heavy vibration through the cabin means worn engine mounts.' },
          { level: 'check', title: '4-speed automatic and clutch', detail: 'The AT should shift cleanly without slipping. On manuals, a clutch that bites very high is worn out.' },
          { level: 'high', title: 'Flood damage', detail: 'The Wigo sits very low, so even shallow flood water gets inside. Do every flood check.' },
          { level: 'check', title: 'Hard life in the city', detail: 'Check bumpers, corners and the underside for scrapes, and the suspension for knocks.' },
        ],
      },
      {
        id: 'wigo-2023', label: '2nd gen', years: '2023–present',
        summary: 'All-new from July 2023: bigger body, 1.0 1KR-VE engine and a CVT on automatic variants.',
        price: { min: 470000, max: 620000 },
        base: {
          specs: { engine: '1.0L 3-cylinder gas (1KR-VE)', power: 'about 66 hp', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '14-inch' },
          features: ['abs', 'airbags2', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'wigo-2023:j-mt', name: '1.0 J MT' },
          { id: 'wigo-2023:e-cvt', name: '1.0 E CVT', specs: { transmission: 'CVT' }, features: ['touchscreen'] },
          { id: 'wigo-2023:g-cvt', name: '1.0 G CVT', specs: { transmission: 'CVT', wheels: '14-inch alloy' }, features: ['touchscreen', 'carplay', 'alloy', 'reverseCam', 'pushStart'] },
        ],
        problems: [
          CVT,
          { level: 'high', title: 'Flood damage', detail: 'Sits low; do every flood check, especially on units from flood-hit barangays.' },
          { level: 'check', title: 'Warranty and PMS', detail: 'Confirm dealer PMS and remaining warranty with Toyota.' },
        ],
      },
    ],
  },

  /* ───────────── TOYOTA HIACE ───────────── */
  {
    id: 'hiace', make: 'Toyota', name: 'HiAce', body: 'Van (10–15 seats)',
    sources: [
      { label: 'AutoDeal: 2019 HiAce global launch in PH', url: 'https://www.autodeal.com.ph/articles/car-news-philippines/2019-toyota-hiace-makes-global-launch-in-philippines' },
      { label: 'Philkotse: 2020 HiAce variant guide', url: 'https://philkotse.com/car-buying-and-selling/toyota-hiace-variant-comparison-guide-7149' },
      { label: 'ZigWheels: HiAce old vs new', url: 'https://www.zigwheels.ph/car-feature-stories/toyota-hiace-the-old-vs-the-new' },
      { label: 'Carmudi: used HiAce listings', url: 'https://www.carmudi.com.ph/used-cars/toyota-hiace/' },
    ],
    generations: [
      {
        id: 'hiace-2005', label: 'H200 (old shape)', years: '2005–2019',
        summary: 'The boxy cab-over HiAce. The Commuter is the workhorse; the GL Grandia and Super Grandia are the family and VIP versions. All moved to the 3.0 1KD diesel from October 2015.',
        price: { min: 650000, max: 1350000, note: 'Commuter about ₱650k–1M; Grandias up to about ₱1.35M.' },
        base: {
          specs: { engine: '3.0L diesel (1KD-FTV)', power: 'about 136 hp', transmission: '5-speed manual', drive: 'Rear-wheel drive', fuel: 'Diesel', seats: '15', wheels: '15-inch steel' },
          features: ['airbags2', 'rearAC'],
        },
        variants: [
          { id: 'hiace-2005:commuter-25', name: 'Commuter 2.5 MT', years: '2005–2015', specs: { engine: '2.5L diesel (2KD-FTV)', power: 'about 100 hp' } },
          { id: 'hiace-2005:commuter-30', name: 'Commuter 3.0 MT' },
          { id: 'hiace-2005:gl-grandia', name: 'GL Grandia 3.0 MT/AT', specs: { transmission: '5-speed manual or 4-speed automatic', seats: '12' }, features: ['abs'] },
          { id: 'hiace-2005:super-grandia', name: 'Super Grandia 3.0 AT', years: '2005–2019', specs: { transmission: '4-speed automatic', seats: '10–11' }, features: ['abs', 'captainSeats', 'leather', 'alloy', 'touchscreen'] },
        ],
        problems: [
          { level: 'high', title: 'UV Express and for-hire history', detail: 'Many Commuters were franchised vans that ran all day. Check the CR for "for hire", look for a franchise or yellow-plate history, and be very sceptical of low mileage.' },
          { level: 'high', title: 'Injector leaks (1KD)', detail: 'Injectors on the 3.0 can leak or wear after about 100,000 km, causing rough running and smoke. A set is very expensive; ask for an injector test before buying.' },
          { level: 'high', title: 'Timing belt', detail: 'KD engines use a timing belt. Ask for proof of replacement; a snapped belt wrecks the engine.' },
          { level: 'high', title: 'Flood damage', detail: 'Vans parked on the street were caught in the Typhoon Tino floods. The engine sits under the front seats, so look for silt and rust there and around the battery and fuse box.' },
          { level: 'check', title: 'Clutch, overheating and rust', detail: 'Check clutch bite on the manual, watch the temperature gauge on a long idle, and inspect the floor, sills and sliding-door rails for rust.' },
        ],
      },
      {
        id: 'hiace-2019', label: 'H300 (new shape)', years: '2019–present',
        summary: 'All-new semi-bonnet HiAce, which made its global debut in the Philippines in 2019, with the 2.8 1GD diesel and a 6-speed manual or automatic. The old H200 Commuter stayed on sale alongside it.',
        price: { min: 1000000, max: 2800000, note: 'Commuter Deluxe about ₱1M–1.35M; GL Grandia ₱1.35M–1.9M; Super Grandia Elite up to about ₱2.8M.' },
        base: {
          specs: { engine: '2.8L diesel (1GD-FTV)', power: 'up to 174 hp', transmission: '6-speed manual', drive: 'Rear-wheel drive', fuel: 'Diesel', seats: '15', wheels: '16-inch steel' },
          features: ['abs', 'airbags2', 'rearAC', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'hiace-2019:commuter-deluxe', name: 'Commuter Deluxe MT' },
          { id: 'hiace-2019:gl-grandia', name: 'GL Grandia MT/AT', specs: { transmission: '6-speed manual or automatic', seats: '12' }, features: ['touchscreen'] },
          { id: 'hiace-2019:gl-tourer', name: 'GL Grandia Tourer MT/AT', specs: { transmission: '6-speed manual or automatic', seats: '12', wheels: '16-inch alloy' }, features: ['touchscreen', 'alloy', 'leather'] },
          { id: 'hiace-2019:super-elite', name: 'Super Grandia Elite AT', specs: { transmission: '6-speed automatic', seats: '10', wheels: '17-inch alloy' }, features: ['touchscreen', 'alloy', 'leather', 'captainSeats', 'ledHead', 'autoAC'] },
        ],
        problems: [
          { level: 'high', title: 'Company and shuttle use', detail: 'Many H300s are company shuttles or tour vans with very high mileage. Ask for the fleet service record and compare the seats and steering wheel wear with the odometer.' },
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check. Captain seats on Grandias hide wiring and motors that flood water ruins.' },
          { level: 'check', title: 'Automatic and sliding doors', detail: 'Check smooth 6-speed shifts, and open and close the sliding door many times; check power doors on the Elite.' },
        ],
      },
    ],
  },

  /* ───────────── TOYOTA AVANZA ───────────── */
  {
    id: 'avanza', make: 'Toyota', name: 'Avanza', body: '7-seat MPV',
    sources: [
      { label: 'CarGuide PH: 2022 Avanza variants and prices', url: 'https://www.carguide.ph/2022/02/here-are-variants-prices-of-2022-toyota.html' },
      { label: 'Philkotse: 2022 Avanza vs Veloz', url: 'https://philkotse.com/market-news/toyota-avanza-vs-veloz-12597' },
      { label: 'Automart: used Avanza listings', url: 'https://automart.ph/used-cars/toyota-avanza' },
    ],
    generations: [
      {
        id: 'avanza-2012', label: '2nd gen', years: '2012–2021',
        summary: 'Rear-wheel-drive Avanza, facelifted in 2015 (with Dual VVT-i engines from 2016) and again in 2019. The Avanza Veloz was the sporty top variant.',
        price: { min: 330000, max: 620000, note: '2019–2021 Veloz at the top.' },
        base: {
          specs: { engine: '1.3L gas', power: 'about 92–95 hp', transmission: '5-speed manual', drive: 'Rear-wheel drive', fuel: 'Gasoline', seats: '7', wheels: '14–15-inch' },
          features: ['abs', 'airbags2', 'rearAC'],
        },
        variants: [
          { id: 'avanza-2012:j-mt', name: '1.3 J MT' },
          { id: 'avanza-2012:e-mt', name: '1.3 E MT', specs: { wheels: '15-inch alloy' }, features: ['alloy'] },
          { id: 'avanza-2012:e-at', name: '1.3 E AT', specs: { transmission: '4-speed automatic', wheels: '15-inch alloy' }, features: ['alloy'] },
          { id: 'avanza-2012:g-at', name: '1.5 G AT', specs: { engine: '1.5L gas', power: 'about 103 hp', transmission: '4-speed automatic', wheels: '15-inch alloy' }, features: ['alloy', 'touchscreen', 'fog'] },
          { id: 'avanza-2012:veloz-at', name: '1.5 Veloz AT', specs: { engine: '1.5L gas', power: 'about 103 hp', transmission: '4-speed automatic', wheels: '16-inch alloy' }, features: ['alloy', 'touchscreen', 'fog', 'bodyKit'] },
        ],
        problems: [
          FLEET('Avanza'),
          { level: 'check', title: 'Rear axle and suspension', detail: 'Listen for a whine or clunk from the rear axle and knocks over bumps, common on overloaded family and fleet units.' },
          { level: 'check', title: '4-speed automatic', detail: 'Should shift without slipping or flaring when warm. Ask when the ATF was last changed.' },
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check.' },
        ],
      },
      {
        id: 'avanza-2022', label: '3rd gen', years: '2022–present',
        summary: 'All-new in February 2022 and now front-wheel drive, with 1.3 and 1.5 Dual VVT-i engines and a CVT on automatic variants.',
        price: { min: 620000, max: 900000 },
        base: {
          specs: { engine: '1.3L gas (1NR-VE)', power: '97 hp · 122 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', wheels: '15-inch' },
          features: ['abs', 'airbags2', 'rearAC', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'avanza-2022:j-mt', name: '1.3 J MT' },
          { id: 'avanza-2022:e-mt', name: '1.3 E MT', features: ['touchscreen'] },
          { id: 'avanza-2022:e-cvt', name: '1.3 E CVT', specs: { transmission: 'CVT' }, features: ['touchscreen'] },
          { id: 'avanza-2022:g-cvt', name: '1.5 G CVT', specs: { engine: '1.5L gas (2NR-VE)', power: '105 hp · 138 Nm', transmission: 'CVT', wheels: '16-inch alloy' }, features: ['touchscreen', 'alloy', 'pushStart', 'reverseCam'] },
        ],
        problems: [FLEET('Avanza'), CVT, { level: 'high', title: 'Flood damage', detail: 'Do every flood check.' }],
      },
    ],
  },

  /* ───────────── TOYOTA VELOZ ───────────── */
  {
    id: 'veloz', make: 'Toyota', name: 'Veloz', body: '7-seat MPV',
    sources: [
      { label: 'Top Gear PH: 2022 Veloz prices and specs', url: 'https://www.topgear.com.ph/news/car-news/2022-toyota-veloz-ph-prices-specs-a4354-20220420' },
      { label: 'Carmudi: Veloz vs Avanza', url: 'https://www.carmudi.com.ph/journal/spotting-the-differences-between-the-toyota-veloz-and-toyota-avanza/' },
      { label: 'Toyota PH price list', url: 'https://toyota.com.ph/price-list' },
    ],
    generations: [
      {
        id: 'veloz-2022', label: '1st gen (own model)', years: '2022–present',
        summary: 'Since April 2022 the Veloz is its own model: a better-equipped Avanza with the 1.5 engine and a CVT only. The V adds Toyota Safety Sense. An E variant came later.',
        price: { min: 850000, max: 1100000 },
        base: {
          specs: { engine: '1.5L gas (2NR-VE)', power: '105 hp · 138 Nm', transmission: 'CVT', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', wheels: '17-inch alloy' },
          features: ['abs', 'airbags2', 'sideAirbags', 'rearAC', 'stability', 'hillStart', 'alloy', 'touchscreen', 'pushStart', 'ledHead'],
        },
        variants: [
          { id: 'veloz-2022:e-cvt', name: '1.5 E CVT', years: '2023–present' },
          { id: 'veloz-2022:g-cvt', name: '1.5 G CVT', features: ['carplay', 'reverseCam'] },
          { id: 'veloz-2022:v-cvt', name: '1.5 V CVT', features: ['carplay', 'reverseCam', 'adas', 'bsm', 'camera360'] },
        ],
        problems: [
          CVT,
          FLEET('Veloz'),
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check; on the V, make sure every camera and safety warning works.' },
        ],
      },
    ],
  },

  /* ───────────── HYUNDAI STARGAZER ───────────── */
  {
    id: 'stargazer', make: 'Hyundai', name: 'Stargazer', body: '6/7-seat MPV',
    sources: [
      { label: 'Wikipedia: Hyundai Stargazer', url: 'https://en.wikipedia.org/wiki/Hyundai_Stargazer' },
      { label: 'Top Gear PH: 2026 Stargazer guide', url: 'https://www.topgear.com.ph/features/feature-articles/hyundai-stargazer-2026-buyers-guide-a5100-20251015' },
      { label: 'CarGuide PH: 2026 Stargazer and Stargazer X', url: 'https://www.carguide.ph/2025/10/hyundai-motor-ph-launches-2026.html' },
    ],
    generations: [
      {
        id: 'stargazer-2022', label: '1st gen', years: '2022–2025',
        summary: 'Launched in the Philippines in November 2022 in GL, GLS and GLS Premium. The rugged-looking Stargazer X followed in October 2023.',
        price: { min: 680000, max: 1050000, note: 'Stargazer X at the top.' },
        base: {
          specs: { engine: '1.5L gas (Smartstream)', power: 'about 113 hp · 144 Nm', transmission: '6-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', wheels: '16-inch' },
          features: ['abs', 'airbags2', 'rearAC'],
        },
        variants: [
          { id: 'stargazer-2022:gl-mt', name: 'GL MT' },
          { id: 'stargazer-2022:gl-ivt', name: 'GL IVT', specs: { transmission: 'IVT (CVT)' } },
          { id: 'stargazer-2022:gls-ivt', name: 'GLS IVT', specs: { transmission: 'IVT (CVT)', wheels: '16-inch alloy' }, features: ['alloy', 'touchscreen', 'carplay', 'pushStart', 'reverseCam'] },
          { id: 'stargazer-2022:premium-ivt', name: 'GLS Premium IVT', specs: { transmission: 'IVT (CVT)', seats: '6 (captain seats)', wheels: '16-inch alloy' }, features: ['alloy', 'touchscreen', 'carplay', 'pushStart', 'reverseCam', 'captainSeats', 'ledHead', 'adas', 'bsm', 'sideAirbags'] },
          { id: 'stargazer-2022:x', name: 'Stargazer X IVT', years: '2023–2025', specs: { transmission: 'IVT (CVT)', seats: '6 (captain seats)', wheels: '17-inch alloy' }, features: ['alloy', 'touchscreen', 'carplay', 'pushStart', 'reverseCam', 'captainSeats', 'ledHead', 'adas', 'bsm', 'sideAirbags', 'roofRails', 'skidPlates'] },
        ],
        problems: [
          { level: 'check', title: 'IVT (CVT) smoothness', detail: 'Pull away gently and at low speed; jerks, whining or slipping need a Hyundai check. Ask when the IVT fluid was last changed.' },
          { level: 'check', title: 'Transfer the warranty', detail: 'Hyundai sells it with a long warranty. Confirm with a Hyundai dealer that it is still valid and moves to you, and that PMS was done on time.' },
          FLEET('Stargazer'),
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check; driver-assist sensors and the electric parts on Premium variants are costly to replace.' },
        ],
      },
      {
        id: 'stargazer-2026', label: '1st gen facelift', years: 'Oct 2025–present',
        summary: 'Facelifted October 2025. The manual was dropped; the Stargazer comes in GL Plus and GLS, and the Stargazer X in GLS Plus and Premium, all with an IVT.',
        price: { min: 1000000, max: 1250000, note: 'Very few on the used market yet.' },
        base: {
          specs: { engine: '1.5L gas (Smartstream)', power: 'about 113 hp · 144 Nm', transmission: 'IVT (CVT)', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', wheels: '16-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy', 'touchscreen', 'carplay'],
        },
        variants: [
          { id: 'stargazer-2026:gl-plus', name: 'GL Plus IVT' },
          { id: 'stargazer-2026:gls', name: 'GLS IVT', features: ['pushStart', 'reverseCam', 'ledHead'] },
          { id: 'stargazer-2026:x-gls-plus', name: 'Stargazer X GLS Plus IVT', specs: { wheels: '17-inch alloy' }, features: ['pushStart', 'reverseCam', 'ledHead', 'roofRails', 'skidPlates'] },
          { id: 'stargazer-2026:x-premium', name: 'Stargazer X Premium IVT', specs: { wheels: '17-inch alloy', seats: '6 (captain seats)' }, features: ['pushStart', 'reverseCam', 'ledHead', 'roofRails', 'skidPlates', 'captainSeats', 'adas', 'bsm', 'sideAirbags'] },
        ],
        problems: [
          { level: 'high', title: 'Why is a nearly new car being sold?', detail: 'Ask why, check for flood damage and make sure the bank loan is settled or properly transferred.' },
          { level: 'check', title: 'Transfer the warranty', detail: 'Confirm the remaining warranty with a Hyundai dealer.' },
        ],
      },
    ],
  },

  /* ───────────── TOYOTA YARIS CROSS ───────────── */
  {
    id: 'yariscross', make: 'Toyota', name: 'Yaris Cross', body: '5-seat crossover',
    sources: [
      { label: 'Top Gear PH: Yaris Cross specs', url: 'https://www.topgear.com.ph/news/car-news/toyota-yaris-cross-ph-specs-a5100-20230721' },
      { label: 'Toyota PH: Yaris Cross launch', url: 'https://toyota.com.ph/index.php/news/Toyota-lets-you-electrify-your-passions-with-the-All-New-Yaris-Cross' },
      { label: 'Toyota PH: Yaris Cross SE HEV', url: 'https://toyota.com.ph/news/tmp-introduces-the-new-yaris-cross-se-hev-variant' },
    ],
    generations: [
      {
        id: 'yariscross-2023', label: '1st gen', years: '2023–present',
        summary: 'Launched August 2023 in G, V and the S HEV hybrid; the SE HEV hybrid was added later. The V and hybrids get Toyota Safety Sense.',
        price: { min: 1000000, max: 1450000, note: 'G at the low end, hybrids at the top.' },
        base: {
          specs: { engine: '1.5L gas (2NR-VE)', power: 'about 105 hp · 138 Nm', transmission: 'CVT', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '17-inch alloy' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart', 'alloy', 'touchscreen', 'carplay', 'pushStart', 'reverseCam', 'ledHead'],
        },
        variants: [
          { id: 'yariscross-2023:g', name: '1.5 G CVT' },
          { id: 'yariscross-2023:v', name: '1.5 V CVT', specs: { wheels: '18-inch alloy' }, features: ['adas', 'bsm'] },
          { id: 'yariscross-2023:s-hev', name: '1.5 S HEV', specs: { engine: '1.5L gas + electric motor (2NR-VEX)', power: '111 PS combined', transmission: 'e-CVT', fuel: 'Hybrid (gasoline)', wheels: '18-inch alloy' }, features: ['adas', 'bsm', 'evMode', 'sunroof'] },
          { id: 'yariscross-2023:se-hev', name: '1.5 SE HEV', years: '2024–present', specs: { engine: '1.5L gas + electric motor (2NR-VEX)', power: '111 PS combined', transmission: 'e-CVT', fuel: 'Hybrid (gasoline)', wheels: '18-inch alloy' }, features: ['adas', 'bsm', 'evMode', 'sunroof'] },
        ],
        problems: [
          { level: 'high', title: 'Flood damage is worse on a hybrid', detail: 'The hybrid battery and high-voltage wiring sit low in the car. A flooded hybrid can be dangerous and very costly. Do every flood check and have Toyota check the hybrid system.' },
          { level: 'check', title: 'Hybrid battery warranty', detail: 'Ask a Toyota dealer to confirm the hybrid battery health and that its warranty transfers to you.' },
          { level: 'check', title: 'Warranty and PMS', detail: 'Young car: confirm dealer PMS and remaining warranty.' },
        ],
      },
    ],
  },

  /* ───────────── HONDA CITY ───────────── */
  {
    id: 'city', make: 'Honda', name: 'City', body: '5-seat sedan',
    sources: [
      { label: 'Autoindustriya: 2018 City upgrade', url: 'https://www.autoindustriya.com/auto-industry-news/honda-upgrades-2018-city-with-no-price-increase.html' },
      { label: 'Top Gear PH: 2020 City specs', url: 'https://topgear.com.ph/features/feature-articles/2020-honda-city-specs-prices-features-a962-20201022' },
      { label: 'Top Gear PH: 2024 City prices and specs', url: 'https://www.topgear.com.ph/features/feature-articles/honda-city-2024-ph-prices-specs-a4354-20230713' },
    ],
    generations: [
      {
        id: 'city-2014', label: '6th gen', years: '2014–2020',
        summary: 'Roomy sedan with a 1.5 i-VTEC and a CVT. Refreshed in 2017 with LED headlights on the top VX+ Navi.',
        price: { min: 380000, max: 600000 },
        base: {
          specs: { engine: '1.5L gas (i-VTEC)', power: '118 hp · 145 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '15-inch' },
          features: ['abs', 'airbags2', 'rearAC'],
        },
        variants: [
          { id: 'city-2014:e-mt', name: '1.5 E MT' },
          { id: 'city-2014:e-cvt', name: '1.5 E CVT', specs: { transmission: 'CVT' } },
          { id: 'city-2014:vx-cvt', name: '1.5 VX CVT', specs: { transmission: 'CVT', wheels: '16-inch alloy' }, features: ['alloy', 'pushStart', 'autoAC', 'touchscreen', 'paddles', 'cruise', 'stability'] },
          { id: 'city-2014:vxnavi-cvt', name: '1.5 VX+ Navi CVT', years: '2017–2020', specs: { transmission: 'CVT', wheels: '16-inch alloy' }, features: ['alloy', 'pushStart', 'autoAC', 'touchscreen', 'paddles', 'cruise', 'stability', 'nav', 'ledHead', 'sideAirbags'] },
        ],
        problems: [CVT, FLEET('City'), { level: 'high', title: 'Flood damage', detail: 'Low sedan: do every flood check.' }],
      },
      {
        id: 'city-2020', label: '7th gen', years: '2020–2023',
        summary: 'All-new from October 2020 with a 1.5 i-VTEC and CVT, plus the sporty RS. A City Hatchback RS joined in 2021.',
        price: { min: 600000, max: 880000 },
        base: {
          specs: { engine: '1.5L gas (i-VTEC)', power: '119 hp · 145 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '15-inch' },
          features: ['abs', 'airbags2', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'city-2020:s-mt', name: '1.5 S MT' },
          { id: 'city-2020:s-cvt', name: '1.5 S CVT', specs: { transmission: 'CVT' } },
          { id: 'city-2020:v-cvt', name: '1.5 V CVT', specs: { transmission: 'CVT', wheels: '15-inch alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'carplay', 'reverseCam'] },
          { id: 'city-2020:rs-cvt', name: '1.5 RS CVT', specs: { transmission: 'CVT', wheels: '16-inch alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'carplay', 'reverseCam', 'ledHead', 'bodyKit', 'paddles', 'sideAirbags', 'autoAC'] },
          { id: 'city-2020:hatch-rs', name: 'Hatchback 1.5 RS CVT', years: '2021–2023', specs: { transmission: 'CVT', wheels: '16-inch alloy' }, features: ['alloy', 'pushStart', 'touchscreen', 'carplay', 'reverseCam', 'ledHead', 'bodyKit', 'paddles', 'sideAirbags', 'autoAC'] },
        ],
        problems: [CVT, FLEET('City'), { level: 'high', title: 'Flood damage', detail: 'Do every flood check.' }],
      },
      {
        id: 'city-2023', label: '7th gen facelift', years: '2023–present',
        summary: 'Facelifted July 2023 with Honda Sensing (auto emergency braking, lane keeping, adaptive cruise) standard on every variant, and a new entry E.',
        price: { min: 800000, max: 1050000 },
        base: {
          specs: { engine: '1.5L gas (i-VTEC)', power: '119 hp · 145 Nm', transmission: 'CVT', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '15-inch' },
          features: ['abs', 'airbags2', 'stability', 'hillStart', 'adas'],
        },
        variants: [
          { id: 'city-2023:e', name: '1.5 E CVT' },
          { id: 'city-2023:s', name: '1.5 S CVT', features: ['touchscreen', 'carplay'] },
          { id: 'city-2023:v', name: '1.5 V CVT', specs: { wheels: '16-inch alloy' }, features: ['touchscreen', 'carplay', 'alloy', 'pushStart', 'reverseCam'] },
          { id: 'city-2023:rs', name: '1.5 RS CVT', specs: { wheels: '16-inch alloy' }, features: ['touchscreen', 'carplay', 'alloy', 'pushStart', 'reverseCam', 'ledHead', 'bodyKit', 'paddles', 'sideAirbags', 'autoAC'] },
        ],
        problems: [CVT, { level: 'check', title: 'Warranty and PMS', detail: 'Confirm dealer PMS and remaining warranty with Honda.' }],
      },
    ],
  },

  /* ───────────── HONDA CIVIC ───────────── */
  {
    id: 'civic', make: 'Honda', name: 'Civic', body: '5-seat sedan',
    sources: [
      { label: 'AutoDeal: which Civic variant to buy', url: 'https://www.autodeal.com.ph/articles/car-features/which-honda-civic-variant-should-you-buy' },
      { label: 'CarGuide PH: all-new 2022 Civic', url: 'https://carguide.ph/2021/11/honda-cars-ph-launches-all-new-2022.html' },
      { label: 'Honest John: Honda 1.5 turbo oil dilution', url: 'https://www.honestjohn.co.uk/askhj/answer/223470/is-there-an-issue-with-honda-1-5-turbo-engines-' },
    ],
    generations: [
      {
        id: 'civic-2016', label: '10th gen (FC)', years: '2016–2021',
        summary: 'Fastback-styled Civic with a 1.8 on the E and a 1.5 turbo on the RS Turbo, both with a CVT.',
        price: { min: 650000, max: 1050000, note: 'RS Turbo at the top.' },
        base: {
          specs: { engine: '1.8L gas (i-VTEC)', power: '139 hp · 174 Nm', transmission: 'CVT', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '16-inch alloy' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart', 'alloy', 'pushStart', 'autoAC', 'touchscreen'],
        },
        variants: [
          { id: 'civic-2016:e', name: '1.8 E CVT' },
          { id: 'civic-2016:rs', name: '1.5 RS Turbo CVT', specs: { engine: '1.5L turbo gas', power: '170 hp · 220 Nm', wheels: '18-inch alloy' }, features: ['ledHead', 'leather', 'paddles', 'sunroof', 'bodyKit', 'powerSeat'] },
        ],
        problems: [
          { level: 'high', title: 'Modified or raced (RS Turbo)', detail: 'Many RS Turbos were tuned. Look for aftermarket intakes, exhausts, ECU remaps and lowered suspension; a tuned turbo engine and CVT wear faster.' },
          { level: 'check', title: 'Oil dilution (1.5 turbo)', detail: 'Short trips can let fuel mix into the oil. Pull the dipstick: oil above the full mark or smelling of gasoline is a warning.' },
          CVT,
          { level: 'check', title: 'Accident repairs', detail: 'Popular with young drivers. Check panel gaps, paint mismatch and overspray, and the condition of the low front lip.' },
        ],
      },
      {
        id: 'civic-2022', label: '11th gen (FE)', years: '2022–present',
        summary: 'All-new from November 2021 with a 1.5 turbo on every variant and Honda Sensing standard. The RS e:HEV hybrid and the Type R joined later; the base S was dropped.',
        price: { min: 1050000, max: 1650000, note: 'Type R is far higher.' },
        base: {
          specs: { engine: '1.5L turbo gas', power: '176 hp · 240 Nm', transmission: 'CVT', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '16-inch alloy' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart', 'adas', 'alloy', 'pushStart', 'autoAC', 'touchscreen', 'carplay'],
        },
        variants: [
          { id: 'civic-2022:s', name: 'S Turbo CVT', years: '2022–2023' },
          { id: 'civic-2022:v', name: 'V Turbo CVT', specs: { wheels: '17-inch alloy' }, features: ['ledHead', 'reverseCam'] },
          { id: 'civic-2022:rs', name: 'RS Turbo CVT', specs: { wheels: '18-inch alloy' }, features: ['ledHead', 'reverseCam', 'leather', 'paddles', 'bodyKit', 'powerSeat'] },
          { id: 'civic-2022:ehev', name: 'RS e:HEV', years: '2024–present', specs: { engine: '2.0L gas + electric motors', transmission: 'e-CVT', fuel: 'Hybrid (gasoline)', wheels: '18-inch alloy' }, features: ['ledHead', 'reverseCam', 'leather', 'bodyKit', 'powerSeat', 'evMode'] },
        ],
        problems: [
          { level: 'check', title: 'Oil dilution (1.5 turbo)', detail: 'Check the oil level and smell for fuel, and ask for on-time oil changes.' },
          { level: 'check', title: 'Modifications', detail: 'Ask about any tune or aftermarket parts; they can void the remaining warranty.' },
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check; driver-assist cameras and radar must all work.' },
        ],
      },
    ],
  },

  /* ───────────── HONDA BR-V ───────────── */
  {
    id: 'brv', make: 'Honda', name: 'BR-V', body: '7-seat crossover MPV',
    sources: [
      { label: 'Honda PH: all-new BR-V launch', url: 'https://www.hondaphil.com/news/all-new-honda-br-v-makes-official-philippine-debut-now-safer-with-honda-sensing' },
      { label: 'Autoindustriya: 2023 BR-V prices and variants', url: 'https://www.autoindustriya.com/auto-industry-news/prices-specs-variants-2023-honda-br-v-begins-at-php-1-090m.html' },
      { label: 'Philkotse: used BR-V listings', url: 'https://philkotse.com/used-honda-br-v-for-sale' },
    ],
    generations: [
      {
        id: 'brv-2017', label: '1st gen', years: '2016–2022',
        summary: 'Seven-seat crossover MPV with a 1.5 i-VTEC, a manual or CVT, and 201 mm ground clearance.',
        price: { min: 450000, max: 720000 },
        base: {
          specs: { engine: '1.5L gas (i-VTEC)', power: '118 hp · 145 Nm', transmission: '6-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', clearance: '201 mm', wheels: '16-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy'],
        },
        variants: [
          { id: 'brv-2017:s-mt', name: '1.5 S MT' },
          { id: 'brv-2017:s-cvt', name: '1.5 S CVT', specs: { transmission: 'CVT' } },
          { id: 'brv-2017:v-cvt', name: '1.5 V CVT', specs: { transmission: 'CVT' }, features: ['pushStart', 'touchscreen', 'roofRails', 'fog', 'stability'] },
        ],
        problems: [CVT, FLEET('BR-V'), { level: 'high', title: 'Flood damage', detail: 'Do every flood check.' }],
      },
      {
        id: 'brv-2022', label: '2nd gen', years: '2022–present',
        summary: 'All-new from November 2022 with a 1.5 i-VTEC. The top VX adds Honda Sensing.',
        price: { min: 780000, max: 1150000 },
        base: {
          specs: { engine: '1.5L gas (i-VTEC)', power: '119 hp · 145 Nm', transmission: '6-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '7', clearance: '220 mm', wheels: '16-inch alloy' },
          features: ['abs', 'airbags2', 'rearAC', 'alloy', 'stability', 'hillStart'],
        },
        variants: [
          { id: 'brv-2022:s-mt', name: '1.5 S MT' },
          { id: 'brv-2022:s-cvt', name: '1.5 S CVT', specs: { transmission: 'CVT' } },
          { id: 'brv-2022:v-cvt', name: '1.5 V CVT', specs: { transmission: 'CVT', wheels: '17-inch alloy' }, features: ['pushStart', 'touchscreen', 'carplay', 'reverseCam', 'ledHead'] },
          { id: 'brv-2022:vx-cvt', name: '1.5 VX CVT Honda Sensing', specs: { transmission: 'CVT', wheels: '17-inch alloy' }, features: ['pushStart', 'touchscreen', 'carplay', 'reverseCam', 'ledHead', 'adas', 'sideAirbags', 'autoAC'] },
        ],
        problems: [CVT, { level: 'check', title: 'Warranty and PMS', detail: 'Confirm dealer PMS and remaining warranty with Honda.' }, { level: 'high', title: 'Flood damage', detail: 'Do every flood check.' }],
      },
    ],
  },

  /* ───────────── HONDA CR-V ───────────── */
  {
    id: 'crv', make: 'Honda', name: 'CR-V', body: '5/7-seat SUV',
    sources: [
      { label: 'Philstar: 7-seat diesel CR-V', url: 'https://www.philstar.com/motoring/2017/08/08/1726760/honda-unveils-all-new-7-seat-diesel-cr-v' },
      { label: 'Philkotse: 2022 CR-V variant update', url: 'https://philkotse.com/market-news/honda-cr-v-variant-lineup-update-philippines-12074' },
      { label: 'Honda PH: new CR-V with e:HEV', url: 'https://www.hondaphil.com/news/honda-cars-ph-debuts-new-cr-v-lineup-accelerates-electrification-with-two-e-hev-variants' },
    ],
    generations: [
      {
        id: 'crv-2018', label: '5th gen', years: '2018–2023',
        summary: 'Mostly 7-seat diesels with a 1.6 i-DTEC and a 9-speed automatic, plus a 5-seat 2.0 gas S. Facelifted in 2020, when the top SX gained Honda Sensing.',
        price: { min: 900000, max: 1550000, note: 'SX AWD at the top.' },
        base: {
          specs: { engine: '1.6L diesel (i-DTEC)', power: '118 hp · 300 Nm', transmission: '9-speed automatic', drive: 'Front-wheel drive', fuel: 'Diesel', seats: '7', wheels: '18-inch alloy' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart', 'alloy', 'pushStart', 'autoAC', 'touchscreen', 'rearAC'],
        },
        variants: [
          { id: 'crv-2018:gas-s', name: '2.0 S CVT (gas)', specs: { engine: '2.0L gas (i-VTEC)', power: '152 hp · 189 Nm', transmission: 'CVT', fuel: 'Gasoline', seats: '5', wheels: '17-inch alloy' } },
          { id: 'crv-2018:s-diesel', name: '1.6 S Diesel 9AT' },
          { id: 'crv-2018:v-diesel', name: '1.6 V Diesel 9AT', features: ['leather', 'powerSeat', 'carplay', 'ledHead'] },
          { id: 'crv-2018:sx-awd', name: '1.6 SX Diesel 9AT AWD', specs: { drive: 'All-wheel drive' }, features: ['leather', 'powerSeat', 'carplay', 'ledHead', 'sunroof', 'powerTailgate'] },
        ],
        problems: [
          { level: 'high', title: 'Diesel DPF clogging', detail: 'The 1.6 diesel has a particulate filter that clogs on short city trips. Ask how it was driven, scan for DPF warnings, and check that the oil level is not rising.' },
          { level: 'check', title: '9-speed automatic', detail: 'Some jerkiness at low speed is a known trait; harsh clunks or a gear warning are not.' },
          { level: 'check', title: 'Parts and repair cost', detail: 'Diesel CR-V parts are pricier than Toyota diesels. Get a quote for a service before you buy.' },
          { level: 'high', title: 'Flood damage', detail: 'Do every flood check.' },
        ],
      },
      {
        id: 'crv-2024', label: '6th gen', years: '2023–present',
        summary: 'All-new from mid-2023 with a 1.5 turbo gas or 2.0 e:HEV hybrid, and Honda Sensing on every variant. The diesel was dropped.',
        price: { min: 1650000, max: 2400000 },
        base: {
          specs: { engine: '1.5L turbo gas', power: '190 hp · 243 Nm', transmission: 'CVT', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '18-inch alloy' },
          features: ['abs', 'airbags2', 'sideAirbags', 'stability', 'hillStart', 'adas', 'alloy', 'pushStart', 'autoAC', 'touchscreen', 'carplay', 'ledHead', 'leather', 'powerTailgate'],
        },
        variants: [
          { id: 'crv-2024:v', name: 'V 1.5 Turbo FWD CVT' },
          { id: 'crv-2024:vx-awd', name: 'VX 1.5 Turbo AWD CVT', specs: { drive: 'All-wheel drive' }, features: ['sunroof', 'powerSeat'] },
          { id: 'crv-2024:rs-ehev', name: 'RS e:HEV', specs: { engine: '2.0L gas + electric motors', transmission: 'e-CVT', fuel: 'Hybrid (gasoline)' }, features: ['sunroof', 'powerSeat', 'evMode', 'camera360'] },
        ],
        problems: [
          { level: 'check', title: 'Oil dilution (1.5 turbo)', detail: 'Check the oil level and smell for fuel; ask for on-time oil changes.' },
          { level: 'check', title: 'Hybrid battery (e:HEV)', detail: 'Ask Honda to check the hybrid system and confirm the hybrid warranty transfers.' },
          { level: 'high', title: 'Bank loan and flood checks', detail: 'Most are still financed: get the bank\'s consent. Do every flood check.' },
        ],
      },
    ],
  },

  /* ───────────── HONDA BRIO ───────────── */
  {
    id: 'brio', make: 'Honda', name: 'Brio', body: '5-seat hatchback',
    sources: [
      { label: 'Honda PH: new City and Brio launch', url: 'https://www.hondaphil.com/news/unparalleled-value-with-more-tech-and-style-new-honda-city-and-new-honda-brio-officially-launched' },
      { label: 'Philkotse: used Honda listings', url: 'https://philkotse.com/used-honda-for-sale' },
    ],
    generations: [
      {
        id: 'brio-2019', label: '2nd gen', years: '2019–present',
        summary: 'Small city hatchback with a 1.2 i-VTEC, a 5-speed manual or CVT, and the sporty RS. Refreshed in 2023.',
        price: { min: 380000, max: 650000, note: '2023-on refreshed units at the top.' },
        base: {
          specs: { engine: '1.2L gas (i-VTEC)', power: '89 hp · 110 Nm', transmission: '5-speed manual', drive: 'Front-wheel drive', fuel: 'Gasoline', seats: '5', wheels: '14-inch' },
          features: ['abs', 'airbags2'],
        },
        variants: [
          { id: 'brio-2019:s-mt', name: '1.2 S MT' },
          { id: 'brio-2019:v-cvt', name: '1.2 V CVT', specs: { transmission: 'CVT', wheels: '14-inch alloy' }, features: ['alloy', 'touchscreen'] },
          { id: 'brio-2019:rs-cvt', name: '1.2 RS CVT', specs: { transmission: 'CVT', wheels: '15-inch alloy' }, features: ['alloy', 'touchscreen', 'carplay', 'bodyKit', 'fog'] },
        ],
        problems: [
          CVT,
          { level: 'high', title: 'Flood damage', detail: 'Small and low: even shallow floods get inside. Do every flood check.' },
          { level: 'check', title: 'City scrapes and suspension', detail: 'Check bumpers and the underside for scrapes, and the suspension for knocks.' },
        ],
      },
    ],
  },
];
