/* Add / edit one car. Sections follow how Cebu dealers list a unit:
   basics, price, consignment, papers, condition, inspection, photos, listing,
   and once it's sold: the sale, the papers after it, and the buyer's review. */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ImagePlus, ArrowLeft, ArrowRight, Trash2, SearchX } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom, newId } from '../store.js';
import { useNav, Link, useToast, CarPhoto, adminSaveError } from '../ui.jsx';
import {
  saveErrorKind, validateCar, nextStockNo, carTitle, formatPeso, COLORS, BODY_TYPES, TRANSMISSIONS, FUELS, DRIVES, ORCR, OWNERS, TRI,
  isPhMobile, reservedUntilFor, INSPECTION, PAPER_STEPS, watermarkLabel, DEFAULT_RESERVATION,
} from '../showroomRules.js';
import { MODELS } from '../../CARMARK 360/carData.js';
import { localISODate } from '../public/LeadForm.jsx';
import { waitingFor } from '../autoRules.js';

const MAX_PHOTOS = 12;
const BLANK = {
  year: '', make: '', model: '', variant: '', body: '', transmission: '', fuel: '', engine: '', drive: '', seats: '',
  odometer: '', color: '', price: '', negotiable: true, financing: true,
  orcr: 'unknown', regUntil: '', owners: 'unknown', plateEnding: '',
  floodFree: 'unknown', accidentFree: 'unknown', casaMaintained: 'unknown', knownIssues: '', description: '',
  status: 'available', featured: false, reservedUntil: '', hpgCleared: '',
};
const INSP_STATES = [['pass', 'Passed'], ['fix', 'Needs work'], ['', 'Not checked']];

/* The buyer of a car being sold: what the dealer last heard from them about it */
function saleFrom(car, leads, agents) {
  if (car?.sale) return { ...car.sale, commission: car.sale.commission ? String(car.sale.commission) : '' };
  const lead = leads.filter(l => l.carId === car?.id && l.type !== 'wish')
    .sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt))[0];
  const agent = agents.find(ag => lead?.agentCode && ag.code === lead.agentCode);
  return {
    buyer: lead?.name || '', mobile: lead?.mobile || '', lang: lead?.lang === 'ceb' ? 'ceb' : 'en',
    agentId: agent?.id || '', commission: agent ? String(agent.rate || '') : '', steps: {}, told: {},
  };
}
const FIELD_ORDER = ['year', 'make', 'model', 'transmission', 'fuel', 'odometer', 'price', 'listedAt'];
const digits = (v) => v.replace(/\D/g, '');

