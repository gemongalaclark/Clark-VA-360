import { Phone, Clock, MapPin } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t, timeLeft } from '../i18n.js';
import { useNav } from '../ui.jsx';
import { liveEventsWithCars, filterCars } from '../showroomRules.js';
import { telHref } from './Home.jsx';

/* The slim dark line above the header. Home runs the shop's news across it;
   the other pages show how to reach the shop (only the phone on phones). */
export default function TopStrip() {
  const { cars, events, settings } = useShowroom();
  const { loc, lang, now } = useNav();

  if (loc.view === 'home') {
    const live = liveEventsWithCars(events, cars, now);
    const forSale = filterCars(cars, {}, events, now);
    return <Ticker items={tickerItems(lang, { live, forSale, settings, now })} />;
  }

  if (!settings.phone && !settings.hours && !settings.address) return null;
  return (
    <div className={`${styles.strip} ${settings.phone ? '' : styles.stripDesk}`}>
      <div className={styles.stripInner}>
        {settings.phone && (
          <a className={styles.stripItem} href={telHref(settings.phone)}>
            <Phone size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className={styles.srOnly}>{t(lang, 'home.call')} </span>{settings.phone}
          </a>
        )}
        {settings.hours && (
          <span className={`${styles.stripItem} ${styles.stripWide}`}>
            <Clock size={14} strokeWidth={1.75} aria-hidden="true" />{settings.hours}
          </span>
        )}
        {settings.address && (
          <span className={`${styles.stripItem} ${styles.stripWide}`}>
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />{settings.address}
          </span>
        )}
      </div>
    </div>
  );
}

/* The shop's news: live sales first, then facts from its own data (never a claim
   the dealer didn't make). `live` marks a running sale, which gets a red dot. */
function tickerItems(lang, { live, forSale, settings, now }) {
  const items = live.map(ev => ({ text: t(lang, 'ticker.event', { name: ev.name, time: timeLeft(lang, ev.endsAt, now) }), live: true }));
  if (forSale.length) items.push({ text: forSale.length === 1 ? t(lang, 'ticker.stock1') : t(lang, 'ticker.stock', { n: forSale.length }) });
  if (forSale.some(c => c.financing)) items.push({ text: t(lang, 'ticker.financing') });
  if (settings.hours) items.push({ text: t(lang, 'ticker.hours', { hours: settings.hours }) });
  if (settings.address) items.push({ text: settings.address });
  return items;
}

/* A strip that runs the items across, looping. Screen readers get the items once;
   it holds still under a finger or mouse, and with reduced motion. */
function Ticker({ items }) {
  if (!items.length) return null;
  const run = Array.from({ length: Math.ceil(8 / items.length) }, () => items).flat();
  return (
    <div className={styles.strip}>
      <p className={styles.srOnly}>{items.map(i => i.text).join('. ')}</p>
      <div className={styles.tickerTrack} style={{ '--ticker-s': `${run.length * 5}s` }} aria-hidden="true">
        {[0, 1].map(copy => (
          <div key={copy} className={styles.tickerRun}>
            {run.map((item, k) => (
              <span key={k} className={`${styles.tickerItem} ${item.live ? styles.stripLive : ''}`}>{item.text}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
