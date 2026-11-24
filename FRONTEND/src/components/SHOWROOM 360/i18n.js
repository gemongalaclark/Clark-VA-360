/* Public-site wording in English and Cebuano (Bisaya). The admin stays English.
   Car words Cebu sellers already use in English (Flood-free, Casa maintained, OR/CR,
   Automatic…) are kept as they are. Cebuano wording: Clark to proofread. */
import { useCallback, useState } from 'react';

export const LANGS = ['en', 'ceb'];
const KEY = 'showroom360:lang';

const EN = {
  'nav.home': 'Home', 'nav.cars': 'Cars', 'nav.contact': 'Contact', 'nav.menu': 'Pages',
  'lang.switch': 'Language',
  'theme.toDark': 'Switch to dark mode', 'theme.toLight': 'Switch to light mode',
  'ticker.event': '{name} ends in {time}', 'ticker.stock': '{n} cars in stock', 'ticker.stock1': '1 car in stock',
  'ticker.financing': 'Bank financing available', 'ticker.hours': 'Open {hours}', 'sticker.price': 'Price',
  'photo.credit': 'Photo:', 'photo.credits': 'Photo credits',
  'photo.creditsHint': 'The sample cars’ photos are from Wikimedia Commons, used under each photographer’s free licence.',
  'angle.front': 'front', 'angle.back': 'back', 'angle.left': 'left side', 'angle.right': 'right side',

  'home.featured': 'Featured cars', 'home.seeAll': 'See all cars',
  'home.prev': 'Previous car', 'home.next': 'Next car',
  'home.slide': 'Car {n} of {total}', 'home.viewCar': 'View this car',
  'home.about': 'About the shop', 'home.call': 'Call', 'home.hours': 'Open', 'home.address': 'Find us',
  'home.openMaps': 'Open in Google Maps', 'home.sold': 'Recently sold', 'home.soldOn': 'Sold {date}',
  'home.soldHint': 'Units that recently went to new owners.',

  'cars.title': 'All cars', 'cars.search': 'Search make, model, year, color…', 'cars.filters': 'Filters',
  'cars.any': 'Any', 'cars.make': 'Make', 'cars.body': 'Body type', 'cars.transmission': 'Transmission', 'cars.fuel': 'Fuel',
  'cars.priceMin': 'Min price', 'cars.priceMax': 'Max price', 'cars.yearMin': 'Year from', 'cars.yearMax': 'Year to',
  'cars.onSale': 'On sale only', 'cars.sort': 'Sort',
  'sort.newest': 'Newest listed', 'sort.price-asc': 'Price: low to high', 'sort.price-desc': 'Price: high to low',
  'sort.km-asc': 'Lowest km', 'sort.year-desc': 'Newest year',
  'cars.count': '{n} cars', 'cars.count1': '1 car', 'cars.clear': 'Clear filters', 'cars.show': 'Show {n} cars',
  'cars.empty': 'No cars match.', 'cars.emptyHint': 'Try fewer filters or a shorter search.',
  'cars.fromMo': 'from {amount}/mo', 'cars.cashOnly': 'Cash only',

  'car.back': 'All cars', 'car.sold': 'This car has been sold.', 'car.soldHint': 'See similar units in our list.',
  'car.reserved': 'Reserved', 'car.specs': 'Specs', 'car.about': 'About this car', 'car.issues': 'Known issues',
  'car.condition': 'Condition & papers', 'car.notFound': 'We couldn’t find that car.',
  'car.notFoundHint': 'It may have been sold or removed.', 'car.photo': 'Photo {n} of {total}', 'car.negotiable': 'Negotiable',
  'car.was': 'was', 'car.sale': 'Sale',
  'cond.floodFree': 'Flood-free', 'cond.accidentFree': 'Accident-free', 'cond.casaMaintained': 'Casa maintained',
  'cond.owners': 'Owners', 'cond.orcr': 'OR/CR', 'cond.regUntil': 'Registered until',
  'cond.yes': 'Yes', 'cond.no': 'No', 'cond.unknown': 'Not stated',
  'owners.1': '1st owner', 'owners.2': '2nd owner', 'owners.3+': '3rd owner or more',
  'orcr.complete': 'Complete & original', 'orcr.open-deed': 'With open deed of sale', 'orcr.in-process': 'Transfer in process',

  'spec.year': 'Year', 'spec.odometer': 'Odometer', 'spec.transmission': 'Transmission', 'spec.fuel': 'Fuel',
  'spec.engine': 'Engine', 'spec.drive': 'Drive', 'spec.seats': 'Seats', 'spec.color': 'Color', 'spec.body': 'Body type',
  'spec.stock': 'Stock no.', 'spec.plate': 'Plate ends in',

  'loan.title': 'Monthly payment', 'loan.down': 'Downpayment', 'loan.term': 'Term', 'loan.months': '{n} mo',
  'loan.financed': 'Amount financed', 'loan.monthly': 'Monthly', 'loan.allIn': 'All-in downpayment ≈',
  'loan.allInHint': 'Downpayment plus insurance, transfer and bank fees.',
  'loan.note': 'Estimate only, subject to bank approval.', 'loan.perMo': '/mo',

  'inq.title': 'Ask about this car', 'inq.messenger': 'Messenger', 'inq.viber': 'Viber', 'inq.call': 'Call',
  'inq.copied': 'Message copied. Paste it in Messenger.', 'inq.notSet': 'Not set up yet. Add it in Admin → Settings.',
  'inq.number': 'Number: {n}', 'inq.copy': 'Copy', 'inq.copiedNumber': 'Number copied.',

  'lead.testDrive': 'Book a test drive', 'lead.reserve': 'Reserve this car',
  'lead.testDriveHint': 'Pick a day and we’ll have the car ready.',
  'lead.reserveHint': 'We’ll call or text you to confirm the reservation.',
  'lead.name': 'Your name', 'lead.mobile': 'Mobile number', 'lead.date': 'Preferred date', 'lead.slot': 'Time',
  'lead.morning': 'Morning', 'lead.afternoon': 'Afternoon', 'lead.note': 'Message (optional)',
  'lead.send': 'Send request', 'lead.sent': 'Request sent!', 'lead.sentHint': 'We’ll call or text you soon.', 'lead.done': 'Done',
  'err.name': 'Enter your name.', 'err.mobile': 'Enter a PH mobile number, e.g. 0917 123 4567.',
  'err.date': 'Pick today or a later date.', 'err.slot': 'Pick morning or afternoon.',

  'common.close': 'Close', 'common.dismiss': 'Dismiss',
  'car.prevPhoto': 'Previous photo', 'car.nextPhoto': 'Next photo', 'home.soldStamp': 'SOLD',
  'car.reservedStamp': 'ALREADY RESERVED', 'car.reservedHint': 'Someone has already reserved this car.',
  'car.reservedOthers': 'See other cars', 'car.reservedView': 'View details anyway',
  'car.reservedNoContact': 'This car is reserved, so messages, calls and test drives are closed.',
  'lead.failed': 'Couldn’t send. Please try again.', 'lead.full': 'This phone’s storage for the site is full, so the request couldn’t be sent. Please call or message us instead.',
  'footer.note': 'Demo website. Cars, prices and the shop are samples.',
  'footer.madeBy': 'Made by Clark VA 360',
  'storage.off': 'This browser can’t save changes, so edits reset when you leave.',
  'time.days': '{n} days', 'time.day': '1 day', 'time.hours': '{n} hrs', 'time.hour': '1 hr',
};

