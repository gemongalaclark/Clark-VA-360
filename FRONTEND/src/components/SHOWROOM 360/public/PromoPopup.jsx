import { useEffect, useId, useRef, useState } from 'react';
import { Copy, Ticket } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom, newId } from '../store.js';
import { t } from '../i18n.js';
import { useNav, Sheet } from '../ui.jsx';
import { saveErrorKind } from '../showroomRules.js';
import {
  activePromo, pickPrize, wheelSlices, landingAngle, newCode, voucherPrefix, isEmail, claimFor, voucherExpires, VOUCHER_DAYS,
} from '../promoRules.js';
import Wheel from './Wheel.jsx';

/* The promo "ad": while a live event carries a live promo, the wheel opens once per
   visit (sessionStorage) on whatever public page the buyer lands on. One spin per
   person in this browser (localStorage keeps the result, so closing it can't buy a
   second spin); a claim needs a name and an email no one has used on this promo. */

const seenKey = (id) => `showroom360:promoSeen:${id}`;
const spinKey = (id) => `showroom360:spin:${id}`;
const claimKey = (id) => `showroom360:claim:${id}`;
const read = (store, key) => { try { return JSON.parse(store.getItem(key) || 'null'); } catch { return null; } };
const write = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); } catch { /* private mode: fine for this visit */ } };
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const longDate = (d) => d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

export default function PromoPopup() {
  const { events, promos, claims, settings, saveClaim } = useShowroom();
  const { lang, now, navigate } = useNav();
  const found = activePromo(events, promos, now);
  const promo = found?.promo || null;
  const [open, setOpen] = useState(false);

  /* Decide once per promo, a moment after landing (and never on top of another dialog,
     such as the reserved-car notice) */
  useEffect(() => {
    if (!promo) return undefined;
    if (read(sessionStorage, seenKey(promo.id)) || read(localStorage, claimKey(promo.id))) return undefined;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (document.querySelector('dialog[open]') && tries < 30) return;
      clearInterval(id);
      write(sessionStorage, seenKey(promo.id), 1);
      setOpen(true);
    }, 1200);
    return () => clearInterval(id);
  }, [promo?.id]);

  if (!promo || !open) return null;
  return (
    <PromoSheet
      key={promo.id} promo={promo} event={found.event} claims={claims} settings={settings} saveClaim={saveClaim}
      lang={lang} navigate={navigate} onClose={() => setOpen(false)}
    />
  );
}

