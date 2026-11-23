import { useId, useRef, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom, newId } from '../store.js';
import { t } from '../i18n.js';
import { useNav, Sheet } from '../ui.jsx';
import { validateLead, carTitle, saveErrorKind } from '../showroomRules.js';

/* Local date, not UTC: in Cebu (UTC+8) the UTC date is "yesterday" until 8 AM */
export const localISODate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function LeadForm({ type, car, onClose }) {
  const { saveLead } = useShowroom();
  const { lang } = useNav();
  const today = localISODate();
  const [form, setForm] = useState({ name: '', mobile: '', date: today, slot: '', note: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const formRef = useRef(null);
  const uid = useId();
  const testDrive = type === 'test-drive';

  /* Editing a field clears its error, so a fixed field stops looking wrong */
  const change = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(er => (er[k] ? { ...er, [k]: undefined } : er));
  };
  const set = (k) => (e) => change(k, e.target.value);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLead({ type, ...form }, today);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      const first = ['name', 'mobile', 'date', 'slot'].find(k => errs[k]);
      formRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    setSendError('');
    try {
      await saveLead({
        id: newId('lead'),
        type,
        carId: car.id,
        carLabel: `${carTitle(car)} (${car.stockNo})`,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        date: testDrive ? form.date : '',
        slot: testDrive ? form.slot : '',
        note: form.note.trim(),
        status: 'new',
        createdAt: new Date().toISOString(),
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
    <Sheet open={!!type} onClose={onClose} title={t(lang, testDrive ? 'lead.testDrive' : 'lead.reserve')} closeLabel={t(lang, 'common.close')}>
      {sent ? (
        <div className={styles.sentBox}>
          <CircleCheck size={44} strokeWidth={1.5} aria-hidden="true" />
          <h3 className={styles.h3}>{t(lang, 'lead.sent')}</h3>
          <p className={styles.muted}>{t(lang, 'lead.sentHint')}</p>
          <button type="button" className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={onClose}>{t(lang, 'lead.done')}</button>
        </div>
      ) : (
        <form ref={formRef} className={styles.formGrid} onSubmit={submit} noValidate>
          <p className={styles.leadCar}>{carTitle(car)} · {car.stockNo}</p>
          <p className={styles.muted}>{t(lang, testDrive ? 'lead.testDriveHint' : 'lead.reserveHint')}</p>
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
          {field('note', t(lang, 'lead.note'),
            <textarea className={styles.textarea} rows={3} value={form.note} onChange={set('note')} {...aria('note')} />)}
          {sendError && <p className={styles.error} role="alert">{sendError}</p>}
          <button type="submit" className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={busy}>{t(lang, 'lead.send')}</button>
        </form>
      )}
    </Sheet>
  );
}
