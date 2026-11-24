import { useEffect, useId, useRef, useState } from 'react';
import { Copy, Check, X, Gift } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom, newId } from '../store.js';
import { t } from '../i18n.js';
import { useNav } from '../ui.jsx';
import { saveErrorKind } from '../showroomRules.js';
import {
  activePromo, pickPrize, wheelSlices, landingAngle, newCode, voucherPrefix, isEmail, claimFor, voucherExpires, VOUCHER_DAYS,
  voucherStatus,
} from '../promoRules.js';
import Wheel, { sliceFill } from './Wheel.jsx';

/* The promo: while a live event carries a live promo, a floating gift button sits on the
   home page (Clark, 2026-11-24: no pop-up opening by itself). Tapping it opens the wheel
   where the buyer left off: the wheel, the claim form after a spin, or their voucher once
   claimed; the button's sticker says which (SPIN / CLAIM / MY CODE). One spin per person
   in this browser (localStorage keeps the result, so closing it can't buy a second spin);
   a claim needs a name and an email no one has used on this promo.
   Layout: a dark header with the wheel, then the step on paper. The dialog is pinned to
   the top and only grows downward, so the wheel never moves between steps. */

const spinKey = (id) => `showroom360:spin:${id}`;
const claimKey = (id) => `showroom360:claim:${id}`;
const read = (store, key) => { try { return JSON.parse(store.getItem(key) || 'null'); } catch { return null; } };
const write = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); } catch { /* private mode: fine for this visit */ } };
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const longDate = (d) => d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
const SPIN_MS = 4400;

export default function PromoPopup() {
  const { events, promos, claims, settings, saveClaim } = useShowroom();
  const { lang, now, navigate, loc } = useNav();
  const found = activePromo(events, promos, now);
  const promo = found?.promo || null;
  const [open, setOpen] = useState(false);
  const fab = useRef(null);
  /* the dialog leaves the page as it closes, so hand focus back to the button ourselves */
  const close = () => { setOpen(false); requestAnimationFrame(() => fab.current?.focus()); };

  if (!promo) return null;
  /* where this buyer is: read fresh each render, so closing the wheel updates the sticker */
  const step = read(localStorage, claimKey(promo.id)) ? 'code' : read(localStorage, spinKey(promo.id)) ? 'claim' : 'spin';
  return (
    <>
      {/* home page only; it stays while the wheel is open, so closing returns focus to it */}
      {loc.view === 'home' && (
        <button
          ref={fab}
          type="button"
          className={styles.promoFab}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={step === 'code' ? t(lang, 'promo.fabMine') : t(lang, 'promo.fab', { event: found.event?.name || promo.name })}
        >
          <Gift size={28} strokeWidth={1.9} aria-hidden="true" className={styles.promoFabIcon} />
          <span className={styles.promoFabTag} aria-hidden="true">{t(lang, `promo.tag.${step}`)}</span>
        </button>
      )}
      {open && (
        <PromoDialog
          key={promo.id} promo={promo} event={found.event} claims={claims} settings={settings} saveClaim={saveClaim}
          lang={lang} navigate={navigate} onClose={close}
        />
      )}
    </>
  );
}

