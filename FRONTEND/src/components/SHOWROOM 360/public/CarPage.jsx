import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, SearchX, CalendarCheck, BookmarkCheck } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t } from '../i18n.js';
import { useNav, Link, CarPhoto, PriceTag } from '../ui.jsx';
import {
  effectivePrice, carTitle, formatKm, formatPeso, monthlyFrom, COLORS, BODY_TYPES, TRANSMISSIONS, FUELS, DRIVES,
} from '../showroomRules.js';
import ConditionCard from './ConditionCard.jsx';
import LoanCalc from './LoanCalc.jsx';
import InquiryBar from './InquiryBar.jsx';
import LeadForm from './LeadForm.jsx';

export default function CarPage({ id }) {
  const { cars, events, settings } = useShowroom();
  const { lang, now } = useNav();
  const [lead, setLead] = useState(null);
  const [seenReserved, setSeenReserved] = useState(false);
  const car = cars.find(c => c.id === id);

  if (!car) {
    return (
      <div className={styles.empty}>
        <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
        <h1>{t(lang, 'car.notFound')}</h1>
        <p>{t(lang, 'car.notFoundHint')}</p>
        <Link to="/showroom/cars" className={styles.btnPrimary}>{t(lang, 'car.back')}</Link>
      </div>
    );
  }

  const info = effectivePrice(car, events, now);
  const title = carTitle(car);
  const sold = car.status === 'sold';
  const reserved = car.status === 'reserved';

  const facts = [
    ['spec.year', car.year],
    ['spec.odometer', formatKm(car.odometer)],
    ['spec.transmission', TRANSMISSIONS[car.transmission]],
    ['spec.fuel', FUELS[car.fuel]],
  ];
  const specs = [
    ['spec.year', car.year],
    ['spec.odometer', formatKm(car.odometer)],
    ['spec.transmission', TRANSMISSIONS[car.transmission]],
    ['spec.fuel', FUELS[car.fuel]],
    ['spec.engine', car.engine],
    ['spec.drive', DRIVES[car.drive]],
    ['spec.seats', car.seats],
    ['spec.color', COLORS[car.color]?.label],
    ['spec.body', BODY_TYPES[car.body]],
    ['spec.stock', car.stockNo],
    ['spec.plate', car.plateEnding],
  ].filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');

  return (
    <div className={styles.carPage}>
      <Link to="/showroom/cars" className={styles.crumb}>
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'car.back')}
      </Link>

      {sold && (
        <div className={styles.soldBanner} role="status">
          <strong>{t(lang, 'car.sold')}</strong>
          <Link to="/showroom/cars">{t(lang, 'car.soldHint')}</Link>
        </div>
      )}

      <div className={styles.carGrid}>
        <Gallery car={car} title={title} lang={lang} />

        <aside className={styles.carSide}>
          <div className={styles.carSummary}>
            {/* a sale is named on the sticker's red header below */}
            {reserved && (
              <div className={styles.cardBadges}>
                <span className={styles.reservedChip}>{t(lang, 'car.reserved')}</span>
              </div>
            )}
            <h1 className={styles.carTitle}>{title}</h1>
            <dl className={styles.factStrip}>
              {facts.map(([key, value]) => (
                <div key={key}><dt>{t(lang, key)}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </div>

          {/* The car's window sticker: price, monthly, the ways to ask, the stock no. */}
          <div className={`${styles.priceBox} ${info.event ? styles.priceBoxSale : ''}`}>
            <p className={styles.priceBoxHead}>
              <span>{info.event ? info.event.name : t(lang, 'sticker.price')}</span>
              {car.negotiable && !sold && <span>{t(lang, 'car.negotiable')}</span>}
            </p>
            <div className={styles.priceBoxBody}>
              <PriceTag info={info} wasLabel={t(lang, 'car.was')} className={styles.carPrice} />
              {!sold && (
                <p className={styles.stickerTear}>
                  {car.financing
                    ? t(lang, 'cars.fromMo', { amount: formatPeso(monthlyFrom(info.price, settings.financing)) })
                    : t(lang, 'cars.cashOnly')}
                </p>
              )}
              {!sold && (
                <>
                  <InquiryBar car={car} info={info} disabled={reserved} />
                  <div className={styles.leadButtons}>
                    <button type="button" className={styles.btnGhost} onClick={() => setLead('test-drive')} disabled={reserved}>
                      <CalendarCheck size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'lead.testDrive')}
                    </button>
                    {car.status === 'available' && (
                      <button type="button" className={styles.btnGhost} onClick={() => setLead('reserve')}>
                        <BookmarkCheck size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'lead.reserve')}
                      </button>
                    )}
                  </div>
                  {reserved && <p className={styles.reservedNote}>{t(lang, 'car.reservedNoContact')}</p>}
                </>
              )}
              {car.stockNo && (
                <p className={styles.barcode}><span className={styles.srOnly}>{t(lang, 'spec.stock')} </span>{car.stockNo}</p>
              )}
            </div>
          </div>

          {!sold && car.financing && <LoanCalc key={info.price} price={info.price} fin={settings.financing} />}
        </aside>

        <div className={styles.carDetails}>
          <ConditionCard car={car} />

          <section className={styles.panel} aria-labelledby="sr-specs">
            <h2 id="sr-specs" className={styles.h3}>{t(lang, 'car.specs')}</h2>
            <dl className={styles.specList}>
              {specs.map(([key, value]) => (
                <div key={key}><dt>{t(lang, key)}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>

          {car.description && (
            <section className={styles.panel} aria-labelledby="sr-desc">
              <h2 id="sr-desc" className={styles.h3}>{t(lang, 'car.about')}</h2>
              <p className={styles.prose}>{car.description}</p>
            </section>
          )}

          {car.knownIssues && (
            <section className={styles.panel} aria-labelledby="sr-issues">
              <h2 id="sr-issues" className={styles.h3}>{t(lang, 'car.issues')}</h2>
              <p className={styles.prose}>{car.knownIssues}</p>
            </section>
          )}
        </div>
      </div>

      <LeadForm key={lead || 'none'} type={lead} car={car} onClose={() => setLead(null)} />
      {car.status === 'reserved' && !seenReserved && <ReservedOverlay lang={lang} onView={() => setSeenReserved(true)} />}
    </div>
  );
}

/* A reserved car greys out the whole screen with a big stamp. Native <dialog>:
   the page behind can't be clicked, focus stays inside, and Esc means "view anyway". */
function ReservedOverlay({ lang, onView }) {
  const ref = useRef(null);
  const { navigate } = useNav();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => { if (d?.open) d.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.reservedOverlay}
      aria-labelledby="sr-reserved-title"
      aria-describedby="sr-reserved-hint"
      onCancel={(e) => { e.preventDefault(); onView(); }}
    >
      <p id="sr-reserved-title" className={styles.reservedStamp}>
        {/* lines break only between words, never at a hyphen (NA-RESERVE NA) */}
        {t(lang, 'car.reservedStamp').split(' ').map((w, i) => <span key={i}>{i > 0 ? ' ' : ''}<span className={styles.nowrap}>{w}</span></span>)}
      </p>
      <p id="sr-reserved-hint" className={styles.reservedHint}>{t(lang, 'car.reservedHint')}</p>
      <div className={styles.reservedActions}>
        <button type="button" className={styles.btnPrimary} onClick={() => navigate('/showroom/cars')} autoFocus>
          {t(lang, 'car.reservedOthers')}
        </button>
        <button type="button" className={styles.reservedView} onClick={onView}>{t(lang, 'car.reservedView')}</button>
      </div>
    </dialog>
  );
}

