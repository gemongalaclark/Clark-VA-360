import { useState } from 'react';
import { ArrowLeft, ArrowRight, Save, Send, Loader2 } from 'lucide-react';
import styles from './OnboardBase.module.css';
import { INTAKE_SECTIONS } from './obData';

/* Multi-step intake. Answers persist to ob_intake_forms.question_data (JSONB) on every
   "Next" / "Save & finish later", so a client can leave and resume where they stopped. */

const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim());

export default function IntakeForm({ intake, onSave, notify }) {
  const [data, setData] = useState(intake?.question_data || {});
  const [step, setStep] = useState(Math.min(intake?.current_step || 0, INTAKE_SECTIONS.length - 1));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const section = INTAKE_SECTIONS[step];
  const last = step === INTAKE_SECTIONS.length - 1;

  const set = (key, value) => {
    setData(d => ({ ...d, [key]: value }));
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const toggle = (key, option) => {
    const current = data[key] || [];
    set(key, current.includes(option) ? current.filter(o => o !== option) : [...current, option]);
  };

  const validate = () => {
    const found = {};
    section.fields.forEach(f => { if (f.required && isEmpty(data[f.key])) found[f.key] = 'Required'; });
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const persist = async (nextStep, submit = false) => {
    setBusy(true);
    try {
      await onSave({ data, currentStep: nextStep, submit });
      return true;
    } catch (e) {
      notify(e.message || 'Could not save', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!validate()) return;
    if (last) {
      if (await persist(step, true)) notify('Intake form submitted. Thank you!');
    } else if (await persist(step + 1)) {
      setStep(step + 1);
    }
  };

  const back = () => { setErrors({}); setStep(step - 1); };

  const saveForLater = async () => {
    if (await persist(step)) notify('Progress saved. You can pick this up any time.');
  };

  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
      <ol className={styles.stepper} aria-label="Intake form sections">
        {INTAKE_SECTIONS.map((s, i) => (
          <li key={s.title} className={i === step ? styles.stepperActive : i < step ? styles.stepperDone : ''}>
            <span>{i + 1}</span>{s.title}
          </li>
        ))}
      </ol>

      <h3>{section.title}</h3>
      <p className={styles.muted}>{section.blurb}</p>

      {section.fields.map(f => (
        <div key={f.key} className={styles.field}>
          <label htmlFor={`ob-${f.key}`}>
            {f.label}{f.required && <span className={styles.req}> *</span>}
          </label>

          {f.type === 'textarea' && (
            <textarea id={`ob-${f.key}`} rows={3} value={data[f.key] || ''} placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)} />
          )}
          {f.type === 'select' && (
            <select id={`ob-${f.key}`} value={data[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">Select…</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {f.type === 'text' && (
            <input id={`ob-${f.key}`} type="text" value={data[f.key] || ''} placeholder={f.placeholder}
              onChange={(e) => set(f.key, e.target.value)} />
          )}
          {f.type === 'checkbox' && (
            <div className={styles.checkGrid} id={`ob-${f.key}`}>
              {f.options.map(o => (
                <label key={o} className={styles.check}>
                  <input type="checkbox" checked={(data[f.key] || []).includes(o)} onChange={() => toggle(f.key, o)} />
                  {o}
                </label>
              ))}
            </div>
          )}
          {errors[f.key] && <span className={styles.fieldError} role="alert">{errors[f.key]}</span>}
        </div>
      ))}

      <div className={styles.formActions}>
        {step > 0 && (
          <button type="button" className={styles.btnGhost} onClick={back} disabled={busy}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button type="button" className={styles.btnGhost} onClick={saveForLater} disabled={busy}>
          <Save size={16} /> Save &amp; finish later
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={busy}>
          {busy ? <Loader2 className={styles.spin} size={16} /> : last ? <Send size={16} /> : <ArrowRight size={16} />}
          {last ? 'Submit intake form' : 'Next'}
        </button>
      </div>
    </form>
  );
}
