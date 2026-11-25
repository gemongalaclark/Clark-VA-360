import { useEffect, useId, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, SearchX, ArrowRight, BellRing, Gauge, Cog, Fuel } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t } from '../i18n.js';
import { useNav, Link, CarPhoto, PriceTag, Sheet, PhotoBand } from '../ui.jsx';
import {
  filterCars, parseQuery, toQuery, effectivePrice, monthlyFrom, carTitle, formatPeso, formatKm, bandCars,
  BODY_TYPES, TRANSMISSIONS, FUELS, SORT_KEYS,
  priceBounds, priceFilter, parsePesoInput, priceAtPosition, positionOfPrice, PRICE_POSITIONS,
} from '../showroomRules.js';
import LeadForm from './LeadForm.jsx';

const FILTER_KEYS = ['make', 'body', 'transmission', 'fuel', 'priceMin', 'priceMax', 'yearMin', 'yearMax', 'onSale'];

export default function Inventory() {
  const { cars, events, settings } = useShowroom();
  const { loc, navigate, lang, now } = useNav();
  const [query, setQuery] = useState(() => parseQuery(loc.search));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const searchId = useId();

  /* Back/Forward changed the URL: follow it */
  useEffect(() => {
    if (loc.search !== toQuery(query)) setQuery(parseQuery(loc.search));
  }, [loc.search]);

  const update = (patch) => {
    const next = { ...query, ...patch };
    for (const k of Object.keys(next)) if (next[k] === '' || next[k] === undefined || next[k] === false) delete next[k];
    setQuery(next);
    navigate(`/showroom/cars${toQuery(next)}`, { replace: true, keepScroll: true });
  };
  const clear = () => update(Object.fromEntries(FILTER_KEYS.map(k => [k, undefined]).concat([['q', undefined]])));

  const forSale = cars.filter(c => c.status !== 'sold');
  const options = useMemo(() => ({
    makes: [...new Set(forSale.map(c => c.make))].sort(),
    bodies: Object.keys(BODY_TYPES).filter(b => forSale.some(c => c.body === b)),
    years: [...new Set(forSale.map(c => c.year))].sort((a, b) => b - a),
    prices: priceBounds(cars, events, now),
  }), [cars, events, now]);

  const results = filterCars(cars, query, events, now);
  const activeFilters = FILTER_KEYS.filter(k => query[k]).length;
  /* the waitlist saves the search, not the sort order */
  const wishQuery = Object.fromEntries(Object.entries(query).filter(([k]) => k !== 'sort'));
  const wishBtn = (cls) => (
    <button type="button" className={cls} onClick={() => setWishOpen(true)}>
      <BellRing size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'wish.cta')}
    </button>
  );
  const countText = results.length === 1 ? t(lang, 'cars.count1') : t(lang, 'cars.count', { n: results.length });

  return (
    <>
      {/* the banner: a photo of a car on the lot, the header see-through over it */}
      <PhotoBand hero car={bandCars(cars)[0]} className={styles.invBanner}>
        <h1 className={styles.h1}>{t(lang, 'cars.title')}</h1>
      </PhotoBand>
      <div className={styles.inventory}>
        <div className={styles.inventoryHead}>
          <div className={styles.searchRow}>
            <label htmlFor={searchId} className={styles.srOnly}>{t(lang, 'cars.search')}</label>
            <div className={styles.searchBox}>
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
              <input
                id={searchId}
                type="search"
                className={styles.searchInput}
                placeholder={t(lang, 'cars.search')}
                value={query.q || ''}
                onChange={(e) => update({ q: e.target.value })}
                enterKeyHint="search"
              />
            </div>
            <button type="button" className={`${styles.btnGhost} ${styles.filterBtn}`} onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
              {t(lang, 'cars.filters')}{activeFilters > 0 && <span className={styles.countBadge}>{activeFilters}</span>}
            </button>
          </div>
        </div>

        <div className={styles.inventoryBody}>
          <aside className={styles.filterSide} aria-label={t(lang, 'cars.filters')}>
            <Filters query={query} update={update} options={options} lang={lang} idPrefix="side" />
            {activeFilters > 0 && <button type="button" className={styles.textBtn} onClick={clear}>{t(lang, 'cars.clear')}</button>}
          </aside>

          <section className={styles.results} aria-label={countText}>
            <div className={styles.resultsBar}>
              <p className={styles.muted} aria-live="polite">{countText}</p>
              <label className={styles.sortLabel}>
                <span>{t(lang, 'cars.sort')}</span>
                <select className={styles.select} value={query.sort || 'newest'} onChange={(e) => update({ sort: e.target.value === 'newest' ? undefined : e.target.value })}>
                  {SORT_KEYS.map(k => <option key={k} value={k}>{t(lang, `sort.${k}`)}</option>)}
                </select>
              </label>
            </div>

            {results.length === 0 ? (
              <div className={styles.empty}>
                <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
                <h2>{t(lang, 'cars.empty')}</h2>
                <p>{t(lang, 'cars.emptyHint')}</p>
                <p>{t(lang, 'wish.line')}</p>
                <div className={styles.emptyActions}>
                  {wishBtn(styles.btnPrimary)}
                  <button type="button" className={styles.btnGhost} onClick={clear}>{t(lang, 'cars.clear')}</button>
                </div>
              </div>
            ) : (
              <>
                <ul className={styles.cardGrid}>
                  {results.map(car => <CarCard key={car.id} car={car} events={events} now={now} lang={lang} fin={settings.financing} />)}
                </ul>
                <div className={styles.wishLine}>
                  <p>{t(lang, activeFilters > 0 || query.q ? 'wish.line' : 'wish.lineAny')}</p>
                  {wishBtn(styles.btnGhost)}
                </div>
              </>
            )}
          </section>
        </div>

        {/* mounted only while open: the form has no car to show when closed */}
        {wishOpen && <LeadForm type="wish" query={wishQuery} onClose={() => setWishOpen(false)} />}

        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t(lang, 'cars.filters')} closeLabel={t(lang, 'common.close')}>
          <Filters query={query} update={update} options={options} lang={lang} idPrefix="sheet" />
          <div className={styles.sheetActions}>
            <button type="button" className={styles.btnGhost} onClick={clear}>{t(lang, 'cars.clear')}</button>
            <button type="button" className={styles.btnPrimary} onClick={() => setSheetOpen(false)}>
              {t(lang, 'cars.show', { n: results.length })}
            </button>
          </div>
        </Sheet>
      </div>
    </>
  );
}

