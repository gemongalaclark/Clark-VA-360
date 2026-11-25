/* Compare saved cars side by side (up to 4): price, monthly, the specs, condition,
   papers and the inspection. Phones scroll sideways with the row names pinned. */
import { ChevronLeft, X, Heart } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t } from '../i18n.js';
import { useNav, Link, CarPhoto, PriceTag, useSaved } from '../ui.jsx';
import {
  effectivePrice, carTitle, formatKm, formatPeso, monthlyFrom, inspectionSummary, TRANSMISSIONS, FUELS, BODY_TYPES,
} from '../showroomRules.js';

const MAX = 4;

export default function Compare() {
  const { cars, events, settings } = useShowroom();
  const { lang, now } = useNav();
  const [saved, toggle] = useSaved();
  const list = saved.map(id => cars.find(c => c.id === id)).filter(c => c && c.status !== 'sold').slice(0, MAX);

  if (list.length < 2) {
    return (
      <div className={styles.empty}>
        <Heart size={40} strokeWidth={1.5} aria-hidden="true" />
        <h1>{t(lang, 'compare.title')}</h1>
        <p>{t(lang, 'compare.empty')}</p>
        <Link to="/showroom/cars" className={styles.btnPrimary}>{t(lang, 'home.seeAll')}</Link>
      </div>
    );
  }

  const tri = (key) => (c) => t(lang, `cond.${['yes', 'no'].includes(c[key]) ? c[key] : 'unknown'}`);
  const rows = [
    ['compare.price', c => <PriceTag info={effectivePrice(c, events, now)} wasLabel={t(lang, 'car.was')} />],
    ['compare.monthly', c => (c.financing
      ? t(lang, 'cars.fromMo', { amount: formatPeso(monthlyFrom(effectivePrice(c, events, now).price, settings.financing)) })
      : t(lang, 'cars.cashOnly'))],
    ['spec.year', c => c.year],
    ['spec.odometer', c => formatKm(c.odometer)],
    ['spec.transmission', c => TRANSMISSIONS[c.transmission]],
    ['spec.fuel', c => FUELS[c.fuel]],
    ['spec.engine', c => c.engine],
    ['spec.seats', c => c.seats],
    ['spec.body', c => BODY_TYPES[c.body]],
    ['cond.floodFree', tri('floodFree')],
    ['cond.accidentFree', tri('accidentFree')],
    ['cond.casaMaintained', tri('casaMaintained')],
    ['cond.owners', c => (c.owners && c.owners !== 'unknown' ? t(lang, `owners.${c.owners}`) : t(lang, 'cond.unknown'))],
    ['cond.orcr', c => (c.orcr && c.orcr !== 'unknown' ? t(lang, `orcr.${c.orcr}`) : t(lang, 'cond.unknown'))],
    ['insp.title', c => {
      const sum = inspectionSummary(c.inspection);
      return sum ? t(lang, 'insp.summary', { passed: sum.passed, total: sum.total }) : t(lang, 'cond.unknown');
    }],
  ];

  return (
    <div className={styles.comparePage}>
      <Link to="/showroom/cars?saved=1" className={styles.crumb}>
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'cars.savedTitle')}
      </Link>
      <h1 className={styles.h2}>{t(lang, 'compare.title')}</h1>
      <p className={`${styles.hint} ${styles.compareHint}`}>{t(lang, 'compare.hint')}</p>
      <div className={styles.compareScroll} tabIndex={0} role="region" aria-label={t(lang, 'compare.title')}>
        <table className={styles.compareTable} style={{ '--cols': list.length }}>
          <thead>
            <tr>
              <td />
              {list.map(c => (
                <th key={c.id} scope="col">
                  <div className={styles.compareCar}>
                    <Link to={`/showroom/cars/${c.id}`} className={styles.compareLink}>
                      <span className={styles.compareMedia}><CarPhoto car={c} /></span>
                      <span>{carTitle(c)}</span>
                    </Link>
                    <button type="button" className={styles.compareRemove} aria-label={t(lang, 'compare.remove', { car: carTitle(c) })} onClick={() => toggle(c.id)}>
                      <X size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, value]) => (
              <tr key={key}>
                <th scope="row">{t(lang, key)}</th>
                {list.map(c => {
                  const v = value(c);
                  return <td key={c.id}>{v === undefined || v === null || v === '' ? '—' : v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
