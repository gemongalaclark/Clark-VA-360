import { useRef, useState } from 'react';
import { ChevronLeft, Plus, X, SearchX, Gift } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom, newId } from '../store.js';
import { useNav, Link, useToast, adminSaveError } from '../ui.jsx';
import { validateEvent, carTitle, formatPeso, canManagePromos } from '../showroomRules.js';
import { findPromoByCode, promoStatus } from '../promoRules.js';

const pad = (n) => String(n).padStart(2, '0');
/* <input type="datetime-local"> works in local time; the data is stored as ISO */
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : '';
};

function blankEvent() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 14 * 864e5);
  end.setHours(23, 59, 0, 0);
  return { name: '', tagline: '', startsAt: start.toISOString(), endsAt: end.toISOString(), items: [] };
}

export default function EventForm({ id, role }) {
  const { cars, events, promos, saveEvent } = useShowroom();
  const { navigate } = useNav();
  const toast = useToast();
  const isNew = id === 'new';
  const original = isNew ? null : events.find(e => e.id === id);
  const [form, setForm] = useState(() => {
    const src = original || blankEvent();
    return {
      name: src.name, tagline: src.tagline || '',
      start: toLocalInput(src.startsAt), end: toLocalInput(src.endsAt),
      items: src.items.map(i => ({ carId: i.carId, salePrice: String(i.salePrice) })),
      promoId: src.promoId || null,
    };
  });
  const [errors, setErrors] = useState({});
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const formRef = useRef(null);

  if (!isNew && !original) {
    return (
      <div className={s.empty}>
        <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
        <h1>This event no longer exists.</h1>
        <Link to="/showroom/admin/events" className={s.btnPrimary}>Back to events</Link>
      </div>
    );
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setItem = (i, patch) => setForm(f => ({ ...f, items: f.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, k) => k !== i) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { carId: '', salePrice: '' }] }));

  /* Only the superadmin puts a promo on a sale, by its promo code */
  const managePromos = canManagePromos(role);
  const attached = promos.find(p => p.id === form.promoId) || null;
  const eventEnded = Date.parse(fromLocalInput(form.end)) <= Date.now();
  const addPromo = () => {
    const found = findPromoByCode(promos, promoCode);
    if (!found) { setPromoError('No promo has that code. Copy it from the Promos page.'); return; }
    if (promoStatus(found, new Date()) === 'ended') { setPromoError(`“${found.name}” has ended. Pick a promo that is live or upcoming.`); return; }
    setPromoError('');
    setPromoCode('');
    setForm(f => ({ ...f, promoId: found.id }));
  };
  const promoWhen = (p) => `${new Date(p.startsAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${new Date(p.endsAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;

  const sellable = cars.filter(c => c.status !== 'sold').sort((x, y) => carTitle(x).localeCompare(carTitle(y)));

  const submit = async (e) => {
    e.preventDefault();
    const ev = {
      ...(original || { id: newId('event') }),
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      startsAt: fromLocalInput(form.start),
      endsAt: fromLocalInput(form.end),
      items: form.items.filter(i => i.carId).map(i => ({ carId: i.carId, salePrice: Number(i.salePrice) || 0 })),
      promoId: form.promoId || null,
    };
    const errs = validateEvent(ev, events, cars);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = ['name', 'startsAt', 'endsAt', 'items'].find(k => errs[k]);
      formRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
      toast('Some details need fixing.');
      return;
    }
    try {
      await saveEvent(ev);
      toast(`“${ev.name}” saved.`);
      navigate('/showroom/admin/events');
    } catch (err) {
      toast(adminSaveError(err));
    }
  };

  return (
    <form ref={formRef} className={a.page} onSubmit={submit} noValidate>
      <Link to="/showroom/admin/events" className={s.crumb}><ChevronLeft size={18} aria-hidden="true" />Events</Link>
      <div className={a.pageHead}>
        <h1 className={s.h1}>{original ? original.name : 'New event'}</h1>
      </div>

      <fieldset className={a.fieldset}>
        <legend>Event</legend>
        <div className={a.formCols}>
          <div className={`${s.field} ${a.wide}`}>
            <label htmlFor="ef-name" className={s.fieldLabel}>Name</label>
            <input id="ef-name" data-field="name" className={s.input} placeholder="Christmas Sale" value={form.name} onChange={set('name')}
              aria-invalid={errors.name ? 'true' : undefined} aria-describedby={errors.name ? 'ef-name-err' : undefined} />
            {errors.name && <p className={s.error} id="ef-name-err">{errors.name}</p>}
          </div>
          <div className={`${s.field} ${a.wide}`}>
            <label htmlFor="ef-tagline" className={s.fieldLabel}>Tagline</label>
            <input id="ef-tagline" className={s.input} placeholder="Year-end prices on selected units" value={form.tagline} onChange={set('tagline')} />
          </div>
          <div className={s.field}>
            <label htmlFor="ef-start" className={s.fieldLabel}>Starts</label>
            <input id="ef-start" data-field="startsAt" type="datetime-local" className={s.input} value={form.start} onChange={set('start')}
              aria-invalid={errors.startsAt ? 'true' : undefined} aria-describedby={errors.startsAt ? 'ef-start-err' : undefined} />
            {errors.startsAt && <p className={s.error} id="ef-start-err">{errors.startsAt}</p>}
          </div>
          <div className={s.field}>
            <label htmlFor="ef-end" className={s.fieldLabel}>Ends</label>
            <input id="ef-end" data-field="endsAt" type="datetime-local" className={s.input} value={form.end} onChange={set('end')}
              aria-invalid={errors.endsAt ? 'true' : undefined} aria-describedby={errors.endsAt ? 'ef-end-err' : undefined} />
            {errors.endsAt && <p className={s.error} id="ef-end-err">{errors.endsAt}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Cars on sale <span className={a.legendNote}>{form.items.filter(i => i.carId).length}</span></legend>
        {errors.items && <p className={s.error} role="alert" tabIndex={-1} data-field="items">{errors.items}</p>}
        {form.items.length === 0 && <p className={s.hint}>Add the units you want to discount for this event.</p>}
        <ul className={a.itemList}>
          {form.items.map((it, i) => {
            const car = cars.find(c => c.id === it.carId);
            const taken = new Set(form.items.filter((_, k) => k !== i).map(x => x.carId));
            const sale = Number(it.salePrice);
            const off = car && sale > 0 && sale < car.price ? Math.round((1 - sale / car.price) * 100) : null;
            return (
              <li key={i} className={a.itemRow}>
                <div className={s.field}>
                  <label htmlFor={`ef-car-${i}`} className={s.fieldLabel}>Car</label>
                  <select id={`ef-car-${i}`} className={s.select} value={it.carId} onChange={(e) => setItem(i, { carId: e.target.value })}>
                    <option value="">Choose a car…</option>
                    {/* a car sold after it joined the event still shows, so the row isn't silently blank */}
                    {[...sellable, ...(car && car.status === 'sold' ? [car] : [])].filter(c => !taken.has(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.stockNo} · {carTitle(c)} · {formatPeso(c.price)}{c.status === 'sold' ? ' (sold)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className={s.field}>
                  <label htmlFor={`ef-price-${i}`} className={s.fieldLabel}>Sale price (₱)</label>
                  <input id={`ef-price-${i}`} className={s.input} inputMode="numeric" value={it.salePrice}
                    onChange={(e) => setItem(i, { salePrice: e.target.value.replace(/\D/g, '') })} />
                  {car && <p className={s.hint}>Cash price {formatPeso(car.price)}{off !== null ? ` · ${off}% off` : ''}</p>}
                </div>
                <button type="button" className={`${s.iconBtn} ${a.itemRemove}`} aria-label={`Remove car ${i + 1}`} onClick={() => removeItem(i)}>
                  <X size={20} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className={s.btnGhost} onClick={addItem}><Plus size={18} aria-hidden="true" />Add a car</button>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Promo wheel</legend>
        {attached ? (
          <div className={a.promoOn}>
            <p><Gift size={16} aria-hidden="true" className={a.rowIconRed} /> <strong>{attached.name}</strong> · {attached.code}</p>
            <p className={s.muted}>{promoWhen(attached)} · {promoStatus(attached, new Date()) === 'live' ? 'live now' : promoStatus(attached, new Date())}. While this sale and the promo are both live, buyers see a gift button on the home page that opens the wheel.</p>
            {managePromos && (
              <button type="button" className={s.textBtn} onClick={() => setForm(f => ({ ...f, promoId: null }))}>Remove promo</button>
            )}
          </div>
        ) : managePromos ? (
          eventEnded ? (
            <p className={s.hint}>This event has ended, so a promo can’t be added.</p>
          ) : (
            <>
              <p className={s.hint}>Type the promo code from the Promos page, e.g. SPIN-XMAS. The change is saved with the event.</p>
              <div className={a.promoAttach}>
                <div className={s.field}>
                  <label htmlFor="ef-promo" className={s.srOnly}>Promo code</label>
                  <input id="ef-promo" className={s.input} placeholder="SPIN-XXXX" autoCapitalize="characters" autoComplete="off"
                    value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPromo(); } }}
                    aria-invalid={promoError ? 'true' : undefined} aria-describedby={promoError ? 'ef-promo-err' : undefined} />
                  {promoError && <p className={s.error} id="ef-promo-err">{promoError}</p>}
                </div>
                <button type="button" className={s.btnGhost} onClick={addPromo}>Add promo</button>
              </div>
            </>
          )
        ) : (
          <p className={s.hint}>No promo on this event. The superadmin can add one.</p>
        )}
      </fieldset>

      <div className={a.saveBar} data-savebar="">
        <Link to="/showroom/admin/events" className={s.btnGhost}>Cancel</Link>
        <button type="submit" className={s.btnPrimary}>{isNew ? 'Create event' : 'Save changes'}</button>
      </div>
    </form>
  );
}