function Filters({ query, update, options, lang, idPrefix }) {
  const any = t(lang, 'cars.any');
  const sel = (key, label, entries, numeric = false) => (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`${idPrefix}-${key}`}>{label}</label>
      <select
        id={`${idPrefix}-${key}`}
        className={styles.select}
        value={query[key] ?? ''}
        onChange={(e) => update({ [key]: e.target.value === '' ? undefined : (numeric ? Number(e.target.value) : e.target.value) })}
      >
        <option value="">{any}</option>
        {entries.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>
  );
  return (
    <div className={styles.filters}>
      {sel('make', t(lang, 'cars.make'), options.makes.map(m => [m, m]))}
      {sel('body', t(lang, 'cars.body'), options.bodies.map(b => [b, BODY_TYPES[b]]))}
      {sel('transmission', t(lang, 'cars.transmission'), Object.entries(TRANSMISSIONS))}
      {sel('fuel', t(lang, 'cars.fuel'), Object.entries(FUELS))}
      {options.prices && options.prices.max > options.prices.min && (
        <PriceRange query={query} update={update} bounds={options.prices} lang={lang} idPrefix={idPrefix} />
      )}
      <div className={styles.fieldPair}>
        {sel('yearMin', t(lang, 'cars.yearMin'), options.years.map(y => [y, y]), true)}
        {sel('yearMax', t(lang, 'cars.yearMax'), options.years.map(y => [y, y]), true)}
      </div>
      <label className={styles.checkRow}>
        <input type="checkbox" checked={!!query.onSale} onChange={(e) => update({ onSale: e.target.checked || undefined })} />
        <span>{t(lang, 'cars.onSale')}</span>
      </label>
    </div>
  );
}

/* Price: type an amount or drag either end. The range is the showroom's own,
   cheapest to dearest car on sale, so the ends always mean "no limit". */
