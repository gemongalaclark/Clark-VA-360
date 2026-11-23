import { useState, useRef } from 'react';
import { MapPin, Navigation, Phone, Facebook, Clock, Check } from 'lucide-react';
import styles from './CarMark360.module.css';
import { DEALERS as LISTED } from './dealerList';
import { PINS } from './dealerPins';
import { mapsOpenUrl, directionsUrl, withPins } from './carmarkRules';
import DealerMap from './DealerMap';
import { Hero, Card } from './ui';

/* Why a dealer beats a private owner */
const DEALER_PLUSES = [
  'A dealer has a shop address and a name to protect, so you know where to go back if something is wrong.',
  'Good dealers check the papers (OR/CR, encumbrance, HPG clearance) before they put a car on sale.',
  'Many give a short warranty, help with the transfer of ownership, and can arrange bank financing.',
  'You can compare several cars in one visit instead of meeting strangers one by one.',
];

/* What to ask (and check) when inquiring about a unit: [question, what a good answer looks like] */
const QUESTIONS = [
  ['How much, and is it negotiable?', 'Compare the price with the rough range on the Models page, and ask what is included (transfer fees, a fresh PMS, new tyres).'],
  ['What condition is the car in?', 'Ask if they have an OBD scanner and watch the scan. It shows stored fault codes, and on many cars the mileage saved in the engine or transmission computer, which should match the odometer.'],
  ['Why did the previous owner sell it?', 'If the car came from its first owner, ask why it was sold. Upgrading or moving abroad is normal; vague answers are a warning.'],
  ['Has it ever been in a flood?', 'Ask directly and check yourself anyway (see question 12 and the Checklist tab). Typhoon Tino flooded much of Cebu in November 2025.'],
  ['Are the papers complete?', 'Original OR and CR in the seller’s name, a release of chattel mortgage if it was financed, and an HPG clearance. Engine and chassis numbers must match the CR.'],
  ['Has it been in an accident?', 'Look for paint that doesn’t match, uneven panel gaps and overspray on rubber seals.'],
  ['Can I see the service history?', 'A service booklet or dealer records, with dates and mileage that rise steadily.'],
  ['When was the last PMS?', 'If it is overdue, ask the dealer to do it before you take the car, or take it off the price.'],
  ['What condition is the battery in?', 'Check the date on the battery and how fast the engine cranks. A weak battery is cheap to replace but a fair bargaining point.'],
  ['What condition are the tyres in?', 'Check tread depth, cracks and the 4-digit date code (week and year). Tyres older than about 5 years need replacing; uneven wear points to alignment problems.'],
  ['Is the glass the same on every window?', 'Read the brand printed in the corner of each window. If one is a different brand, that glass was replaced, often after an accident or a break-in.'],
  ['Is there rust under the seats?', 'Look under the seats and lift the carpet. Rust on the seat rails, bolts or floor of a car this age means it has been flooded.'],
  ['Does anything in the engine bay look changed?', 'Look for bolts with wrench marks or fresh paint, mismatched parts and new sealant. They mean something big was taken apart or repaired.'],
];

/* Pins come from dealerPins.js (run resolvePins.mjs after adding dealers) */
const DEALERS = withPins(LISTED, PINS);
const AREAS = [...new Set(DEALERS.map(d => d.area).filter(Boolean))].sort();
/* Each dealer keeps one number, shown on its pin and its card */
const NUMBER = new Map(DEALERS.map((d, i) => [d, i + 1]));
const hasPin = (d) => d.lat != null && d.lng != null;