const CEB = {
  'nav.home': 'Home', 'nav.cars': 'Mga sakyanan', 'nav.contact': 'Kontak', 'nav.menu': 'Mga panid',
  'lang.switch': 'Pinulongan',
  'theme.toDark': 'Ilisan ngadto sa dark mode', 'theme.toLight': 'Ilisan ngadto sa light mode',
  'ticker.event': '{name} mahuman sa {time}', 'ticker.stock': '{n} ka sakyanan nga available', 'ticker.stock1': '1 ka sakyanan nga available',
  'ticker.financing': 'Pwede ma-finance sa bangko', 'ticker.hours': 'Abli {hours}', 'sticker.price': 'Presyo',
  'photo.credit': 'Hulagway:', 'photo.credits': 'Kredito sa mga hulagway',
  'photo.creditsHint': 'Ang mga hulagway sa sample nga sakyanan gikan sa Wikimedia Commons, gigamit ubos sa libre nga lisensya sa matag photographer.',
  'angle.front': 'atubangan', 'angle.back': 'likod', 'angle.left': 'wala nga kilid', 'angle.right': 'tuo nga kilid',

  'home.featured': 'Pinili nga sakyanan', 'home.seeAll': 'Tan-awa tanan',
  'home.prev': 'Miagi nga sakyanan', 'home.next': 'Sunod nga sakyanan',
  'home.slide': 'Sakyanan {n} sa {total}', 'home.viewCar': 'Tan-awa ni nga sakyanan',
  'home.about': 'Mahitungod sa among shop', 'home.call': 'Tawag', 'home.hours': 'Abli', 'home.address': 'Asa mi',
  'home.openMaps': 'Ablihi sa Google Maps', 'home.sold': 'Bag-ohay lang nabaligya', 'home.soldOn': 'Nabaligya {date}',
  'home.soldHint': 'Mga unit nga bag-ohay lang nakakita og bag-ong tag-iya.',

  'cars.title': 'Tanan nga sakyanan', 'cars.search': 'Pangitaa: brand, modelo, tuig, kolor…', 'cars.filters': 'Mga filter',
  'cars.any': 'Bisan unsa', 'cars.make': 'Brand', 'cars.body': 'Klase', 'cars.transmission': 'Transmission', 'cars.fuel': 'Fuel',
  'cars.priceMin': 'Presyo gikan', 'cars.priceMax': 'Presyo hangtod', 'cars.yearMin': 'Tuig gikan', 'cars.yearMax': 'Tuig hangtod',
  'cars.onSale': 'Naka-sale lang', 'cars.sort': 'Han-ay',
  'sort.newest': 'Pinakabag-o nga gi-post', 'sort.price-asc': 'Presyo: ubos ngadto taas', 'sort.price-desc': 'Presyo: taas ngadto ubos',
  'sort.km-asc': 'Pinakagamay nga km', 'sort.year-desc': 'Pinakabag-o nga tuig',
  'cars.count': '{n} ka sakyanan', 'cars.count1': '1 ka sakyanan', 'cars.clear': 'Kuhaa ang filter', 'cars.show': 'Ipakita ang {n}',
  'cars.empty': 'Walay mitakdo nga sakyanan.', 'cars.emptyHint': 'Kuhai og filter o mubo-a ang gipangita.',
  'cars.fromMo': 'gikan {amount}/bulan', 'cars.cashOnly': 'Cash lang',

  'car.back': 'Tanan nga sakyanan', 'car.sold': 'Nabaligya na ni nga sakyanan.', 'car.soldHint': 'Tan-awa ang susama nga unit sa among lista.',
  'car.reserved': 'Na-reserve na', 'car.specs': 'Mga detalye', 'car.about': 'Mahitungod ani nga sakyanan', 'car.issues': 'Mga nahibal-an nga problema',
  'car.condition': 'Kondisyon ug papeles', 'car.notFound': 'Wala namo makit-i ang sakyanan.',
  'car.notFoundHint': 'Basin nabaligya na o gitangtang.', 'car.photo': 'Hulagway {n} sa {total}', 'car.negotiable': 'Pwede hangyo',
  'car.was': 'dati', 'car.sale': 'Sale',
  'cond.floodFree': 'Flood-free', 'cond.accidentFree': 'Accident-free', 'cond.casaMaintained': 'Casa maintained',
  'cond.owners': 'Pila na ka tag-iya', 'cond.orcr': 'OR/CR', 'cond.regUntil': 'Rehistrado hangtod',
  'cond.yes': 'Oo', 'cond.no': 'Dili', 'cond.unknown': 'Wala gi-ingon',
  'owners.1': 'First owner', 'owners.2': 'Second owner', 'owners.3+': 'Tulo o labaw pa',
  'orcr.complete': 'Kompleto ug original', 'orcr.open-deed': 'Naay open deed of sale', 'orcr.in-process': 'Gi-process pa ang transfer',

  'spec.year': 'Tuig', 'spec.odometer': 'Odometer', 'spec.transmission': 'Transmission', 'spec.fuel': 'Fuel',
  'spec.engine': 'Makina', 'spec.drive': 'Drive', 'spec.seats': 'Lingkoranan', 'spec.color': 'Kolor', 'spec.body': 'Klase',
  'spec.stock': 'Stock no.', 'spec.plate': 'Katapusan sa plaka',

  'loan.title': 'Pila ang bulanan?', 'loan.down': 'Downpayment', 'loan.term': 'Pila ka bulan', 'loan.months': '{n} ka bulan',
  'loan.financed': 'I-finance sa bangko', 'loan.monthly': 'Bulanan', 'loan.allIn': 'All-in downpayment ≈',
  'loan.allInHint': 'Downpayment apil insurance, transfer ug bayad sa bangko.',
  'loan.note': 'Estimate lang ni. Depende pa sa pag-approve sa bangko.', 'loan.perMo': '/bulan',

  'inq.title': 'Pangutana bahin ani', 'inq.messenger': 'Messenger', 'inq.viber': 'Viber', 'inq.call': 'Tawag',
  'inq.copied': 'Na-copy ang mensahe. I-paste sa Messenger.', 'inq.notSet': 'Wala pa ni gi-set. Ibutang sa Admin → Settings.',
  'inq.number': 'Numero: {n}', 'inq.copy': 'Kopyaha', 'inq.copiedNumber': 'Na-copy ang numero.',

  'lead.testDrive': 'Pag-book og test drive', 'lead.reserve': 'I-reserve ni',
  'lead.testDriveHint': 'Pili og adlaw ug andam na ang sakyanan inig abot nimo.',
  'lead.reserveHint': 'Tawgan o i-text ka namo para ma-confirm ang reservation.',
  'lead.name': 'Imong ngalan', 'lead.mobile': 'Mobile number', 'lead.date': 'Petsa', 'lead.slot': 'Oras',
  'lead.morning': 'Buntag', 'lead.afternoon': 'Hapon', 'lead.note': 'Mensahe (optional)',
  'lead.send': 'Ipadala', 'lead.sent': 'Nadawat na namo!', 'lead.sentHint': 'Tawgan o i-text ka namo dayon.', 'lead.done': 'Okay',
  'err.name': 'Ibutang imong ngalan.', 'err.mobile': 'Ibutang ang PH mobile number, pananglitan 0917 123 4567.',
  'err.date': 'Pili og petsa karon o sunod pa.', 'err.slot': 'Pili og buntag o hapon.',

  'common.close': 'Isira', 'common.dismiss': 'Tangtanga',
  'car.prevPhoto': 'Miagi nga hulagway', 'car.nextPhoto': 'Sunod nga hulagway', 'home.soldStamp': 'NABALIGYA',
  'car.reservedStamp': 'NA-RESERVE NA', 'car.reservedHint': 'Naa nay nag-reserve ani nga sakyanan.',
  'car.reservedOthers': 'Tan-awa ang uban nga sakyanan', 'car.reservedView': 'Tan-awa gihapon ang detalye',
  'car.reservedNoContact': 'Na-reserve na ni nga sakyanan, busa sirado na ang mensahe, tawag ug test drive.',
  'lead.failed': 'Wala napadala. Palihug sulayi pag-usab.', 'lead.full': 'Puno na ang storage sa site ani nga phone, wala napadala ang request. Palihug tawag o message lang mi.',
  'footer.note': 'Demo nga website. Pananglitan lang ang mga sakyanan, presyo ug shop.',
  'footer.madeBy': 'Gihimo sa Clark VA 360',
  'storage.off': 'Dili maka-save ani nga browser, mawala ang mga kausaban inig gawas nimo.',
  'time.days': '{n} ka adlaw', 'time.day': '1 ka adlaw', 'time.hours': '{n} ka oras', 'time.hour': '1 ka oras',
};

export const DICT = { en: EN, ceb: CEB };

export function t(lang, key, vars) {
  const text = DICT[lang]?.[key] ?? EN[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text;
}

export function useLang() {
  const [lang, setLangState] = useState(() => {
    try { return LANGS.includes(localStorage.getItem(KEY)) ? localStorage.getItem(KEY) : 'en'; } catch { return 'en'; }
  });
  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* private mode: keep it for this visit only */ }
  }, []);
  return [lang, setLang];
}

/* "5 days" / "3 hrs" until a date */
export function timeLeft(lang, endsAt, now) {
  const ms = Math.max(0, Date.parse(endsAt) - now.getTime());
  const days = Math.floor(ms / 864e5);
  if (days >= 1) return days === 1 ? t(lang, 'time.day') : t(lang, 'time.days', { n: days });
  const hours = Math.max(1, Math.ceil(ms / 36e5));
  return hours === 1 ? t(lang, 'time.hour') : t(lang, 'time.hours', { n: hours });
}
