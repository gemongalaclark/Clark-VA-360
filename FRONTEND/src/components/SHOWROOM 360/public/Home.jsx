import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, ExternalLink, ArrowRight } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t, timeLeft } from '../i18n.js';
import { useNav, Link, CarPhoto, PriceTag } from '../ui.jsx';
import {
  featuredCars, recentlySold, liveEventsWithCars, effectivePrice, monthlyFrom, carTitle, formatPeso, formatKm,
  TRANSMISSIONS, FUELS, BODY_TYPES, mapsOpenUrl, filterCars,
} from '../showroomRules.js';
import { CarCard } from './Inventory.jsx';

export const telHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
const mapsEmbedUrl = (s) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : s.address)}&z=15&output=embed`;

/* How long each featured car stays up. It holds still while a finger, mouse or
   keyboard is on the carousel, and never moves with reduced motion. */
const SLIDE_MS = 4000;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export default function Home() {
  const { cars, events, settings } = useShowroom();
  const { lang, now } = useNav();

  /* Arriving from another page: jump straight to the contact section before the
     first paint. 'instant' overrides the portfolio's smooth scrolling, which would
     otherwise glide down from the top while the nav still says Home. */
  useLayoutEffect(() => {
    if (window.location.hash === '#contact') document.getElementById('contact')?.scrollIntoView({ behavior: 'instant' });
  }, []);

  const sold = recentlySold(cars);
  const live = liveEventsWithCars(events, cars, now);
  const forSale = filterCars(cars, {}, events, now);

  return (
    <>
      <Ticker items={tickerItems(lang, { live, forSale, settings, now })} />
      <Featured slides={featuredCars(cars, events, now)} />

      {forSale.length > 0 && (
        <section className={styles.section} aria-labelledby="sr-latest">
          <div className={styles.ruleHeadRow}>
            <h2 id="sr-latest" className={styles.ruleHead}>{t(lang, 'cars.title')}</h2>
            <Link to="/showroom/cars" className={styles.arrowLink}>
              {t(lang, 'home.seeAll')} ({forSale.length})<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </div>
          <ul className={styles.cardGrid}>
            {forSale.slice(0, 4).map(car => (
              <CarCard key={car.id} car={car} events={events} now={now} lang={lang} fin={settings.financing} />
            ))}
          </ul>
        </section>
      )}

      <section id="contact" className={`${styles.section} ${styles.about}`} aria-labelledby="sr-about">
        <div className={styles.aboutText}>
          <h2 id="sr-about" className={styles.ruleHead}>{t(lang, 'home.about')}</h2>
          <p className={styles.statement}>{settings.tagline || settings.shopName}</p>
          {settings.about && <p className={styles.lead}>{settings.about}</p>}
          <dl className={styles.contactList}>
            {settings.phone && (
              <div><dt>{t(lang, 'home.call')}</dt><dd><a href={telHref(settings.phone)}>{settings.phone}</a></dd></div>
            )}
            {settings.hours && (
              <div><dt>{t(lang, 'home.hours')}</dt><dd>{settings.hours}</dd></div>
            )}
            {settings.address && (
              <div><dt>{t(lang, 'home.address')}</dt><dd>{settings.address}</dd></div>
            )}
          </dl>
          <div className={styles.actions}>
            {settings.phone && (
              <a className={styles.btnPrimary} href={telHref(settings.phone)}>
                <Phone size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'home.call')}
              </a>
            )}
            {(settings.address || settings.lat != null) && (
              <a className={styles.btnGhost} href={mapsOpenUrl(settings)} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'home.openMaps')}
              </a>
            )}
          </div>
        </div>
        {(settings.address || settings.lat != null) && (
          <div className={styles.mapFrame}>
            <iframe title={`${settings.shopName} map`} src={mapsEmbedUrl(settings)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        )}
      </section>

      {sold.length > 0 && (
        <section className={styles.section} aria-labelledby="sr-sold">
          <h2 id="sr-sold" className={styles.ruleHead}>{t(lang, 'home.sold')}</h2>
          <p className={`${styles.muted} ${styles.sectionHint}`}>{t(lang, 'home.soldHint')}</p>
          <ul className={styles.soldRow}>
            {sold.map(car => (
              <li key={car.id} className={styles.soldCard}>
                <div className={styles.soldMedia}>
                  <CarPhoto car={car} />
                  <span className={styles.soldStamp}>{t(lang, 'home.soldStamp')}</span>
                </div>
                <p className={styles.cardTitle}>{carTitle(car)}</p>
                <p className={styles.muted}>
                  {t(lang, 'home.soldOn', { date: new Date(car.soldAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* The shop's news for the red band: live sales first, then facts from its own
   data (never a claim the dealer didn't make). */
function tickerItems(lang, { live, forSale, settings, now }) {
  const items = live.map(ev => t(lang, 'ticker.event', { name: ev.name, time: timeLeft(lang, ev.endsAt, now) }));
  if (forSale.length) items.push(forSale.length === 1 ? t(lang, 'ticker.stock1') : t(lang, 'ticker.stock', { n: forSale.length }));
  if (forSale.some(c => c.financing)) items.push(t(lang, 'ticker.financing'));
  if (settings.hours) items.push(t(lang, 'ticker.hours', { hours: settings.hours }));
  if (settings.address) items.push(settings.address);
  return items;
}

/* A band that runs the items across, looping. Screen readers get the items once;
   it holds still under a finger or mouse, and with reduced motion. */
function Ticker({ items }) {
  if (!items.length) return null;
  const run = Array.from({ length: Math.ceil(8 / items.length) }, () => items).flat();
  return (
    <div className={styles.ticker}>
      <p className={styles.srOnly}>{items.join('. ')}</p>
      <div className={styles.tickerTrack} style={{ '--ticker-s': `${run.length * 5}s` }} aria-hidden="true">
        {[0, 1].map(copy => (
          <div key={copy} className={styles.tickerRun}>
            {run.map((text, k) => <span key={k} className={styles.tickerItem}>{text}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Featured({ slides }) {
  const { events, settings } = useShowroom();
  const { lang, now } = useNav();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);
  const touchX = useRef(null);
  const n = slides.length;
  const i = n ? index % n : 0;
  const auto = n > 1 && !reduced;

  useEffect(() => {
    if (!auto || hold) return undefined;
    const id = setTimeout(() => setIndex(v => (v + 1) % n), SLIDE_MS);
    return () => clearTimeout(id);
  }, [i, n, auto, hold]);

  const go = (d) => setIndex(v => ((v % n) + d + n) % n);

  return (
    <section
      className={styles.featured}
      aria-roledescription="carousel"
      aria-labelledby="sr-featured"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHold(false); }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setHold(true); }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
        if (n > 1 && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        setHold(false);
      }}
    >
      <div className={styles.featuredInner}>
        <div className={styles.featuredTop}>
          <h1 id="sr-featured" className={styles.featuredLabel}>{t(lang, 'home.featured')}</h1>
          {n > 1 && (
            <p className={styles.slideCount} aria-hidden="true">
              <strong>{String(i + 1).padStart(2, '0')}</strong> / {String(n).padStart(2, '0')}
            </p>
          )}
        </div>

        <div className={styles.slides}>
          {slides.map((car, k) => {
            const info = effectivePrice(car, events, now);
            const title = carTitle(car);
            return (
              <div
                key={car.id}
                className={`${styles.slide} ${k === i ? styles.slideActive : ''}`}
                role="group"
                aria-roledescription="slide"
                aria-label={t(lang, 'home.slide', { n: k + 1, total: n })}
                aria-hidden={k !== i}
              >
                <div className={styles.slideMedia}>
                  <CarPhoto car={car} label={title} mark />
                  {car.stockNo && <span className={`${styles.mediaTag} ${styles.mediaTagLeft}`} aria-hidden="true">{car.stockNo}</span>}
                  {BODY_TYPES[car.body] && <span className={`${styles.mediaTag} ${styles.mediaTagRight}`} aria-hidden="true">{BODY_TYPES[car.body]}</span>}
                </div>
                <div className={styles.slideText}>
                  <h2 className={styles.slideTitle}>{title}</h2>
                  <p className={styles.slideFacts}>
                    {[formatKm(car.odometer), TRANSMISSIONS[car.transmission], FUELS[car.fuel]].join(' · ')}
                  </p>
                  <div className={`${styles.sticker} ${info.event ? styles.stickerSale : ''}`}>
                    <span className={styles.stickerHead}>{info.event ? info.event.name : t(lang, 'sticker.price')}</span>
                    <PriceTag info={info} wasLabel={t(lang, 'car.was')} className={styles.slidePrice} />
                    <span className={styles.stickerTear}>
                      {car.financing
                        ? t(lang, 'cars.fromMo', { amount: formatPeso(monthlyFrom(info.price, settings.financing)) })
                        : t(lang, 'cars.cashOnly')}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    <Link to={`/showroom/cars/${car.id}`} className={styles.btnPrimary} tabIndex={k === i ? 0 : -1}>
                      {t(lang, 'home.viewCar')}
                    </Link>
                    <Link to="/showroom/cars" className={styles.arrowLink} tabIndex={k === i ? 0 : -1}>
                      {t(lang, 'home.seeAll')}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {n > 1 && (
          <div className={styles.carouselControls}>
            <button type="button" className={styles.roundBtn} onClick={() => go(-1)} aria-label={t(lang, 'home.prev')}>
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <div className={styles.dots} data-run={auto && !hold ? '' : undefined} style={{ '--slide-ms': `${SLIDE_MS}ms` }}>
              {slides.map((car, k) => (
                <button
                  key={car.id}
                  type="button"
                  className={styles.dot}
                  aria-current={k === i ? 'true' : undefined}
                  data-done={k < i ? '' : undefined}
                  aria-label={t(lang, 'home.slide', { n: k + 1, total: n })}
                  onClick={() => setIndex(k)}
                />
              ))}
            </div>
            <button type="button" className={styles.roundBtn} onClick={() => go(1)} aria-label={t(lang, 'home.next')}>
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