function Gallery({ car, title, lang }) {
  const total = Math.max(1, car.photoIds.length);
  const [index, setIndex] = useState(0);
  const touchX = useRef(null);
  const i = Math.min(index, total - 1);
  const go = (d) => setIndex(v => (Math.min(v, total - 1) + d + total) % total);

  return (
    <div className={styles.gallery}>
      <div
        className={styles.galleryMain}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
          if (total > 1 && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <CarPhoto car={car} index={i} label={total > 1 ? `${title}, ${t(lang, 'car.photo', { n: i + 1, total })}` : title} mark />
        {total > 1 && (
          <>
            <button type="button" className={`${styles.galleryNav} ${styles.galleryPrev}`} onClick={() => go(-1)} aria-label={t(lang, 'car.prevPhoto')}>
              <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.galleryNav} ${styles.galleryNext}`} onClick={() => go(1)} aria-label={t(lang, 'car.nextPhoto')}>
              <ChevronRight size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <span className={styles.galleryCount}>{i + 1} / {total}</span>
          </>
        )}
      </div>
      {total > 1 && (
        <div className={styles.thumbs}>
          {car.photoIds.map((pid, k) => (
            <button
              key={pid}
              type="button"
              className={styles.thumb}
              aria-current={k === i ? 'true' : undefined}
              aria-label={t(lang, 'car.photo', { n: k + 1, total })}
              onClick={() => setIndex(k)}
            >
              <CarPhoto car={car} index={k} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
