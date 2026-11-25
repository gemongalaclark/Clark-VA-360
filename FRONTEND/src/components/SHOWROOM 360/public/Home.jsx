import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Phone, ExternalLink, ArrowRight, BellRing, Clock, MapPin } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t } from '../i18n.js';
import { useNav, Link, CarPhoto, PriceTag, PhotoBand, SectionHead } from '../ui.jsx';
import {
  featuredCars, recentlySold, effectivePrice, monthlyFrom, carTitle, formatPeso, formatKm,
  TRANSMISSIONS, FUELS, BODY_TYPES, mapsOpenUrl, filterCars, bandCars,
} from '../showroomRules.js';
import { CarCard } from './Inventory.jsx';
import LeadForm from './LeadForm.jsx';

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
  const forSale = filterCars(cars, {}, events, now);

  return (
    <>
      <Featured slides={featuredCars(cars, events, now)} />

      {forSale.length > 0 && (
        <section className={styles.section} aria-labelledby="sr-latest">
          <SectionHead
            id="sr-latest"
            label={forSale.length === 1 ? t(lang, 'ticker.stock1') : t(lang, 'ticker.stock', { n: forSale.length })}
            title={t(lang, 'cars.title')}
          >
            <Link to="/showroom/cars" className={styles.arrowLink}>
              {t(lang, 'home.seeAll')} ({forSale.length})<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </SectionHead>
          <ul className={styles.cardGrid}>
            {forSale.slice(0, 4).map(car => (
              <CarCard key={car.id} car={car} events={events} now={now} lang={lang} fin={settings.financing} />
            ))}
          </ul>
        </section>
      )}

      <section id="contact" className={`${styles.section} ${styles.about}`} aria-labelledby="sr-about">
        <div className={styles.aboutText}>
          <p className={styles.label}>{t(lang, 'home.about')}</p>
          <h2 id="sr-about" className={styles.statement}>{settings.tagline || settings.shopName}</h2>
          {settings.about && <p className={styles.lead}>{settings.about}</p>}
          <dl className={styles.contactList}>
            {settings.phone && (
              <div>
                <dt><Phone size={16} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'home.call')}</dt>
                <dd><a href={telHref(settings.phone)}>{settings.phone}</a></dd>
              </div>
            )}
            {settings.hours && (
              <div><dt><Clock size={16} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'home.hours')}</dt><dd>{settings.hours}</dd></div>
            )}
            {settings.address && (
              <div><dt><MapPin size={16} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'home.address')}</dt><dd>{settings.address}</dd></div>
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

      {sold.length > 0 && <RecentlySold sold={sold} lang={lang} />}

      <WishBand lang={lang} car={bandCars(cars)[1] ?? bandCars(cars)[0]} />
    </>
  );
}

