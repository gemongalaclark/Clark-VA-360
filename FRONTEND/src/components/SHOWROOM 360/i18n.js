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
  'car.prevPhoto': 'Previous photo', 'car.nextPhoto': 'Next photo',
  'car.zoomOpen': 'Open photo {n} of {total} full screen', 'car.zoomIn': 'Zoom in', 'car.zoomOut': 'Zoom out',
  'car.zoomHint': 'Pinch or double-tap to zoom.', 'car.zoomHintMouse': 'Scroll or double-click to zoom.', 'home.soldStamp': 'SOLD',
  'car.reservedStamp': 'ALREADY RESERVED', 'car.reservedHint': 'Someone has already reserved this car.',
  'car.reservedOthers': 'See other cars', 'car.reservedView': 'View details anyway',
  'car.reservedNoContact': 'This car is reserved, so messages, calls and test drives are closed.',
  'lead.failed': 'Couldn’t send. Please try again.', 'lead.full': 'This phone’s storage for the site is full, so the request couldn’t be sent. Please call or message us instead.',
  'footer.note': 'Demo website. Cars, prices and the shop are samples.',
  'footer.madeBy': 'Made by Clark VA 360',
  'legal.privacy': 'Privacy Policy', 'legal.terms': 'Terms and Conditions', 'legal.nav': 'Legal',
  'legal.updated': 'Last updated {date}',
  'legal.sample': 'Sample for this demo website. A real shop should have its own version checked by a lawyer before going live.',
  'legal.inEnglish': 'This page is in English.',
  'storage.off': 'This browser can’t save changes, so edits reset when you leave.',
  'time.days': '{n} days', 'time.day': '1 day', 'time.hours': '{n} hrs', 'time.hour': '1 hr',
  /* waitlist: a saved search in words */
  'wish.any': 'Any car', 'wish.upTo': 'up to {amount}', 'wish.from': 'from {amount}',
  'wish.cta': 'Tell me when one arrives', 'wish.title': 'Notify me', 'wish.looking': 'You’re looking for',
  'wish.line': 'Not here yet? Leave your number and we’ll message you when a car like this arrives.',
  'wish.hint': 'We’ll text you or message you on Viber when a car that fits this search arrives.',
  'wish.sentHint': 'We’ll message you as soon as a car like this arrives.',
  'price.dropped': 'Price dropped',
  /* promo wheel */
  'promo.heading': 'Spin to win',
  'promo.fab': '{event}: spin the wheel to win a prize', 'promo.fabMine': 'See your prize voucher',
  'promo.tag.spin': 'Spin', 'promo.tag.claim': 'Claim', 'promo.tag.code': 'My code',
  'promo.lead': 'One spin, one prize. Use it when you buy a car from us.',
  'promo.odds': 'Prizes and chances', 'promo.spin': 'Spin the wheel', 'promo.noThanks': 'No thanks', 'promo.spinning': 'Spinning…',
  'promo.youWon': 'You won', 'promo.waiting': 'Your prize is waiting',
  'promo.claimHint': 'Enter your name and email to get your voucher code.',
  'promo.name': 'Your name', 'promo.email': 'Email', 'promo.claim': 'Claim my prize', 'promo.later': 'Not now',
  'promo.voucher': 'Your voucher code', 'promo.valid': 'Valid until {date}',
  'promo.used': 'Used on {date}. Thank you for buying with us!', 'promo.expired': 'This voucher expired on {date}.',
  'promo.show': 'Show this code at {shop} when you buy a car. Take a screenshot so you don’t lose it.',
  'promo.copy': 'Copy code', 'promo.copied': 'Code copied', 'promo.done': 'Done',
  'promo.permit': 'DTI Fair Trade Permit No. {permit}.', 'promo.sample': 'Sample promo for this demo website.',
  'promo.rules': 'One spin per person. Vouchers are good for {days} days, one per car bought, and have no cash value.',
  'err.email': 'Enter a valid email, e.g. ana@gmail.com.', 'err.claimed': 'This email has already claimed this promo.',
  'wish.lineAny': 'Can’t find what you want? Tell us what you’re looking for and we’ll message you when it arrives.',
  'wish.homeTitle': 'Can’t find your car?',
  'wish.homeText': 'Tell us the kind of car you want and your budget. We’ll message you as soon as one arrives.',
  'wish.similar': 'Tell me when a similar one arrives',
  'wish.keyword': 'Model or keyword (optional)', 'wish.budget': 'Max budget in pesos (optional)',
  'wish.yearFrom': '{year} or newer', 'wish.yearTo': '{year} or older', 'wish.onSale': 'On sale',
  /* autopilot messages the dealer sends (Viber / text), in the buyer's language */
  'auto.shop': 'the shop', 'auto.yourCar': 'car you asked about',
  'auto.reply.test-drive': 'Hi {name}! This is {shop}. Thanks for booking a test drive of the {car} on {when}. See you then! Just reply here if you need to change the time.',
  'auto.reply.reserve': 'Hi {name}! This is {shop}. We got your reservation request for the {car}. When can you drop by to confirm it?',
  'auto.reply.wish': 'Hi {name}! This is {shop}. Thanks for telling us what you’re looking for: {search}. We’ll message you as soon as one arrives.',
  'auto.remind': 'Hi {name}! A reminder from {shop}: your test drive of the {car} is {when}{where}. Please bring your driver’s licence. See you!',
  'auto.where': ' at {address}', 'auto.today': 'today', 'auto.tomorrow': 'tomorrow',
  'auto.morning': 'in the morning', 'auto.afternoon': 'in the afternoon',
  'auto.slot.morning': 'morning', 'auto.slot.afternoon': 'afternoon',
  'auto.wish.one': 'Hi {name}! This is {shop}. We now have a car that fits what you’re looking for: the {car}, {price}. See it here: {url}',
  'auto.wish.many': 'Hi {name}! This is {shop}. We now have cars that fit what you’re looking for:',
  'auto.wish.item': '• {car}, {price}: {url}',
  'auto.dropped': 'Hi {name}! Good news from {shop}: the {car} you asked about is now {price} (was {was}). See it here: {url}',
  'auto.follow.after': 'Hi {name}! This is {shop}. Thanks for test driving the {car}. How did it go? We’re happy to answer questions or walk you through financing.',
  'auto.follow.quiet': 'Hi {name}! Just checking in from {shop} about the {car}. Are you still interested? We’re happy to help with the papers or financing.',
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
  'car.prevPhoto': 'Miagi nga hulagway', 'car.nextPhoto': 'Sunod nga hulagway',
  'car.zoomOpen': 'Ablihi ang hulagway {n} sa {total} sa tibuok screen', 'car.zoomIn': 'Padakua', 'car.zoomOut': 'Pagamya',
  'car.zoomHint': 'I-pinch o i-double-tap aron mapadako.', 'car.zoomHintMouse': 'I-scroll o i-double-click aron mapadako.', 'home.soldStamp': 'NABALIGYA',
  'car.reservedStamp': 'NA-RESERVE NA', 'car.reservedHint': 'Naa nay nag-reserve ani nga sakyanan.',
  'car.reservedOthers': 'Tan-awa ang uban nga sakyanan', 'car.reservedView': 'Tan-awa gihapon ang detalye',
  'car.reservedNoContact': 'Na-reserve na ni nga sakyanan, busa sirado na ang mensahe, tawag ug test drive.',
  'lead.failed': 'Wala napadala. Palihug sulayi pag-usab.', 'lead.full': 'Puno na ang storage sa site ani nga phone, wala napadala ang request. Palihug tawag o message lang mi.',
  'footer.note': 'Demo nga website. Pananglitan lang ang mga sakyanan, presyo ug shop.',
  'footer.madeBy': 'Gihimo sa Clark VA 360',
  'legal.privacy': 'Privacy Policy', 'legal.terms': 'Terms and Conditions', 'legal.nav': 'Legal',
  'legal.updated': 'Katapusang gi-update {date}',
  'legal.sample': 'Sample lang ni para sa demo nga website. Ang tinuod nga shop kinahanglan adunay kaugalingon nga bersyon nga gi-check sa abogado sa dili pa i-live.',
  'legal.inEnglish': 'Ang sulod ani nga panid anaa sa English.',
  'storage.off': 'Dili maka-save ani nga browser, mawala ang mga kausaban inig gawas nimo.',
  'time.days': '{n} ka adlaw', 'time.day': '1 ka adlaw', 'time.hours': '{n} ka oras', 'time.hour': '1 ka oras',
  'wish.any': 'Bisan unsang sakyanan', 'wish.upTo': 'hangtod {amount}', 'wish.from': 'gikan {amount}',
  'wish.cta': 'Ingna ko inig abot', 'wish.title': 'Pahibaloa ko', 'wish.looking': 'Imong gipangita',
  'wish.line': 'Wala pa diri? Ibilin ang imong numero ug i-message ka namo inig abot og sakyanan nga ingon ani.',
  'wish.hint': 'I-text o i-Viber ka namo inig abot og sakyanan nga mohaum ani nga pangita.',
  'wish.sentHint': 'I-message ka namo dayon inig abot og sakyanan nga ingon ani.',
  'price.dropped': 'Niubos ang presyo',
  'promo.heading': 'I-spin ug modaog',
  'promo.fab': '{event}: i-spin ang ligid aron modaog og premyo', 'promo.fabMine': 'Tan-awa ang imong voucher',
  'promo.tag.spin': 'Spin', 'promo.tag.claim': 'I-claim', 'promo.tag.code': 'Akong code',
  'promo.lead': 'Usa ka spin, usa ka premyo. Gamita inig palit nimo og sakyanan namo.',
  'promo.odds': 'Mga premyo ug tsansa', 'promo.spin': 'I-spin ang ligid', 'promo.noThanks': 'Dili lang', 'promo.spinning': 'Nag-spin…',
  'promo.youWon': 'Nakadaog ka', 'promo.waiting': 'Naghulat ang imong premyo',
  'promo.claimHint': 'Isulat ang imong ngalan ug email aron makuha ang imong voucher code.',
  'promo.name': 'Imong ngalan', 'promo.email': 'Email', 'promo.claim': 'I-claim ang premyo', 'promo.later': 'Unya na lang',
  'promo.voucher': 'Imong voucher code', 'promo.valid': 'Magamit hangtod {date}',
  'promo.used': 'Nagamit na niadtong {date}. Salamat sa pagpalit namo!', 'promo.expired': 'Na-expire na kini nga voucher niadtong {date}.',
  'promo.show': 'Ipakita kini nga code sa {shop} inig palit nimo og sakyanan. I-screenshot aron dili mawala.',
  'promo.copy': 'Kopyaha ang code', 'promo.copied': 'Nakopya na', 'promo.done': 'Okay',
  'promo.permit': 'DTI Fair Trade Permit No. {permit}.', 'promo.sample': 'Sample nga promo para ani nga demo website.',
  'promo.rules': 'Usa ka spin matag tawo. Magamit ang voucher sulod sa {days} ka adlaw, usa matag sakyanan nga paliton, ug dili mailisan og kwarta.',
  'err.email': 'Isulat ang saktong email, pananglitan ana@gmail.com.', 'err.claimed': 'Na-claim na ani nga email kini nga promo.',
  'wish.lineAny': 'Wala nimo makita ang gusto nimo? Ingna mi kung unsa imong gipangita ug i-message ka namo inig abot.',
  'wish.homeTitle': 'Wala nimo makita ang imong sakyanan?',
  'wish.homeText': 'Ingna mi unsa nga klase sa sakyanan ang gusto nimo ug ang imong budget. I-message ka namo dayon inig abot og usa.',
  'wish.similar': 'Ingna ko inig abot og susama',
  'wish.keyword': 'Modelo o keyword (optional)', 'wish.budget': 'Pinakataas nga budget sa pesos (optional)',
  'wish.yearFrom': '{year} pataas', 'wish.yearTo': '{year} paubos', 'wish.onSale': 'Naka-sale',
  'auto.shop': 'ang shop', 'auto.yourCar': 'sakyanan nga imong gipangutana',
  'auto.reply.test-drive': 'Hi {name}! Gikan ni sa {shop}. Salamat sa pag-book og test drive sa {car} sa {when}. Magkita ta! I-reply lang diri kung gusto nimo ilisan ang oras.',
  'auto.reply.reserve': 'Hi {name}! Gikan ni sa {shop}. Nadawat namo ang imong reservation sa {car}. Kanus-a ka makaanhi aron ma-confirm?',
  'auto.reply.wish': 'Hi {name}! Gikan ni sa {shop}. Salamat sa pagsulti kung unsa imong gipangita: {search}. Mag-message mi dayon inig abot og usa.',
  'auto.remind': 'Hi {name}! Pahinumdom gikan sa {shop}: ang imong test drive sa {car} {when}{where}. Palihug dad-a ang imong driver’s license. Magkita ta!',
  'auto.where': ' sa {address}', 'auto.today': 'karong adlawa', 'auto.tomorrow': 'ugma',
  'auto.morning': 'sa buntag', 'auto.afternoon': 'sa hapon',
  'auto.slot.morning': 'buntag', 'auto.slot.afternoon': 'hapon',
  'auto.wish.one': 'Hi {name}! Gikan ni sa {shop}. Naa na mi sakyanan nga mohaum sa imong gipangita: {car}, {price}. Tan-awa diri: {url}',
  'auto.wish.many': 'Hi {name}! Gikan ni sa {shop}. Naa na mi mga sakyanan nga mohaum sa imong gipangita:',
  'auto.wish.item': '• {car}, {price}: {url}',
  'auto.dropped': 'Hi {name}! Maayong balita gikan sa {shop}: ang {car} nga imong gipangutana {price} na lang karon (dati {was}). Tan-awa diri: {url}',
  'auto.follow.after': 'Hi {name}! Gikan ni sa {shop}. Salamat sa pag-test drive sa {car}. Kumusta man? Andam mi motubag sa imong mga pangutana o mohisgot bahin sa financing.',
  'auto.follow.quiet': 'Hi {name}! Nangumusta lang ang {shop} bahin sa {car}. Interesado ka pa ba? Andam mi motabang sa papeles o financing.',
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