function PromoSheet({ promo, event, claims, settings, saveClaim, lang, navigate, onClose }) {
  const uid = useId();
  const saved = read(localStorage, spinKey(promo.id));
  const savedPrize = saved && promo.prizes.find(p => p.id === saved.prizeId);
  const [stage, setStage] = useState(savedPrize ? 'won' : 'intro');
  const [prize, setPrize] = useState(savedPrize || null);
  const [returning] = useState(!!savedPrize);
  const [rotation, setRotation] = useState(() => (savedPrize ? landingAngle(wheelSlices(promo.prizes), savedPrize.id, 0.5) : 0));
  const [spinning, setSpinning] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const spin = () => {
    const won = pickPrize(promo.prizes, Math.random());
    /* the result is kept before the wheel turns: closing mid-spin can't earn another go */
    write(localStorage, spinKey(promo.id), { prizeId: won.id, at: new Date().toISOString() });
    setPrize(won);
    const turn = landingAngle(wheelSlices(promo.prizes), won.id, Math.random());
    if (reducedMotion()) {
      setRotation(turn);
      setStage('won');
      return;
    }
    setStage('spinning');
    setSpinning(true);
    /* let the browser paint the start position before turning */
    requestAnimationFrame(() => requestAnimationFrame(() => setRotation(turn)));
    timer.current = setTimeout(() => { setSpinning(false); setStage('won'); }, 4400);
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = t(lang, 'err.name');
    if (!isEmail(form.email)) errs.email = t(lang, 'err.email');
    else if (claimFor(promo.id, form.email, claims)) errs.email = t(lang, 'err.claimed');
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`${uid}-${errs.name ? 'name' : 'email'}`)?.focus();
      return;
    }
    setBusy(true);
    const c = {
      id: newId('claim'), promoId: promo.id, eventId: event?.id || null,
      prizeId: prize.id, prizeLabel: prize.label,
      name: form.name.trim(), email: form.email.trim(),
      voucher: newCode(voucherPrefix(settings.shopName), claims.map(x => x.voucher), Math.random, 8),
      claimedAt: new Date().toISOString(), redeemedAt: null, stockNo: '',
    };
    try {
      await saveClaim(c);
      write(localStorage, claimKey(promo.id), { voucher: c.voucher });
      setClaim(c);
      setStage('claimed');
    } catch (err) {
      setErrors({ form: t(lang, saveErrorKind(err) === 'full' ? 'lead.full' : 'lead.failed') });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(claim.voucher); setCopied(true); } catch { /* the code is on screen to copy by hand */ }
  };
  const goTerms = (e) => { e.preventDefault(); onClose(); navigate('/showroom/terms'); };

  const field = (key, label, props) => (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`${uid}-${key}`}>{label}</label>
      <input
        id={`${uid}-${key}`} className={styles.input} value={form[key]}
        onChange={(e) => { const v = e.target.value; setForm(f => ({ ...f, [key]: v })); setErrors(er => ({ ...er, [key]: undefined })); }}
        aria-invalid={errors[key] ? 'true' : undefined} aria-describedby={errors[key] ? `${uid}-${key}-err` : undefined}
        {...props}
      />
      {errors[key] && <p className={styles.error} id={`${uid}-${key}-err`}>{errors[key]}</p>}
    </div>
  );

  return (
    <Sheet open onClose={onClose} title={t(lang, 'promo.title', { event: event?.name || promo.name })} closeLabel={t(lang, 'common.close')}>
      <div className={styles.promo}>
        {stage !== 'claimed' && (
          <>
            {stage === 'intro' && <p className={styles.lead}>{t(lang, 'promo.lead')}</p>}
            <div className={styles.promoWheel}><Wheel prizes={promo.prizes} rotation={rotation} spinning={spinning} /></div>
            <p className={styles.promoResult} aria-live="polite">
              {stage === 'spinning' && t(lang, 'promo.spinning')}
              {stage === 'won' && prize && t(lang, returning ? 'promo.wonBefore' : 'promo.won', { prize: prize.label })}
            </p>
          </>
        )}

        {stage === 'intro' && (
          <>
            <div className={styles.promoActions}>
              <button type="button" className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={spin}>{t(lang, 'promo.spin')}</button>
              <button type="button" className={`${styles.btnGhost} ${styles.btnBlock}`} onClick={onClose}>{t(lang, 'promo.noThanks')}</button>
            </div>
            <details className={styles.promoOdds}>
              <summary>{t(lang, 'promo.odds')}</summary>
              <ul>{promo.prizes.map(p => <li key={p.id}><span>{p.label}</span><strong>{Number(p.chance)}%</strong></li>)}</ul>
            </details>
          </>
        )}

        {stage === 'won' && (
          <form className={styles.formGrid} onSubmit={submit} noValidate>
            <p className={styles.muted}>{t(lang, 'promo.claimHint')}</p>
            {field('name', t(lang, 'promo.name'), { autoComplete: 'name' })}
            {field('email', t(lang, 'promo.email'), { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'ana@gmail.com' })}
            {errors.form && <p className={styles.error} role="alert">{errors.form}</p>}
            <div className={styles.promoActions}>
              <button type="submit" className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>{t(lang, 'promo.claim')}</button>
              <button type="button" className={`${styles.btnGhost} ${styles.btnBlock}`} onClick={onClose}>{t(lang, 'promo.later')}</button>
            </div>
          </form>
        )}

        {stage === 'claimed' && claim && (
          <div className={styles.voucher}>
            <p className={styles.voucherLabel}>{t(lang, 'promo.voucher')}</p>
            <p className={styles.voucherCode}><Ticket size={22} strokeWidth={1.75} aria-hidden="true" />{claim.voucher}</p>
            <p className={styles.voucherPrize}>{claim.prizeLabel}</p>
            <p className={styles.muted}>{t(lang, 'promo.valid', { date: longDate(voucherExpires(claim)) })}</p>
            <p>{t(lang, 'promo.show', { shop: settings.shopName })}</p>
            <div className={styles.promoActions}>
              <button type="button" className={`${styles.btnGhost} ${styles.btnBlock}`} onClick={copy}>
                <Copy size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, copied ? 'promo.copied' : 'promo.copy')}
              </button>
              <button type="button" className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={onClose}>{t(lang, 'promo.done')}</button>
            </div>
          </div>
        )}

        <p className={styles.promoSmall}>
          {promo.permit ? t(lang, 'promo.permit', { permit: promo.permit }) : t(lang, 'promo.sample')}{' '}
          {t(lang, 'promo.rules', { days: VOUCHER_DAYS })}{' '}
          <a href="/showroom/terms" onClick={goTerms}>{t(lang, 'legal.terms')}</a>
        </p>
      </div>
    </Sheet>
  );
}
