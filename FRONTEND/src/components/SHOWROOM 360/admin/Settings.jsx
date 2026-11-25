/* Settings = pitch mode. Type a prospect's shop name, logo, numbers and map pin
   and the public site becomes theirs. Also financing figures, both PINs and Reset.
   Only the superadmin can open this page. */
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, RotateCcw } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, Sheet, useToast, ShopLogo, adminSaveError, Link } from '../ui.jsx';
import { isPhMobile, loanTerms, saveErrorKind, formatPeso, REFUND_RULES, DEFAULT_RESERVATION } from '../showroomRules.js';
import { pinFromMapsLink } from '../../CARMARK 360/carmarkRules.js';

const TEXT_FIELDS = ['shopName', 'tagline', 'about', 'phone', 'messenger', 'viber', 'address', 'mapsUrl', 'hours', 'pin', 'superPin', 'dtiNo', 'permitNo'];

const toForm = (st) => ({
  ...Object.fromEntries(TEXT_FIELDS.map(k => [k, st[k] ?? ''])),
  lat: st.lat ?? '', lng: st.lng ?? '',
  logoPhotoId: st.logoPhotoId || null,
  minDownPct: String(st.financing.minDownPct),
  feesPct: String(st.financing.feesPct),
  addOn: Object.fromEntries(loanTerms(st.financing).map(t => [t, String(st.financing.addOn[t])])),
  ruleOn: !!st.priceRule?.on,
  ruleDays: String(st.priceRule?.days ?? 45),
  rulePct: String(st.priceRule?.pct ?? 3),
  since: st.since ? String(st.since) : '',
  watermark: st.watermark !== false,
  resFee: String(st.reservation?.fee ?? DEFAULT_RESERVATION.fee),
  resDays: String(st.reservation?.days ?? DEFAULT_RESERVATION.days),
  resRefund: st.reservation?.refund || DEFAULT_RESERVATION.refund,
});

function validate(f) {
  const e = {};
  const inRange = (v, lo, hi) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi;
  if (!f.shopName.trim()) e.shopName = 'Enter the shop name.';
  if (f.viber.trim() && !isPhMobile(f.viber)) e.viber = 'Enter a PH mobile number, e.g. 0917 123 4567.';
  if (!/^\d{4,8}$/.test(f.pin)) e.pin = 'Use 4 to 8 digits.';
  if (!/^\d{4,8}$/.test(f.superPin)) e.superPin = 'Use 4 to 8 digits.';
  else if (f.superPin === f.pin) e.superPin = 'Must be different from the admin PIN.';
  if ((f.lat !== '' || f.lng !== '') && !(inRange(f.lat, -90, 90) && inRange(f.lng, -180, 180))) e.lat = 'Enter both latitude and longitude, or leave both empty.';
  if (!inRange(f.minDownPct, 0, 90)) e.minDownPct = 'Between 0 and 90.';
  if (!inRange(f.feesPct, 0, 30)) e.feesPct = 'Between 0 and 30.';
  if (Object.values(f.addOn).some(v => !inRange(v, 0, 100))) e.addOn = 'Each rate must be between 0 and 100.';
  if (f.ruleOn && !(inRange(f.ruleDays, 1, 365) && Number.isInteger(Number(f.ruleDays)))) e.ruleDays = 'Whole days, from 1 to 365.';
  if (f.ruleOn && !inRange(f.rulePct, 1, 20)) e.rulePct = 'Between 1 and 20.';
  if (f.since !== '' && !(Number.isInteger(Number(f.since)) && inRange(f.since, 1950, new Date().getFullYear()))) e.since = 'A year, like 2014.';
  if (!(Number.isInteger(Number(f.resFee)) && inRange(f.resFee, 0, 1000000))) e.resFee = 'Whole pesos, up to ₱1,000,000.';
  if (!(Number.isInteger(Number(f.resDays)) && inRange(f.resDays, 1, 60))) e.resDays = 'Whole days, from 1 to 60.';
  return e;
}