export default function Dealers() {
  const [area, setArea] = useState(null);
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState(null);
  const mapRef = useRef(null);
  const cardRefs = useRef(new Map());

  const shown = area ? DEALERS.filter(d => d.area === area) : DEALERS;
  const pins = shown.filter(hasPin).map(d => ({ dealer: d, no: NUMBER.get(d) }));

  /* Card tapped: zoom the map to that dealer */
  const showOnMap = (d) => {
    setSelected(d);
    if (!hasPin(d)) return;
    setFocus({ dealer: d });
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* Pin tapped: highlight it and bring its card into view */
  const pickPin = (d) => {
    setSelected(d);
    if (d) cardRefs.current.get(d)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const pickArea = (a) => { setArea(a); setSelected(null); };

  return (
    <div className={styles.page}>
      <Hero
        lift
        eyebrow="Dealers"
        title="Trusted dealers in Cebu"
        sub="Picked by hand. Tap a pin or a dealer to find it, then get directions in Google Maps."
        stats={[['Dealers', DEALERS.length], ['Areas', AREAS.length], ['On the map', DEALERS.filter(hasPin).length]]}
      />

      <div ref={mapRef} className={`${styles.mapAnchor} ${styles.lift}`}>
        <DealerMap pins={pins} selected={selected} focus={focus} onSelect={pickPin} />
      </div>

      {DEALERS.length === 0 ? (
        <Card title="Dealer list coming soon">
          <p className={styles.lead}>
            The list of trusted Cebu dealers is being put together. Meanwhile, use the questions
            below and the Checklist whenever you look at a car.
          </p>
        </Card>
      ) : (
        <section className={styles.dealerSection}>
          {AREAS.length > 1 && (
            <div className={styles.filters} role="group" aria-label="Filter by area">
              {[null, ...AREAS].map(a => (
                <button key={a || 'all'} type="button" aria-pressed={area === a} onClick={() => pickArea(a)}>
                  {a || 'All areas'}
                  <small>{a ? DEALERS.filter(d => d.area === a).length : DEALERS.length}</small>
                </button>
              ))}
            </div>
          )}

          <ul className={styles.dealers}>
            {shown.map(d => (
              <li
                key={NUMBER.get(d)}
                ref={(el) => (el ? cardRefs.current.set(d, el) : cardRefs.current.delete(d))}
                className={styles.dealer}
                aria-current={selected === d || undefined}
              >
                <button
                  type="button"
                  className={styles.dealerInfo}
                  onClick={() => showOnMap(d)}
                  aria-label={hasPin(d) ? `Show ${d.name} on the map` : d.name}
                >
                  <span className={styles.dealerTop}>
                    <i className={hasPin(d) ? styles.dealerNo : styles.dealerNoOff}>{NUMBER.get(d)}</i>
                    <span className={styles.dealerArea}>{d.area}{!hasPin(d) && ' · no pin yet'}</span>
                  </span>
                  <strong>{d.name}</strong>
                  <span className={styles.dealerAddress}>{d.address}</span>
                  {d.hours && <span className={styles.dealerHours}><Clock size={13} aria-hidden="true" /> {d.hours}</span>}
                  {d.note && <span className={styles.dealerNote}>{d.note}</span>}
                </button>
                <div className={styles.dealerActions}>
                  <a className={styles.btn} href={mapsOpenUrl(d)} target="_blank" rel="noopener noreferrer">
                    <MapPin size={15} aria-hidden="true" /> Google Maps
                  </a>
                  <a className={styles.iconLink} href={directionsUrl(d)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${d.name}`} title="Directions">
                    <Navigation size={17} aria-hidden="true" />
                  </a>
                  {d.phone && (
                    <a className={styles.iconLink} href={`tel:${d.phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${d.name}`} title={d.phone}>
                      <Phone size={17} aria-hidden="true" />
                    </a>
                  )}
                  {d.facebook && (
                    <a className={styles.iconLink} href={d.facebook} target="_blank" rel="noopener noreferrer" aria-label={`${d.name} on Facebook`} title="Facebook">
                      <Facebook size={17} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card title="Why buy from a dealer" className={styles.whyCard}>
        <p className={styles.lead}>Buying from a trusted dealership is generally safer than buying directly from an owner you found online.</p>
        <ul className={styles.ticks}>
          {DEALER_PLUSES.map(t => <li key={t}><Check size={16} strokeWidth={2.5} aria-hidden="true" />{t}</li>)}
        </ul>
        <p className={styles.note}>Still ask the questions below and check the car yourself, whoever is selling it.</p>
      </Card>

      <Card title="Questions to ask the dealer">
        <p className={styles.lead}>When you inquire about a unit, by message or at the lot.</p>
        <ol className={styles.questions}>
          {QUESTIONS.map(([q, hint]) => (
            <li key={q}>
              <strong>{q}</strong>
              <p>{hint}</p>
            </li>
          ))}
        </ol>
      </Card>

      <p className={styles.fine}>
        Being listed here is not a guarantee. Inspect the car, check its papers and get a PNP-HPG clearance before you pay anyone.
      </p>
    </div>
  );
}
