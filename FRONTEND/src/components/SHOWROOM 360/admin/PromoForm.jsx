import { useRef, useState } from 'react';
import { ChevronLeft, Plus, X, SearchX } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom, newId } from '../store.js';
import { useNav, Link, useToast, adminSaveError } from '../ui.jsx';
import { validatePromo, newCode, MIN_PRIZES, MAX_PRIZES } from '../promoRules.js';
import { toLocalInput, fromLocalInput } from './EventForm.jsx';
import Wheel from '../public/Wheel.jsx';

/* Superadmin only (Admin.jsx routes the admin away). A prize wheel: its dates, its DTI
   permit, and 2 to 8 prizes whose chances add up to 100%. */

function blankPromo() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 864e5);
  end.setHours(23, 59, 0, 0);
  return {
    name: '', permit: '', startsAt: start.toISOString(), endsAt: end.toISOString(),
    prizes: [{ id: newId('prize'), label: '', chance: 50 }, { id: newId('prize'), label: '', chance: 50 }],
  };
}

const EXAMPLES = ['₱5,000 off', 'Full tank of gas', 'Free tint', '₱10,000 off', 'Free dashcam', 'Free seat covers', 'Free car wash', 'Free change oil'];

export default function PromoForm({ id }) {
  const { promos, savePromo } = useShowroom();
  const { navigate } = useNav();
  const toast = useToast();
  const isNew = id === 'new';
  const original = isNew ? null : promos.find(p => p.id === id);
  const [form, setForm] = useState(() => {
    const src = original || blankPromo();
    return {
      name: src.name, permit: src.permit || '',
      start: toLocalInput(src.startsAt), end: toLocalInput(src.endsAt),
      prizes: src.prizes.map(p => ({ id: p.id, label: p.label, chance: String(p.chance) })),
    };
  });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  if (!isNew && !original) {
    return (
      <div className={s.empty}>
        <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
        <h1>This promo no longer exists.</h1>
        <Link to="/showroom/admin/promos" className={s.btnPrimary}>Back to promos</Link>
      </div>
    );
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setPrize = (i, patch) => setForm(f => ({ ...f, prizes: f.prizes.map((p, k) => (k === i ? { ...p, ...patch } : p)) }));
  const removePrize = (i) => setForm(f => ({ ...f, prizes: f.prizes.filter((_, k) => k !== i) }));
  const addPrize = () => setForm(f => ({ ...f, prizes: [...f.prizes, { id: newId('prize'), label: '', chance: '' }] }));
  const total = Math.round(form.prizes.reduce((n, p) => n + (Number(p.chance) || 0), 0) * 100) / 100;
  const preview = form.prizes.map(p => ({ ...p, chance: Number(p.chance) || 0 }));

  const submit = async (e) => {
    e.preventDefault();
    const promo = {
      ...(original || { id: newId('promo'), code: newCode('SPIN', promos.map(p => p.code)), createdAt: new Date().toISOString() }),
      name: form.name.trim(),
      permit: form.permit.trim(),
      startsAt: fromLocalInput(form.start),
      endsAt: fromLocalInput(form.end),
      prizes: form.prizes.map(p => ({ id: p.id, label: p.label.trim(), chance: Number(p.chance) || 0 })),
    };
    const errs = validatePromo(promo);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = ['name', 'startsAt', 'endsAt', 'prizes'].find(k => errs[k]);
      formRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
      toast('Some details need fixing.');
      return;
    }
    try {
      await savePromo(promo);
      toast(isNew ? `“${promo.name}” created. Its promo code is ${promo.code}.` : `“${promo.name}” saved.`);
      navigate('/showroom/admin/promos');
    } catch (err) {
      toast(adminSaveError(err));
    }
  };

  const err = (k) => ({
    'aria-invalid': errors[k] ? 'true' : undefined,
    'aria-describedby': errors[k] ? `pf-${k}-err` : undefined,
  });

  return (
    <form ref={formRef} className={a.page} onSubmit={submit} noValidate>
      <Link to="/showroom/admin/promos" className={s.crumb}><ChevronLeft size={18} aria-hidden="true" />Promos</Link>
      <div className={a.pageHead}>
        <h1 className={s.h1}>{original ? original.name : 'New promo'}</h1>
        {original && <span className={a.count}>{original.code}</span>}
      </div>

      <fieldset className={a.fieldset}>
        <legend>Promo</legend>
        <div className={a.formCols}>
          <div className={`${s.field} ${a.wide}`}>
            <label htmlFor="pf-name" className={s.fieldLabel}>Name</label>
            <input id="pf-name" data-field="name" className={s.input} placeholder="Christmas Spin" value={form.name} onChange={set('name')} {...err('name')} />
            {errors.name && <p className={s.error} id="pf-name-err">{errors.name}</p>}
          </div>
          <div className={s.field}>
            <label htmlFor="pf-start" className={s.fieldLabel}>Starts</label>
            <input id="pf-start" data-field="startsAt" type="datetime-local" className={s.input} value={form.start} onChange={set('start')} {...err('startsAt')} />
            {errors.startsAt && <p className={s.error} id="pf-startsAt-err">{errors.startsAt}</p>}
          </div>
          <div className={s.field}>
            <label htmlFor="pf-end" className={s.fieldLabel}>Ends</label>
            <input id="pf-end" data-field="endsAt" type="datetime-local" className={s.input} value={form.end} onChange={set('end')} {...err('endsAt')} />
            {errors.endsAt && <p className={s.error} id="pf-endsAt-err">{errors.endsAt}</p>}
          </div>
          <div className={`${s.field} ${a.wide}`}>
            <label htmlFor="pf-permit" className={s.fieldLabel}>DTI permit no. (optional)</label>
            <input id="pf-permit" className={s.input} placeholder="FTEB-123456 Series of 2026" value={form.permit} onChange={set('permit')} />
            <p className={s.hint}>A sales promo with prizes won by chance needs a DTI permit. Buyers see this number in the small print. Left blank, the wheel says it is a sample promo.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Prizes <span className={a.legendNote}>{form.prizes.length} of {MAX_PRIZES}</span></legend>
        <p className={s.hint}>Each prize gets a slice of the wheel. The chance is how often it is won: keep the costly prizes rare.</p>
        {errors.prizes && <p className={s.error} role="alert" tabIndex={-1} data-field="prizes">{errors.prizes}</p>}
        <div className={a.promoEditor}>
          <ul className={a.itemList}>
            {form.prizes.map((p, i) => (
              <li key={p.id} className={`${a.itemRow} ${a.prizeRow}`}>
                <div className={s.field}>
                  <label htmlFor={`pf-label-${i}`} className={s.fieldLabel}>Prize {i + 1}</label>
                  <input id={`pf-label-${i}`} className={s.input} placeholder={EXAMPLES[i % EXAMPLES.length]} value={p.label}
                    onChange={(e) => setPrize(i, { label: e.target.value })} />
                </div>
                <div className={s.field}>
                  <label htmlFor={`pf-chance-${i}`} className={s.fieldLabel}>Chance (%)</label>
                  <input id={`pf-chance-${i}`} className={s.input} inputMode="decimal" value={p.chance}
                    onChange={(e) => setPrize(i, { chance: e.target.value.replace(/[^\d.]/g, '') })} />
                </div>
                {form.prizes.length > MIN_PRIZES && (
                  <button type="button" className={`${s.iconBtn} ${a.itemRemove}`} aria-label={`Remove prize ${i + 1}`} onClick={() => removePrize(i)}>
                    <X size={20} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className={a.promoPreview} aria-hidden="true">
            <Wheel prizes={preview} rotation={0} />
          </div>
        </div>
        <p className={`${a.chanceTotal} ${total === 100 ? '' : a.chanceOff}`} aria-live="polite">
          Total: {total}%{total === 100 ? '' : ' · must add up to 100%'}
        </p>
        {form.prizes.length < MAX_PRIZES && (
          <button type="button" className={s.btnGhost} onClick={addPrize}><Plus size={18} aria-hidden="true" />Add a prize</button>
        )}
      </fieldset>

      <div className={a.saveBar} data-savebar="">
        <Link to="/showroom/admin/promos" className={s.btnGhost}>Cancel</Link>
        <button type="submit" className={s.btnPrimary}>{isNew ? 'Create promo' : 'Save changes'}</button>
      </div>
    </form>
  );
}