export default function CarForm({ id }) {
  const { cars, leads, events, agents, settings, saveCar, addPhoto, removePhotos } = useShowroom();
  const { navigate, now } = useNav();
  const toast = useToast();
  const isNew = id === 'new';
  const original = isNew ? null : cars.find(c => c.id === id);

  const [form, setForm] = useState(() => {
    const src = original || BLANK;
    return Object.fromEntries(Object.keys(BLANK).map(k => [k, src[k] === null || src[k] === undefined ? '' : (typeof BLANK[k] === 'string' ? String(src[k]) : src[k])]));
  });
  const today = localISODate();
  const originalDate = original ? localISODate(new Date(original.listedAt)) : null;
  /* Editable so a prospect's real stock can show its real days in stock */
  const [listedDate, setListedDate] = useState(originalDate || today);
  const [photoIds, setPhotoIds] = useState(original?.photoIds || []);
  const [insp, setInsp] = useState(() => ({ date: '', by: '', results: {}, notes: {}, ...(original?.inspection || {}) }));
  const [consigned, setConsigned] = useState(!!original?.consign);
  const [consign, setConsign] = useState(() => ({
    owner: '', mobile: '', paidAt: null, ...(original?.consign || {}), net: original?.consign?.net ? String(original.consign.net) : '',
  }));
  const [sale, setSale] = useState(() => saleFrom(original, leads, agents));
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const added = useRef([]);
  const removedOriginal = useRef([]);
  const saved = useRef(false);
  const formRef = useRef(null);

  /* Photos added here but never saved are deleted when leaving the form */
  useEffect(() => () => {
    if (!saved.current && added.current.length) removePhotos(added.current);
  }, []);

  const makes = useMemo(() => [...new Set([...MODELS.map(m => m.make), ...cars.map(c => c.make)])].filter(Boolean).sort(), [cars]);
  const models = useMemo(() => {
    const mk = form.make.trim().toLowerCase();
    const list = [...MODELS.filter(m => m.make.toLowerCase() === mk).map(m => m.name), ...cars.filter(c => c.make.toLowerCase() === mk).map(c => c.model)];
    return [...new Set(list)].sort();
  }, [form.make, cars]);

  if (!isNew && !original) {
    return (
      <div className={s.empty}>
        <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
        <h1>This car no longer exists.</h1>
        <Link to="/showroom/admin/cars" className={s.btnPrimary}>Back to cars</Link>
      </div>
    );
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const on = (k, filter) => (e) => set(k, filter ? filter(e.target.value) : e.target.value);
  /* Reserving fills in how long it's held (Settings → Reservations) */
  const onStatus = (e) => {
    const status = e.target.value;
    setForm(f => ({
      ...f, status,
      reservedUntil: status === 'reserved' && !f.reservedUntil ? reservedUntilFor(today, (settings.reservation || DEFAULT_RESERVATION).days) : f.reservedUntil,
    }));
  };
  const setSaleField = (k) => (e) => setSale(x => ({ ...x, [k]: k === 'commission' ? digits(e.target.value) : e.target.value }));
  const setStep = (step) => (e) => setSale(x => ({ ...x, steps: { ...(x.steps || {}), [step]: e.target.value } }));
  const setReview = (k, v) => setSale(x => ({ ...x, review: { ...(x.review || {}), [k]: v } }));
  const onAgent = (e) => {
    const agent = agents.find(ag => ag.id === e.target.value);
    setSale(x => ({ ...x, agentId: e.target.value, commission: x.commission || (agent?.rate ? String(agent.rate) : '') }));
  };
  const setResult = (id, v) => setInsp(x => ({ ...x, results: { ...x.results, [id]: v } }));
  const addReviewPhoto = async (file) => {
    if (!file) return;
    setPhotoError('');
    try {
      const pid = await addPhoto(file);
      added.current.push(pid);
      /* a release photo added earlier in this visit and now replaced is deleted at once */
      const old = sale.review?.photoId;
      if (old && added.current.includes(old)) { added.current = added.current.filter(x => x !== old); removePhotos([old]); }
      setReview('photoId', pid);
    } catch (err) {
      setPhotoError(saveErrorKind(err) === 'unreadable' ? 'That photo could not be read. Use JPG or PNG.' : adminSaveError(err));
    }
  };

  const addFiles = async (files) => {
    setPhotoError('');
    const room = MAX_PHOTOS - photoIds.length;
    const list = [...files].slice(0, Math.max(0, room));
    if (files.length > room) setPhotoError(`Up to ${MAX_PHOTOS} photos per car.`);
    for (const file of list) {
      setUploading(n => n + 1);
      try {
        const pid = await addPhoto(file, undefined, watermarkLabel(settings));
        added.current.push(pid);
        setPhotoIds(p => [...p, pid]);
      } catch (err) {
        setPhotoError(saveErrorKind(err) === 'unreadable'
          ? 'A photo could not be read. Use JPG or PNG (iPhone: set Camera → Formats → Most Compatible).'
          : adminSaveError(err));
      } finally {
        setUploading(n => n - 1);
      }
    }
  };
  const removePhoto = (pid) => {
    setPhotoIds(p => p.filter(x => x !== pid));
    if (original?.photoIds.includes(pid)) removedOriginal.current.push(pid);
    else { added.current = added.current.filter(x => x !== pid); removePhotos([pid]); }
  };
  const movePhoto = (i, d) => setPhotoIds(p => {
    const next = [...p];
    const j = i + d;
    if (j < 0 || j >= next.length) return p;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    const num = (v) => (String(v).trim() === '' ? '' : Number(v));
    const now = new Date().toISOString();
    const car = {
      ...(original || { id: newId('car'), stockNo: nextStockNo(cars), listedAt: now, soldAt: null }),
      ...form,
      make: form.make.trim(),
      model: form.model.trim(),
      variant: form.variant.trim(),
      engine: form.engine.trim(),
      plateEnding: form.plateEnding.trim(),
      year: num(form.year),
      seats: form.seats === '' ? null : Number(form.seats),
      odometer: num(form.odometer),
      price: num(form.price),
      photoIds,
    };
    car.soldAt = car.status === 'sold' ? (original?.soldAt || now) : null;
    car.reservedUntil = car.status === 'reserved' ? (form.reservedUntil || reservedUntilFor(today, (settings.reservation || DEFAULT_RESERVATION).days)) : null;
    car.hpgCleared = form.hpgCleared || '';
    const results = Object.fromEntries(Object.entries(insp.results).filter(([, v]) => v === 'pass' || v === 'fix'));
    car.inspection = insp.date || Object.keys(results).length
      ? { date: insp.date, by: insp.by.trim(), results, notes: Object.fromEntries(Object.entries(insp.notes).filter(([id, v]) => results[id] === 'fix' && v.trim())) }
      : null;
    car.consign = consigned ? { ...consign, owner: consign.owner.trim(), mobile: consign.mobile.trim(), net: Number(consign.net) || 0 } : null;
    car.sale = car.status === 'sold' ? {
      ...sale, buyer: String(sale.buyer || '').trim(), mobile: String(sale.mobile || '').trim(),
      commission: sale.agentId ? Number(sale.commission) || 0 : 0,
      steps: Object.fromEntries(Object.entries(sale.steps || {}).filter(([, v]) => v)),
      review: sale.review?.quote?.trim() ? { ...sale.review, quote: sale.review.quote.trim(), name: String(sale.review.name || '').trim() } : null,
    } : null;
    if (listedDate !== (originalDate || today)) {
      const [y, m, d] = listedDate.split('-').map(Number);
      car.listedAt = y ? new Date(y, m - 1, d, 12).toISOString() : 'invalid';
    }

    const errs = validateCar(car);
    if (consigned && !car.consign.owner) errs.consignOwner = 'Enter the owner’s name.';
    if (consigned && !(car.consign.net > 0)) errs.consignNet = 'Enter what the owner gets.';
    if (car.sale?.mobile && !isPhMobile(car.sale.mobile)) errs.saleMobile = 'Enter a PH mobile number, e.g. 0917 123 4567.';
    if (car.status === 'reserved' && car.reservedUntil < today) errs.reservedUntil = 'Pick today or a later date.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = [...FIELD_ORDER, 'consignOwner', 'consignNet', 'reservedUntil', 'saleMobile'].find(k => errs[k]);
      formRef.current?.querySelector(`#cf-${first}`)?.focus();
      toast('Some details need fixing.');
      return;
    }
    setSaving(true);
    try {
      await saveCar(car);
      if (removedOriginal.current.length) await removePhotos(removedOriginal.current);
      /* a replaced or dropped release photo */
      const oldRelease = original?.sale?.review?.photoId;
      if (oldRelease && oldRelease !== car.sale?.review?.photoId) await removePhotos([oldRelease]);
      saved.current = true;
      const waiting = waitingFor(car, leads, events, new Date()).length;
      if (waiting) {
        toast(`${car.stockNo} saved. ${waiting} buyer${waiting === 1 ? ' is' : 's are'} waiting for a car like this.`,
          { label: 'See', onClick: () => navigate('/showroom/admin') });
      } else toast(`${car.stockNo} saved.`);
      navigate('/showroom/admin/cars');
    } catch (err) {
      toast(adminSaveError(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, input, { hint, wide } = {}) => (
    <div className={`${s.field} ${wide ? a.wide : ''}`}>
      <label htmlFor={`cf-${name}`} className={s.fieldLabel}>{label}</label>
      {input}
      {hint && <p className={s.hint}>{hint}</p>}
      {errors[name] && <p className={s.error} id={`cf-${name}-err`}>{errors[name]}</p>}
    </div>
  );
  const err = (name) => ({
    id: `cf-${name}`,
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `cf-${name}-err` : undefined,
  });
  const select = (name, entries, placeholder) => (
    <select className={s.select} value={form[name]} onChange={on(name)} {...err(name)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {entries.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
  const tri = (name, label) => (
    <div className={s.field}>
      <span className={s.fieldLabel} id={`cf-${name}-label`}>{label}</span>
      <div className={s.segmented} role="group" aria-labelledby={`cf-${name}-label`}>
        {Object.entries(TRI).map(([v, t]) => (
          <button key={v} type="button" aria-pressed={form[name] === v} onClick={() => set(name, v)}>{t}</button>
        ))}
      </div>
    </div>
  );

  const title = original ? carTitle(original) : 'Add a car';

  const waiting = original ? waitingFor(original, leads, events, now) : [];

  return (
    <form ref={formRef} className={a.page} onSubmit={submit} noValidate>
      <Link to="/showroom/admin/cars" className={s.crumb}><ChevronLeft size={18} aria-hidden="true" />Cars</Link>
      <div className={a.pageHead}>
        <h1 className={s.h1}>{title}</h1>
        {original && <span className={a.count}>{original.stockNo}</span>}
      </div>
      {original && waiting.length > 0 && (
        <p className={a.waitNote}>
          {waiting.length} buyer{waiting.length === 1 ? ' is' : 's are'} waiting for a car like this.{' '}
          <Link to="/showroom/admin" className={a.inlineLink}>Message them from the dashboard</Link>
        </p>
      )}

      <fieldset className={a.fieldset}>
        <legend>Basics</legend>
        <div className={a.formCols}>
          {field('year', 'Year', <input className={s.input} inputMode="numeric" maxLength={4} placeholder="2019" value={form.year} onChange={on('year', digits)} {...err('year')} />)}
          {field('make', 'Make',
            <><input className={s.input} list="cf-makes" autoComplete="off" placeholder="Toyota" value={form.make} onChange={on('make')} {...err('make')} />
              <datalist id="cf-makes">{makes.map(m => <option key={m} value={m} />)}</datalist></>)}
          {field('model', 'Model',
            <><input className={s.input} list="cf-models" autoComplete="off" placeholder="Vios" value={form.model} onChange={on('model')} {...err('model')} />
              <datalist id="cf-models">{models.map(m => <option key={m} value={m} />)}</datalist></>)}
          {field('variant', 'Variant', <input className={s.input} placeholder="1.3 E" value={form.variant} onChange={on('variant')} {...err('variant')} />)}
          {field('transmission', 'Transmission', select('transmission', Object.entries(TRANSMISSIONS), 'Choose…'))}
          {field('fuel', 'Fuel', select('fuel', Object.entries(FUELS), 'Choose…'))}
          {field('odometer', 'Odometer (km)',
            <input className={s.input} inputMode="numeric" placeholder="45000" value={form.odometer} onChange={on('odometer', digits)} {...err('odometer')} />,
            { hint: form.odometer ? `${Number(form.odometer).toLocaleString('en-US')} km` : undefined })}
          {field('body', 'Body type', select('body', Object.entries(BODY_TYPES), 'Not set'))}
          {field('engine', 'Engine', <input className={s.input} placeholder="1.3L" value={form.engine} onChange={on('engine')} {...err('engine')} />)}
          {field('drive', 'Drive', select('drive', Object.entries(DRIVES), 'Not stated'))}
          {field('seats', 'Seats', <input className={s.input} inputMode="numeric" maxLength={2} placeholder="5" value={form.seats} onChange={on('seats', digits)} {...err('seats')} />)}
          {field('color', 'Color',
            <div className={a.colorRow}>
              <span className={a.swatch} style={{ background: COLORS[form.color]?.hex || 'transparent' }} aria-hidden="true" />
              {select('color', Object.entries(COLORS).map(([k, c]) => [k, c.label]), 'Not set')}
            </div>)}
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Price</legend>
        <div className={a.formCols}>
          {field('price', 'Cash price (₱)',
            <input className={s.input} inputMode="numeric" placeholder="548000" value={form.price} onChange={on('price', digits)} {...err('price')} />,
            { hint: form.price ? formatPeso(form.price) : undefined })}
          <div className={a.checks}>
            <label className={s.checkRow}><input type="checkbox" checked={form.negotiable} onChange={(e) => set('negotiable', e.target.checked)} /><span>Negotiable</span></label>
            <label className={s.checkRow}><input type="checkbox" checked={form.financing} onChange={(e) => set('financing', e.target.checked)} /><span>Bank financing available</span></label>
          </div>
        </div>
        {!form.financing && <p className={s.hint}>Cash only: buyers won’t see a monthly payment for this car.</p>}
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Consignment</legend>
        <label className={s.checkRow}>
          <input type="checkbox" checked={consigned} onChange={(e) => setConsigned(e.target.checked)} />
          <span>Consigned (owned by someone else)</span>
        </label>
        {consigned && (
          <>
            <div className={a.formCols}>
              {field('consignOwner', 'Owner',
                <input className={s.input} value={consign.owner} onChange={(e) => setConsign(x => ({ ...x, owner: e.target.value }))} {...err('consignOwner')} />)}
              {field('consignMobile', 'Owner’s mobile',
                <input className={s.input} type="tel" inputMode="tel" placeholder="0917 123 4567" value={consign.mobile} onChange={(e) => setConsign(x => ({ ...x, mobile: e.target.value }))} {...err('consignMobile')} />)}
              {field('consignNet', 'Owner gets (₱)',
                <input className={s.input} inputMode="numeric" placeholder="800000" value={consign.net} onChange={(e) => setConsign(x => ({ ...x, net: digits(e.target.value) }))} {...err('consignNet')} />,
                { hint: Number(consign.net) > 0 && Number(form.price) > 0 ? `Your margin: ${formatPeso(Number(form.price) - Number(consign.net))}` : 'The agreed amount after the sale.' })}
            </div>
            {form.status === 'sold' && (
              <label className={s.checkRow}>
                <input type="checkbox" checked={!!consign.paidAt} onChange={(e) => setConsign(x => ({ ...x, paidAt: e.target.checked ? new Date().toISOString() : null }))} />
                <span>Owner paid{consign.paidAt ? ` (${new Date(consign.paidAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })})` : ''}</span>
              </label>
            )}
            <p className={s.hint}>Private: buyers never see this. Once sold, the to-do list reminds you to pay the owner.</p>
          </>
        )}
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Papers</legend>
        <div className={a.formCols}>
          {field('orcr', 'OR/CR', select('orcr', Object.entries(ORCR)))}
          {field('owners', 'Owners', select('owners', Object.entries(OWNERS)))}
          {field('regUntil', 'Registered until', <input className={s.input} type="month" value={form.regUntil} onChange={on('regUntil')} {...err('regUntil')} />)}
          {field('hpgCleared', 'HPG clearance done on', <input className={s.input} type="date" max={today} value={form.hpgCleared} onChange={on('hpgCleared')} {...err('hpgCleared')} />, { hint: 'Optional. Buyers see “HPG clearance: Done”.' })}
          {field('plateEnding', 'Plate ends in', <input className={s.input} inputMode="numeric" maxLength={1} placeholder="7" value={form.plateEnding} onChange={on('plateEnding', digits)} {...err('plateEnding')} />, { hint: 'Optional, last digit only.' })}
        </div>
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Condition</legend>
        <p className={s.hint}>Leave “Not stated” if you haven’t checked. Buyers see it as not stated, never as “No”.</p>
        <div className={a.formCols}>
          {tri('floodFree', 'Flood-free')}
          {tri('accidentFree', 'Accident-free')}
          {tri('casaMaintained', 'Casa maintained')}
        </div>
        {field('knownIssues', 'Known issues', <textarea className={s.textarea} rows={3} placeholder="e.g. light scratches on the rear bumper" value={form.knownIssues} onChange={on('knownIssues')} {...err('knownIssues')} />, { hint: 'Being upfront builds trust. Shown on the car page.' })}
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Inspection report</legend>
        <p className={s.hint}>Buyers see the report on the car page once it has a date and at least one check. Leave a check as “Not checked” if nobody looked at it.</p>
        <div className={a.formCols}>
          {field('inspDate', 'Inspected on', <input className={s.input} type="date" max={today} value={insp.date} onChange={(e) => setInsp(x => ({ ...x, date: e.target.value }))} {...err('inspDate')} />)}
          {field('inspBy', 'Inspected by', <input className={s.input} placeholder="Jun (shop mechanic)" value={insp.by} onChange={(e) => setInsp(x => ({ ...x, by: e.target.value }))} {...err('inspBy')} />)}
        </div>
        {INSPECTION.map(group => (
          <div key={group.id} className={a.inspGroup} role="group" aria-labelledby={`cf-insp-${group.id}`}>
            <p id={`cf-insp-${group.id}`} className={a.inspHead}>{group.label}</p>
            {group.items.map(([id, label]) => (
              <div key={id} className={a.inspRow}>
                <span className={a.inspLabel} id={`cf-insp-${id}`}>{label}</span>
                <div className={`${s.segmented} ${a.inspStates}`} role="group" aria-labelledby={`cf-insp-${id}`}>
                  {INSP_STATES.map(([v, t]) => (
                    <button key={v || 'none'} type="button" aria-pressed={(insp.results[id] || '') === v} onClick={() => setResult(id, v)}>{t}</button>
                  ))}
                </div>
                {insp.results[id] === 'fix' && (
                  <input className={`${s.input} ${a.inspNote}`} aria-label={`What needs work: ${label}`} placeholder="What needs work, and whether you’ll fix it"
                    value={insp.notes[id] || ''} onChange={(e) => setInsp(x => ({ ...x, notes: { ...x.notes, [id]: e.target.value } }))} />
                )}
              </div>
            ))}
          </div>
        ))}
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Photos <span className={a.legendNote}>{photoIds.length}/{MAX_PHOTOS}</span></legend>
        <p className={s.hint}>The first photo is the cover. Without photos, a clean silhouette is shown.</p>
        <ul className={a.photoGrid}>
          {photoIds.map((pid, i) => (
            <li key={pid} className={a.photoItem}>
              <CarPhoto car={{ ...form, photoIds: [pid] }} />
              {i === 0 && <span className={a.coverTag}>Cover</span>}
              <div className={a.photoTools}>
                <button type="button" aria-label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => movePhoto(i, -1)}><ArrowLeft size={16} aria-hidden="true" /></button>
                <button type="button" aria-label={`Move photo ${i + 1} later`} disabled={i === photoIds.length - 1} onClick={() => movePhoto(i, 1)}><ArrowRight size={16} aria-hidden="true" /></button>
                <button type="button" aria-label={`Delete photo ${i + 1}`} onClick={() => removePhoto(pid)}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </li>
          ))}
          {photoIds.length < MAX_PHOTOS && (
            <li>
              <label className={a.addPhoto}>
                <ImagePlus size={24} strokeWidth={1.5} aria-hidden="true" />
                <span>{uploading ? 'Adding…' : 'Add photos'}</span>
                <input type="file" accept="image/*" multiple className={s.srOnly} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </label>
            </li>
          )}
        </ul>
        {photoError && <p className={s.error} role="alert">{photoError}</p>}
      </fieldset>

      <fieldset className={a.fieldset}>
        <legend>Listing</legend>
        <div className={a.formCols}>
          {field('status', 'Status',
            <select className={s.select} value={form.status} onChange={onStatus} {...err('status')}>
              {[['available', 'Available'], ['reserved', 'Reserved'], ['sold', 'Sold']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>)}
          {form.status === 'reserved' && field('reservedUntil', 'Reserved until',
            <input className={s.input} type="date" min={today} value={form.reservedUntil} onChange={on('reservedUntil')} {...err('reservedUntil')} />,
            { hint: 'Goes back on sale after this day.' })}
          {field('listedAt', 'Date listed',
            <input className={s.input} type="date" max={today} value={listedDate} onChange={(e) => setListedDate(e.target.value)} {...err('listedAt')} />,
            { hint: 'Counts the days in stock. Set the real date when adding existing stock.' })}
          <div className={a.checks}>
            <label className={s.checkRow}><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /><span>Feature on the home page</span></label>
          </div>
        </div>
        {field('description', 'Description', <textarea className={s.textarea} rows={4} placeholder="What makes this unit good: service history, upgrades, who drove it…" value={form.description} onChange={on('description')} {...err('description')} />)}
      </fieldset>

      {form.status === 'sold' && (
        <fieldset className={a.fieldset}>
          <legend>Sale and papers</legend>
          <p className={s.hint}>Filled in from the latest request for this car. With the buyer’s number, the to-do list writes them a message as each paper step is done, and a reminder before the registration is due.</p>
          <div className={a.formCols}>
            {field('saleBuyer', 'Buyer', <input className={s.input} value={sale.buyer || ''} onChange={setSaleField('buyer')} {...err('saleBuyer')} />)}
            {field('saleMobile', 'Buyer’s mobile', <input className={s.input} type="tel" inputMode="tel" placeholder="0917 123 4567" value={sale.mobile || ''} onChange={setSaleField('mobile')} {...err('saleMobile')} />)}
            {field('saleLang', 'Messages in',
              <select className={s.select} value={sale.lang || 'en'} onChange={setSaleField('lang')} {...err('saleLang')}>
                <option value="en">English</option><option value="ceb">Bisaya</option>
              </select>)}
            {field('saleAgent', 'Sold through agent',
              <select className={s.select} value={sale.agentId || ''} onChange={onAgent} {...err('saleAgent')}>
                <option value="">No agent</option>
                {agents.map(ag => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
              </select>)}
            {sale.agentId && field('saleCommission', 'Commission (₱)',
              <input className={s.input} inputMode="numeric" value={sale.commission || ''} onChange={setSaleField('commission')} {...err('saleCommission')} />,
              { hint: sale.commission ? formatPeso(sale.commission) : undefined })}
          </div>
          {sale.agentId && (
            <label className={s.checkRow}>
              <input type="checkbox" checked={!!sale.commissionPaidAt} onChange={(e) => setSale(x => ({ ...x, commissionPaidAt: e.target.checked ? new Date().toISOString() : null }))} />
              <span>Commission paid</span>
            </label>
          )}
          <p className={a.inspHead}>Papers after the sale</p>
          <div className={a.formCols}>
            {PAPER_STEPS.map(([id, label]) => (
              <Fragment key={id}>
                {field(`step-${id}`, label,
                  <input className={s.input} type="date" max={today} value={sale.steps?.[id] || ''} onChange={setStep(id)} {...err(`step-${id}`)} />,
                  { hint: sale.told?.[id] ? 'Buyer told.' : undefined })}
              </Fragment>
            ))}
          </div>
          <p className={a.inspHead}>Buyer’s review (Recently sold)</p>
          <div className={a.reviewRow}>
            {sale.review?.photoId
              ? <div className={a.reviewPhoto}><CarPhoto car={{ ...form, photoIds: [sale.review.photoId] }} /></div>
              : null}
            <label className={s.btnGhost}>
              <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />{sale.review?.photoId ? 'Change release photo' : 'Add release photo'}
              <input type="file" accept="image/*" className={s.srOnly} onChange={(e) => { addReviewPhoto(e.target.files[0]); e.target.value = ''; }} />
            </label>
          </div>
          {field('reviewQuote', 'What the buyer said',
            <textarea className={s.textarea} rows={3} placeholder="Smooth from the test drive to the release…" value={sale.review?.quote || ''} onChange={(e) => setReview('quote', e.target.value)} {...err('reviewQuote')} />)}
          <div className={a.formCols}>
            {field('reviewName', 'Name to show', <input className={s.input} placeholder="Ben S." value={sale.review?.name || ''} onChange={(e) => setReview('name', e.target.value)} {...err('reviewName')} />)}
          </div>
          <label className={s.checkRow}>
            <input type="checkbox" checked={!!sale.review?.consent} onChange={(e) => setReview('consent', e.target.checked)} />
            <span>The buyer agreed to show this on the website</span>
          </label>
          {sale.review?.sample && <p className={s.hint}>This is a sample review: buyers see it marked as a sample.</p>}
        </fieldset>
      )}

      <div className={a.saveBar} data-savebar="">
        <Link to="/showroom/admin/cars" className={s.btnGhost}>Cancel</Link>
        <button type="submit" className={s.btnPrimary} disabled={saving || uploading > 0}>{isNew ? 'Add car' : 'Save changes'}</button>
      </div>
    </form>
  );
}