function PromoDialog({ promo, event, claims, settings, saveClaim, lang, navigate, onClose }) {
  const uid = useId();
  const ref = useRef(null);
  const saved = read(localStorage, spinKey(promo.id));
  const savedPrize = saved && promo.prizes.find(p => p.id === saved.prizeId);
  /* already claimed in this browser: show their voucher again (the saved claim, or what
     this browser kept of it) */
  const mine = read(localStorage, claimKey(promo.id));
  const kept = mine && (claims.find(c => c.voucher === mine.voucher) || (mine.prizeLabel ? mine : null));
  const [stage, setStage] = useState(kept ? 'claimed' : savedPrize ? 'won' : 'intro');
  const [prize, setPrize] = useState(savedPrize || null);
  const [returning] = useState(!!savedPrize);
  const [rotation, setRotation] = useState(() => (savedPrize ? landingAngle(wheelSlices(promo.prizes), savedPrize.id, 0.5) : 0));
  const [spinning, setSpinning] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [claim, setClaim] = useState(kept || null);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const headingId = `${uid}-heading`;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => { clearTimeout(timer.current); if (d?.open) d.close(); };
  }, []);

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
    timer.current = setTimeout(() => { setSpinning(false); setStage('won'); }, SPIN_MS);
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
      write(localStorage, claimKey(promo.id), { voucher: c.voucher, prizeLabel: c.prizeLabel, claimedAt: c.claimedAt });
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
  const winnerId = stage === 'claimed' ? (claim?.prizeId || prize?.id) : prize?.id;

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

  const voucherLine = () => {
    const status = voucherStatus(claim, new Date());
    if (status === 'redeemed') return <p className={styles.ticketNote}>{t(lang, 'promo.used', { date: longDate(new Date(claim.redeemedAt)) })}</p>;
    if (status === 'expired') return <p className={`${styles.ticketNote} ${styles.ticketExpired}`}>{t(lang, 'promo.expired', { date: longDate(voucherExpires(claim)) })}</p>;
    return <p className={styles.ticketNote}>{t(lang, 'promo.valid', { date: longDate(voucherExpires(claim)) })}</p>;
  };

  return (
    <dialog
      ref={ref}
      className={styles.promoDialog}
      aria-labelledby={headingId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className={styles.promoHero}>
        <button type="button" className={styles.promoClose} onClick={onClose} aria-label={t(lang, 'common.close')}>
          <X size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        {event?.name && <p className={styles.promoTag}>{event.name}</p>}
        <h2 id={headingId} className={styles.promoHeading}>{t(lang, 'promo.heading')}</h2>
        <div className={styles.promoWheel}>
          <Wheel prizes={promo.prizes} rotation={rotation} spinning={spinning} winnerId={stage === 'intro' ? null : winnerId} />
        </div>
      </div>

      {/* a new step fades in under the wheel; the key restarts the fade */}
      <div className={styles.promoBody} key={stage === 'spinning' ? 'intro' : stage}>
        {(stage === 'intro' || stage === 'spinning') && (
          <>
            <p className={styles.promoLead}>{t(lang, 'promo.lead')}</p>
            <button type="button" className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={spin} disabled={stage === 'spinning'}>
              {t(lang, stage === 'spinning' ? 'promo.spinning' : 'promo.spin')}
            </button>
            <button type="button" className={styles.promoSkip} onClick={onClose} disabled={stage === 'spinning'}>{t(lang, 'promo.noThanks')}</button>
            <details className={styles.promoOdds}>
              <summary>{t(lang, 'promo.odds')}</summary>
              <ul>
                {promo.prizes.map((p, i) => (
                  <li key={p.id}>
                    <span className={styles.promoSwatch} style={{ background: sliceFill(i, promo.prizes.length) }} aria-hidden="true" />
                    <span>{p.label}</span>
                    <strong>{Number(p.chance)}%</strong>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}

        {stage === 'won' && prize && (
          <>
            <div className={styles.promoWin} aria-live="polite">
              <p className={styles.promoWinTag}>{t(lang, returning ? 'promo.waiting' : 'promo.youWon')}</p>
              <p className={styles.promoWinPrize}>{prize.label}</p>
            </div>
            <form className={styles.formGrid} onSubmit={submit} noValidate>
              <p className={styles.muted}>{t(lang, 'promo.claimHint')}</p>
              {field('name', t(lang, 'promo.name'), { autoComplete: 'name' })}
              {field('email', t(lang, 'promo.email'), { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'ana@gmail.com' })}
              {errors.form && <p className={styles.error} role="alert">{errors.form}</p>}
              <button type="submit" className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>{t(lang, 'promo.claim')}</button>
              <button type="button" className={styles.promoSkip} onClick={onClose}>{t(lang, 'promo.later')}</button>
            </form>
          </>
        )}

        {stage === 'claimed' && claim && (
          <>
            {/* the voucher as a tear-off ticket: what you won above, the code on the stub */}
            <div className={styles.ticket}>
              <div className={styles.ticketMain}>
                <p className={styles.ticketLabel}>{t(lang, 'promo.voucher')}</p>
                <p className={styles.ticketPrize}>{claim.prizeLabel}</p>
                {voucherLine()}
              </div>
              <div className={styles.ticketStub}>
                <p className={styles.ticketCode}>{claim.voucher}</p>
                <button type="button" className={styles.ticketCopy} onClick={copy}>
                  {copied ? <Check size={16} strokeWidth={2.25} aria-hidden="true" /> : <Copy size={16} strokeWidth={2} aria-hidden="true" />}
                  {t(lang, copied ? 'promo.copied' : 'promo.copy')}
                </button>
              </div>
            </div>
            <p className={styles.promoLead}>{t(lang, 'promo.show', { shop: settings.shopName })}</p>
            <button type="button" className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={onClose}>{t(lang, 'promo.done')}</button>
          </>
        )}

        <p className={styles.promoSmall}>
          {promo.permit ? t(lang, 'promo.permit', { permit: promo.permit }) : t(lang, 'promo.sample')}{' '}
          {t(lang, 'promo.rules', { days: VOUCHER_DAYS })}{' '}
          <a href="/showroom/terms" onClick={goTerms}>{t(lang, 'legal.terms')}</a>
        </p>
      </div>
    </dialog>
  );
}