/* Recently sold: a row that swipes on phones; with a mouse, arrows scroll it a card at a time */
function RecentlySold({ sold, lang }) {
  const row = useRef(null);
  const reduced = useReducedMotion();
  const scroll = (dir) => {
    const el = row.current;
    const step = (el?.firstElementChild?.offsetWidth || 240) + 16;
    el?.scrollBy({ left: dir * step, behavior: reduced ? 'auto' : 'smooth' });
  };
  return (
    <section className={styles.section} aria-labelledby="sr-sold">
      <SectionHead id="sr-sold" label={t(lang, 'home.sold')} title={t(lang, 'home.soldHint')}>
        {sold.length > 1 && (
          <div className={styles.rowArrows}>
            <button type="button" className={styles.roundBtn} onClick={() => scroll(-1)} aria-label={t(lang, 'home.prev')}>
              <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button type="button" className={styles.roundBtn} onClick={() => scroll(1)} aria-label={t(lang, 'home.next')}>
              <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </SectionHead>
      <ul ref={row} className={styles.soldRow}>
        {sold.map(car => (
          <li key={car.id} className={styles.soldCard}>
            <div className={styles.soldMedia}>
              <CarPhoto car={car} />
              <span className={styles.soldStamp}>{t(lang, 'home.soldStamp')}</span>
            </div>
            <div className={styles.soldBody}>
              <p className={styles.cardTitle}>{carTitle(car)}</p>
              <p className={styles.muted}>
                {t(lang, 'home.soldOn', { date: new Date(car.soldAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* The waitlist on the home page, for buyers who don't see their car: a dark photo
   band (Drivehub's "Ready to find your next vehicle?"). The form sits outside the
   band so it doesn't take the band's white-on-dark styles. */
function WishBand({ lang, car }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PhotoBand car={car} className={styles.wishBand} aria-labelledby="sr-wish">
        <h2 id="sr-wish" className={styles.h2}>{t(lang, 'wish.homeTitle')}</h2>
        <p className={styles.wishText}>{t(lang, 'wish.homeText')}</p>
        <button type="button" className={styles.btnPrimary} onClick={() => setOpen(true)}>
          <BellRing size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'wish.cta')}
        </button>
      </PhotoBand>
      {open && <LeadForm type="wish" query={{}} onClose={() => setOpen(false)} />}
    </>
  );
}

function Featured({ slides }) {
  const { events, settings, photoUrl } = useShowroom();
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
      className={`${styles.featured} ${styles.onDark} ${n ? '' : styles.featuredEmpty}`}
      data-sr-hero={n > 0 ? '' : undefined}
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
      {/* the photos fill the band behind the text; a car without photos shows its drawing in the text column */}
      <div className={styles.slides} aria-hidden="true">
        {slides.map((car, k) => (
          photoUrl(car.photoIds?.[0]) && (
            <div key={car.id} className={`${styles.slideMedia} ${k === i ? styles.slideMediaActive : ''}`}>
              <CarPhoto car={car} eager={k === 0} />
            </div>
          )
        ))}
        <div className={styles.slideShade} />
      </div>

      <div className={styles.featuredInner}>
        <h1 id="sr-featured" className={`${styles.label} ${styles.featuredLabel}`}>{t(lang, 'home.featured')}</h1>

        {n === 0 && (
          <div className={styles.actions}>
            <Link to="/showroom/cars" className={styles.btnPrimary}>{t(lang, 'home.seeAll')}</Link>
          </div>
        )}

        <div className={styles.slideTexts}>
          {slides.map((car, k) => {
            const info = effectivePrice(car, events, now);
            const title = carTitle(car);
            const drawn = !photoUrl(car.photoIds?.[0]);
            return (
              <div
                key={car.id}
                className={`${styles.slide} ${k === i ? styles.slideActive : ''} ${drawn ? styles.slideDrawn : ''}`}
                role="group"
                aria-roledescription="slide"
                aria-label={t(lang, 'home.slide', { n: k + 1, total: n })}
                aria-hidden={k !== i}
              >
                {drawn && <div className={styles.heroArt}><CarPhoto car={car} label={title} /></div>}
                <div className={styles.slideCopy}>
                  {(car.stockNo || BODY_TYPES[car.body]) && (
                    <p className={styles.heroTags} aria-hidden="true">
                      {car.stockNo && <span className={styles.mediaTag}>{car.stockNo}</span>}
                      {BODY_TYPES[car.body] && <span className={styles.mediaTag}>{BODY_TYPES[car.body]}</span>}
                    </p>
                  )}
                  <h2 className={styles.slideTitle}>{title}</h2>
                  <p className={styles.slideFacts}>
                    {[formatKm(car.odometer), TRANSMISSIONS[car.transmission], FUELS[car.fuel]].join(' · ')}
                  </p>
                  <div className={styles.heroPrice}>
                    {info.event && <span className={styles.saleChip}>{info.event.name}</span>}
                    {info.dropped && <span className={styles.saleChip}>{t(lang, 'price.dropped')}</span>}
                    <PriceTag info={info} wasLabel={t(lang, 'car.was')} />
                    <span className={styles.heroMonthly}>
                      {car.financing
                        ? t(lang, 'cars.fromMo', { amount: formatPeso(monthlyFrom(info.price, settings.financing)) })
                        : t(lang, 'cars.cashOnly')}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    <Link to={`/showroom/cars/${car.id}`} className={styles.btnPrimary} tabIndex={k === i ? 0 : -1}>
                      {t(lang, 'home.viewCar')}
                    </Link>
                    <Link to="/showroom/cars" className={styles.btnGhost} tabIndex={k === i ? 0 : -1}>
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
            <p className={styles.slideCount} aria-hidden="true">
              <strong>{String(i + 1).padStart(2, '0')}</strong> / {String(n).padStart(2, '0')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