function PriceRange({ query, update, bounds, lang, idPrefix }) {
  const fit = (v, fallback) => Math.min(bounds.max, Math.max(bounds.min, v ?? fallback));
  const lo = fit(query.priceMin, bounds.min);
  const hi = Math.max(lo, fit(query.priceMax, bounds.max));
  const set = (min, max, edited) => update(priceFilter(min, max, bounds, edited));
  const a = positionOfPrice(lo, bounds);
  const b = positionOfPrice(hi, bounds);
  /* both ends at the far right: keep the min handle on top so it can be pulled back */
  const minOnTop = a >= PRICE_POSITIONS - 2 ? { zIndex: 3 } : undefined;
  const minLabel = t(lang, 'cars.priceMin');
  const maxLabel = t(lang, 'cars.priceMax');
  return (
    <div className={styles.priceRange}>
      <div className={styles.fieldPair}>
        <PesoBox id={`${idPrefix}-priceMin`} label={minLabel} value={lo} onCommit={(v) => set(v, hi, 'min')} />
        <PesoBox id={`${idPrefix}-priceMax`} label={maxLabel} value={hi} onCommit={(v) => set(lo, v, 'max')} />
      </div>
      <div className={styles.dualRange} style={{ '--a': a / PRICE_POSITIONS, '--b': b / PRICE_POSITIONS }}>
        <input
          type="range" min={0} max={PRICE_POSITIONS} step={1} value={a}
          aria-label={minLabel} aria-valuetext={formatPeso(lo)}
          onChange={(e) => set(priceAtPosition(Number(e.target.value), bounds), hi, 'min')}
          style={minOnTop}
        />
        <input
          type="range" min={0} max={PRICE_POSITIONS} step={1} value={b}
          aria-label={maxLabel} aria-valuetext={formatPeso(hi)}
          onChange={(e) => set(lo, priceAtPosition(Number(e.target.value), bounds), 'max')}
        />
      </div>
    </div>
  );
}

/* A peso amount the shopper can type; applied on Enter or when they leave the box */
function PesoBox({ id, label, value, onCommit }) {
  const [draft, setDraft] = useState(null);
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    onCommit(parsePesoInput(draft));
  };
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <div className={styles.pesoBox}>
        <span aria-hidden="true">₱</span>
        <input
          id={id}
          className={styles.pesoInput}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft ?? value.toLocaleString('en-PH')}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        />
      </div>
    </div>
  );
}

export function CarCard({ car, events, now, lang, fin }) {
  const info = effectivePrice(car, events, now);
  const title = carTitle(car);
  return (
    <li className={styles.card}>
      <Link to={`/showroom/cars/${car.id}`} className={styles.cardLink}>
        <div className={styles.cardMedia}>
          <CarPhoto car={car} />
          <div className={styles.cardBadges}>
            {info.event && <span className={styles.saleChip}>{info.event.name}</span>}
            {info.dropped && <span className={styles.saleChip}>{t(lang, 'price.dropped')}</span>}
            {car.status === 'reserved' && <span className={styles.reservedChip}>{t(lang, 'car.reserved')}</span>}
          </div>
          {car.stockNo && <span className={styles.cardStock} aria-hidden="true">{car.stockNo}</span>}
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>{title}</h3>
            <PriceTag info={info} wasLabel={t(lang, 'car.was')} className={styles.cardPrice} />
          </div>
          <p className={styles.cardFacts}>
            <span><Gauge size={14} strokeWidth={1.75} aria-hidden="true" />{formatKm(car.odometer)}</span>
            <span><Cog size={14} strokeWidth={1.75} aria-hidden="true" />{TRANSMISSIONS[car.transmission]}</span>
            <span><Fuel size={14} strokeWidth={1.75} aria-hidden="true" />{FUELS[car.fuel]}</span>
          </p>
        </div>
        <p className={styles.cardMonthly}>
          <span>
            {car.financing
              ? t(lang, 'cars.fromMo', { amount: formatPeso(monthlyFrom(info.price, fin)) })
              : t(lang, 'cars.cashOnly')}
          </span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </p>
      </Link>
    </li>
  );
}