export default function Settings() {
  const { settings, saveSettings, addPhoto, removePhotos, resetDemo } = useShowroom();
  const { navigate } = useNav();
  const toast = useToast();
  const [form, setForm] = useState(() => toForm(settings));
  const [errors, setErrors] = useState({});
  const [pinNote, setPinNote] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [logoError, setLogoError] = useState('');
  const addedLogo = useRef(null);
  const saved = useRef(false);

  useEffect(() => () => {
    if (!saved.current && addedLogo.current) removePhotos([addedLogo.current]);
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const onMapsUrl = (e) => {
    const url = e.target.value;
    const pin = url.includes('google') ? pinFromMapsLink(url) : null;
    setForm(f => ({ ...f, mapsUrl: url, ...(pin ? { lat: String(pin.lat), lng: String(pin.lng) } : {}) }));
    setPinNote(pin ? 'Map pin taken from the link.' : /goo\.gl/.test(url) ? 'Short links don’t carry the location. Open it, then copy the long link from the address bar, or type the coordinates.' : '');
  };

  const onLogo = async (file) => {
    if (!file) return;
    setLogoError('');
    try {
      const pid = await addPhoto(file, 512);
      if (addedLogo.current) removePhotos([addedLogo.current]);
      addedLogo.current = pid;
      saved.current = false; /* a new, unsaved logo: clean it up if the page is left */
      setForm(f => ({ ...f, logoPhotoId: pid }));
    } catch (err) {
      setLogoError(saveErrorKind(err) === 'unreadable' ? 'That image could not be read. Use JPG or PNG.' : adminSaveError(err));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { toast('Some settings need fixing.'); return; }
    const next = {
      ...settings,
      ...Object.fromEntries(TEXT_FIELDS.map(k => [k, String(form[k]).trim()])),
      lat: form.lat === '' ? null : Number(form.lat),
      lng: form.lng === '' ? null : Number(form.lng),
      logoPhotoId: form.logoPhotoId,
      financing: {
        minDownPct: Number(form.minDownPct),
        feesPct: Number(form.feesPct),
        addOn: Object.fromEntries(Object.entries(form.addOn).map(([t, v]) => [t, Number(v)])),
      },
      /* switched off, the last good numbers are kept for next time */
      priceRule: form.ruleOn
        ? { on: true, days: Number(form.ruleDays), pct: Number(form.rulePct) }
        : { ...settings.priceRule, on: false },
      since: form.since === '' ? '' : Number(form.since),
      watermark: form.watermark,
      reservation: { fee: Number(form.resFee), days: Number(form.resDays), refund: form.resRefund },
    };
    try {
      await saveSettings(next);
      const unused = [settings.logoPhotoId, addedLogo.current].filter(pid => pid && pid !== next.logoPhotoId);
      if (unused.length) await removePhotos(unused);
      saved.current = true;
      addedLogo.current = null;
      toast('Settings saved. The public site is updated.');
    } catch (err) {
      toast(adminSaveError(err));
    }
  };

  const doReset = async () => {
    setConfirmReset(false);
    saved.current = true;
    await resetDemo();
    toast('Demo data reset.');
    navigate('/showroom/admin');
  };

  const field = (name, label, input, { hint, wide } = {}) => (
    <div className={`${s.field} ${wide ? a.wide : ''}`}>
      <label htmlFor={`st-${name}`} className={s.fieldLabel}>{label}</label>
      {input}
      {hint && <p className={s.hint}>{hint}</p>}
      {errors[name] && <p className={s.error} id={`st-${name}-err`}>{errors[name]}</p>}
    </div>
  );
  const text = (name, props = {}) => (
    <input id={`st-${name}`} className={s.input} value={form[name]} onChange={set(name)}
      aria-invalid={errors[name] ? 'true' : undefined} aria-describedby={errors[name] ? `st-${name}-err` : undefined} {...props} />
  );

  return (
    <form className={a.page} onSubmit={submit} noValidate>
      <div className={a.pageHead}>
        <h1 className={s.h1}>Settings</h1>
      </div>
      <p className={`${s.muted} ${a.intro}`}>
        Everything here shows on the public site. Change the name, logo and numbers to make it a prospect’s own shop.
        Agents and their commissions are on the <Link to="/showroom/admin/agents" className={a.inlineLink}>Agents</Link> page.
      </p>

      <fieldset className={a.fieldset}>
        <legend>Shop</legend>
        <div className={a.logoRow}>
          <ShopLogo settings={{ shopName: form.shopName, logoPhotoId: form.logoPhotoId }} size="lg" />
          <label className={s.btnGhost}>
            <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />{form.logoPhotoId ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/*" className={s.srOnly} onChange={(e) => { onLogo(e.target.files[0]); e.target.value = ''; }} />
          </label>
          {form.logoPhotoId && (
            <button type="button" className={s.iconBtn} aria-label="Remove logo" onClick={() => setForm(f => ({ ...f, logoPhotoId: null }))}>
              <Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
        {logoError && <p className={s.error} role="alert">{logoError}</p>}
        <div className={a.formCols}>
          {field('shopName', 'Shop name', text('shopName'), { wide: true })}
          {field('tagline', 'Tagline', text('tagline'), { wide: true })}
          {field('about', 'About the shop',
            <textarea id="st-about" className={s.textarea} rows={4} value={form.about} onChange={set('about')} />, { wide: true })}
          {field('phone', 'Phone', text('phone', { type: 'tel', inputMode: 'tel' }), { hint: 'For Call buttons. Mobile or landline.' })}
          {field('hours', 'Opening hours', text('hours'))}
          {field('messenger', 'Messenger page', text('messenger', { placeholder: 'yourpage or m.me/yourpage' }), { hint: 'The Facebook page name buyers message.' })}
          {field('viber', 'Viber number', text('viber', { type: 'tel', inputMode: 'tel', placeholder: '0917 123 4567' }))}
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Registered business</legend>
        <p className={s.hint}>Shown under About on the home page, so buyers can see the shop is legit. Leave a line empty to hide it.</p>
        <div className={a.formCols}>
          {field('dtiNo', 'DTI business name no.', text('dtiNo'))}
          {field('permitNo', 'Mayor’s permit no.', text('permitNo'))}
          {field('since', 'In business since (year)', text('since', { inputMode: 'numeric', maxLength: 4, placeholder: '2014' }))}
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Car photos</legend>
        <label className={s.checkRow}>
          <input type="checkbox" checked={form.watermark} onChange={(e) => setForm(f => ({ ...f, watermark: e.target.checked }))} />
          <span>Watermark new car photos</span>
        </label>
        <p className={s.hint}>Writes the shop name and phone in the corner of each photo you add, so a photo reposted elsewhere still points buyers to this shop. Photos already added stay as they are.</p>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Location</legend>
        <div className={a.formCols}>
          {field('address', 'Address', text('address'), { wide: true })}
          {field('mapsUrl', 'Google Maps link',
            <input id="st-mapsUrl" className={s.input} value={form.mapsUrl} onChange={onMapsUrl} placeholder="https://www.google.com/maps/place/…" />,
            { wide: true, hint: pinNote || 'Paste the long link from Google Maps and the map pin is filled in.' })}
          {field('lat', 'Latitude', text('lat', { inputMode: 'decimal' }))}
          {field('lng', 'Longitude', text('lng', { inputMode: 'decimal' }))}
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Financing</legend>
        <p className={s.hint}>Used for the monthly payment on every car. Sample figures: most banks ask 30% down on used cars; the add-on rates scale BPI’s published 60-month used-car rate. Set the dealer’s own bank figures.</p>
        <div className={a.formCols}>
          {field('minDownPct', 'Minimum downpayment (%)', text('minDownPct', { inputMode: 'decimal' }))}
          {field('feesPct', 'All-in fees (% of price)', text('feesPct', { inputMode: 'decimal' }), { hint: 'Insurance, transfer and bank fees on top of the downpayment.' })}
        </div>
        <div className={a.rateGrid} role="group" aria-labelledby="st-rates">
          <p id="st-rates" className={s.fieldLabel}>Total add-on rate by term (%)</p>
          {Object.keys(form.addOn).map(term => (
            <label key={term} className={s.field}>
              <span className={s.hint}>{term} months</span>
              <input className={s.input} inputMode="decimal" value={form.addOn[term]}
                onChange={(e) => setForm(f => ({ ...f, addOn: { ...f.addOn, [term]: e.target.value } }))} />
            </label>
          ))}
        </div>
        {errors.addOn && <p className={s.error}>{errors.addOn}</p>}
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Reservations</legend>
        <p className={s.hint}>Shown to buyers when they reserve. A reserved car goes back on sale by itself after its last day, and the to-do list warns you two days before.</p>
        <div className={a.formCols}>
          {field('resFee', 'Reservation fee (₱)', text('resFee', { inputMode: 'numeric' }), { hint: form.resFee ? formatPeso(form.resFee) : undefined })}
          {field('resDays', 'Days the car is held', text('resDays', { inputMode: 'numeric', maxLength: 2 }))}
          {field('resRefund', 'Refund',
            <select id="st-resRefund" className={s.select} value={form.resRefund} onChange={set('resRefund')}>
              {Object.entries(REFUND_RULES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>, { wide: true })}
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Price-drop rule</legend>
        <p className={s.hint}>Cars that sit too long show up on the dashboard’s to-do list with a lower price to apply or skip. Nothing changes until someone taps it. Cars in a sale are left alone.</p>
        <label className={s.checkRow}>
          <input type="checkbox" checked={form.ruleOn} onChange={(e) => setForm(f => ({ ...f, ruleOn: e.target.checked }))} />
          <span>Suggest price drops</span>
        </label>
        {form.ruleOn && (
          <div className={a.formCols}>
            {field('ruleDays', 'After this many days in stock', text('ruleDays', { inputMode: 'numeric' }))}
            {field('rulePct', 'Suggest this much off (%)', text('rulePct', { inputMode: 'decimal' }), { hint: 'Rounded down to the nearest ₱1,000.' })}
          </div>
        )}
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>PINs</legend>
        <p className={s.hint}>Both sign in on the same page. The admin manages cars, events and leads; the superadmin can also open Settings and History. A demo lock, not real security.</p>
        <div className={a.formCols}>
          {field('pin', 'Admin PIN', text('pin', { inputMode: 'numeric', maxLength: 8, autoComplete: 'off' }))}
          {field('superPin', 'Superadmin PIN', text('superPin', { inputMode: 'numeric', maxLength: 8, autoComplete: 'off' }))}
        </div>
      </fieldset>

      <fieldset className={`${a.fieldset} ${a.dangerZone}`}>
        <legend>Reset</legend>
        <p className={s.hint}>Puts back the sample shop, cars and Christmas Sale, and deletes every car, photo, event and lead saved in this browser.</p>
        <button type="button" className={s.btnGhost} onClick={() => setConfirmReset(true)}>
          <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />Reset demo data
        </button>
      </fieldset>

      <div className={a.saveBar} data-savebar="">
        <button type="button" className={s.btnGhost} onClick={() => { setForm(toForm(settings)); setErrors({}); }}>Undo changes</button>
        <button type="submit" className={s.btnPrimary}>Save settings</button>
      </div>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all demo data?">
        <div className={s.formGrid}>
          <p className={s.muted}>Everything saved in this browser is replaced by the sample shop. This can’t be undone.</p>
          <div className={s.sheetActions}>
            <button type="button" className={s.btnGhost} onClick={() => setConfirmReset(false)}>Cancel</button>
            <button type="button" className={`${s.btnPrimary} ${a.danger}`} onClick={doReset}>Reset</button>
          </div>
        </div>
      </Sheet>
    </form>
  );
}
