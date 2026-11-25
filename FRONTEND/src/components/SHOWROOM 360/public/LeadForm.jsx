import { useId, useRef, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom, newId } from '../store.js';
import { t } from '../i18n.js';
import { useNav, Sheet, currentRef } from '../ui.jsx';
import { validateLead, carTitle, saveErrorKind, formatPeso, BODY_TYPES, affordablePrice, DEFAULT_RESERVATION } from '../showroomRules.js';
import { describeQuery, mergeWishQuery } from '../autoRules.js';
import { MODELS } from '../../CARMARK 360/carData.js';

/* Every brand CarMark knows, so a buyer can wait for one the shop doesn't have yet */
const MAKES = [...new Set(MODELS.map(m => m.make))].sort();

/* Local date, not UTC: in Cebu (UTC+8) the UTC date is "yesterday" until 8 AM */
export const localISODate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* type: 'test-drive' | 'reserve' for a car, 'wish' (waitlist) for a saved search (`query`),
   or 'trade-in' for the buyer's own car, toward `car` when they came from one */
export default function LeadForm({ type, car, query, onClose }) {
  const { saveLead, cars, settings } = useShowroom();
  const { lang } = useNav();
  const today = localISODate();
  const [form, setForm] = useState({ name: '', mobile: '', date: today, slot: '', note: '', tradeCar: '', km: '', asking: '', income: '', cash: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const formRef = useRef(null);
  const uid = useId();
  const testDrive = type === 'test-drive';
  const wish = type === 'wish';
  const tradeIn = type === 'trade-in';
  const reserve = type === 'reserve';
  /* test drives and reservations may say what the buyer can afford */
  const asksBudget = testDrive || reserve;
  const budgetMax = asksBudget ? affordablePrice({ income: form.income, cash: form.cash }, settings.financing) : 0;
  const res = settings.reservation || DEFAULT_RESERVATION;
  /* the waitlist's own fields, filled from the search or car the buyer came from */
  const [want, setWant] = useState(() => ({
    body: query?.body || '', make: query?.make || '', q: query?.q || '', priceMax: query?.priceMax ? String(query.priceMax) : '',
  }));
  const wishQuery = wish ? mergeWishQuery(query, want) : null;
  const makes = [...new Set([...MAKES, ...cars.map(c => c.make), want.make].filter(Boolean))].sort();
  const setWantField = (k) => (e) => setWant(w => ({ ...w, [k]: k === 'priceMax' ? e.target.value.replace(/\D/g, '') : e.target.value }));

  /* Editing a field clears its error, so a fixed field stops looking wrong */
  const change = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(er => (er[k] ? { ...er, [k]: undefined } : er));
  };
  const set = (k) => (e) => change(k, e.target.value);
  const setDigits = (k) => (e) => change(k, e.target.value.replace(/\D/g, ''));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLead({ type, ...form }, today);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      const first = ['tradeCar', 'name', 'mobile', 'date', 'slot'].find(k => errs[k]);
      formRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    setSendError('');
    try {
      await saveLead({
        id: newId('lead'),
        type,
        ...(wish
          ? { carId: null, carLabel: describeQuery(wishQuery, 'en'), query: wishQuery, notifiedCarIds: [] }
          : { carId: car?.id ?? null, carLabel: car ? `${carTitle(car)} (${car.stockNo})` : '' }),
        ...(tradeIn && { tradeIn: { car: form.tradeCar.trim(), km: Number(form.km) || null, asking: Number(form.asking) || null } }),
        ...(budgetMax > 0 && { budget: { income: Number(form.income), cash: Number(form.cash), max: budgetMax } }),
        ...(currentRef() && { agentCode: currentRef() }),
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        date: testDrive ? form.date : '',
        slot: testDrive ? form.slot : '',
        note: form.note.trim(),
        status: 'new',
        createdAt: new Date().toISOString(),
        lang,
      });
      setSent(true);
    } catch (err) {
      setSendError(t(lang, saveErrorKind(err) === 'full' ? 'lead.full' : 'lead.failed'));
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, input) => (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`${uid}-${key}`}>{label}</label>
      {input}
      {errors[key] && <p className={styles.error} id={`${uid}-${key}-err`}>{t(lang, `err.${key}`)}</p>}
    </div>
  );
  const aria = (key) => ({
    id: `${uid}-${key}`,
    'data-field': key,
    'aria-invalid': errors[key] ? 'true' : undefined,
    'aria-describedby': errors[key] ? `${uid}-${key}-err` : undefined,
  });

  return (
    <Sheet open={!!type} onClose={onClose} title={t(lang, wish ? 'wish.title' : tradeIn ? 'trade.title' : testDrive ? 'lead.testDrive' : 'lead.reserve')} closeLabel={t(lang, 'common.close')}>
      {sent ? (
        <div className={styles.sentBox}>
          <CircleCheck size={44} strokeWidth={1.5} aria-hidden="true" />
          <h3 className={styles.h3}>{t(lang, 'lead.sent')}</h3>
          <p className={styles.muted}>{t(lang, wish ? 'wish.sentHint' : tradeIn ? 'trade.sentHint' : 'lead.sentHint')}</p>
          <button type="button" className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={onClose}>{t(lang, 'lead.done')}</button>
        </div>
      ) : (
        <form ref={formRef} className={styles.formGrid} onSubmit={submit} noValidate>
          {wish ? (
            <p className={styles.leadCar} aria-live="polite"><span className={styles.srOnly}>{t(lang, 'wish.looking')}: </span>{describeQuery(wishQuery, lang)}</p>
          ) : tradeIn ? (
            car && <p className={styles.leadCar}>{t(lang, 'trade.toward', { car: carTitle(car) })}</p>
          ) : (
            <p className={styles.leadCar}>{carTitle(car)} · {car.stockNo}</p>
          )}
          <p className={styles.muted}>{t(lang, wish ? 'wish.hint' : tradeIn ? 'trade.hint' : testDrive ? 'lead.testDriveHint' : 'lead.reserveHint')}</p>
          {reserve && (
            <p className={styles.resTerms}>
              {t(lang, 'res.terms', { fee: formatPeso(res.fee), days: res.days })} {t(lang, `res.refund.${res.refund}`)}
            </p>
          )}
          {tradeIn && (
            <>
              {field('tradeCar', t(lang, 'trade.car'),
                <input className={styles.input} placeholder="2016 Toyota Vios 1.3 E MT" value={form.tradeCar} onChange={set('tradeCar')} {...aria('tradeCar')} />)}
              {field('km', t(lang, 'trade.km'),
                <input className={styles.input} inputMode="numeric" placeholder="80000" value={form.km} onChange={setDigits('km')} {...aria('km')} />)}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`${uid}-asking`}>{t(lang, 'trade.asking')}</label>
                <input id={`${uid}-asking`} className={styles.input} inputMode="numeric" placeholder="350000" value={form.asking} onChange={setDigits('asking')} />
                {Number(form.asking) > 0 && <p className={styles.hint}>{formatPeso(form.asking)}</p>}
              </div>
            </>
          )}
          {wish && (
            <div className={styles.wishFields}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`${uid}-body`}>{t(lang, 'cars.body')}</label>
                <select id={`${uid}-body`} className={styles.select} value={want.body} onChange={setWantField('body')}>
                  <option value="">{t(lang, 'cars.any')}</option>
                  {Object.entries(BODY_TYPES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`${uid}-make`}>{t(lang, 'cars.make')}</label>
                <select id={`${uid}-make`} className={styles.select} value={want.make} onChange={setWantField('make')}>
                  <option value="">{t(lang, 'cars.any')}</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`${uid}-q`}>{t(lang, 'wish.keyword')}</label>
                <input id={`${uid}-q`} className={styles.input} placeholder="Innova, Mirage…" value={want.q} onChange={setWantField('q')} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor={`${uid}-max`}>{t(lang, 'wish.budget')}</label>
                <input id={`${uid}-max`} className={styles.input} inputMode="numeric" placeholder="900000" value={want.priceMax} onChange={setWantField('priceMax')} />
                {Number(want.priceMax) > 0 && <p className={styles.hint}>{t(lang, 'wish.upTo', { amount: formatPeso(want.priceMax) })}</p>}
              </div>
            </div>
          )}
          {field('name', t(lang, 'lead.name'),
            <input className={styles.input} autoComplete="name" value={form.name} onChange={set('name')} {...aria('name')} />)}
          {field('mobile', t(lang, 'lead.mobile'),
            <input className={styles.input} type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" value={form.mobile} onChange={set('mobile')} {...aria('mobile')} />)}
          {testDrive && field('date', t(lang, 'lead.date'),
            <input className={styles.input} type="date" min={today} value={form.date} onChange={set('date')} {...aria('date')} />)}
          {testDrive && (
            <div className={styles.field}>
              <span className={styles.fieldLabel} id={`${uid}-slot-label`}>{t(lang, 'lead.slot')}</span>
              <div className={`${styles.segmented} ${styles.segmentedFill}`} role="group" aria-labelledby={`${uid}-slot-label`}>
                {['morning', 'afternoon'].map((s, k) => (
                  <button
                    key={s}
                    type="button"
                    data-field={k === 0 ? 'slot' : undefined}
                    aria-pressed={form.slot === s}
                    onClick={() => change('slot', s)}
                  >
                    {t(lang, `lead.${s}`)}
                  </button>
                ))}
              </div>
              {errors.slot && <p className={styles.error}>{t(lang, 'err.slot')}</p>}
            </div>
          )}
          {asksBudget && (
            <fieldset className={styles.budgetFields}>
              <legend>{t(lang, 'lead.budgetTitle')}</legend>
              {field('income', t(lang, 'afford.income'),
                <input className={styles.input} inputMode="numeric" placeholder="35000" value={form.income} onChange={setDigits('income')} {...aria('income')} />)}
              {field('cash', t(lang, 'afford.cash'),
                <input className={styles.input} inputMode="numeric" placeholder="200000" value={form.cash} onChange={setDigits('cash')} {...aria('cash')} />)}
              {budgetMax > 0 && <p className={styles.hint} aria-live="polite">{t(lang, 'afford.result', { amount: formatPeso(budgetMax) })}</p>}
            </fieldset>
          )}
          {field('note', t(lang, 'lead.note'),
            <textarea className={styles.textarea} rows={3} value={form.note} onChange={set('note')} {...aria('note')} />)}
          {sendError && <p className={styles.error} role="alert">{sendError}</p>}
          <button type="submit" className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>{t(lang, 'lead.send')}</button>
        </form>
      )}
    </Sheet>
  );
}
