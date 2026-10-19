import { useState } from 'react';
import { ArrowLeft, ArrowRight, Send, Loader2, Check } from 'lucide-react';
import styles from './QuoteVelo.module.css';
import { SERVICES, BUDGETS, TIMELINES, DECISION_OPTIONS, LIMITS, EMAIL_RE } from './qvData';

/* Public "Request a Project Quote" form: three short steps so it feels quick, validated per step.
   A hidden honeypot field silently drops simple bots (real visitors never see or fill it). */

const STEPS = ['About you', 'Your project', 'Budget & timing'];

const EMPTY = {
  full_name: '', email: '', company: '',
  service_type: '', project_scope: '',
  budget_range: '', timeline: '', decision_maker: '',
  website: '',   // honeypot
};

function validate(step, f) {
  const e = {};
  if (step === 0) {
    if (!f.full_name.trim()) e.full_name = 'Please tell us your name.';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.';
  }
  if (step === 1) {
    if (!f.service_type) e.service_type = 'Pick the closest match.';
    if (f.project_scope.trim().length < LIMITS.scopeMin) e.project_scope = 'A sentence or two helps us quote accurately.';
  }
  if (step === 2) {
    if (!f.budget_range) e.budget_range = 'Choose a budget range.';
    if (!f.timeline) e.timeline = 'Choose a timeline.';
  }
  return e;
}

function Choice({ name, options, value, onChange, labelOf = (o) => o }) {
  return (
    <div className={styles.choiceGrid} role="radiogroup">
      {options.map(o => {
        const label = labelOf(o);
        const on = value === label;
        return (
          <label key={label} className={`${styles.choice} ${on ? styles.choiceOn : ''}`}>
            <input type="radio" name={name} value={label} checked={on} onChange={() => onChange(label)} />
            <span className={styles.choiceDot}>{on && <Check size={11} />}</span>
            {label}
          </label>
        );
      })}
    </div>
  );
}

export default function QuoteForm({ api, onSubmitted, onCancel }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (key) => (value) => {
    setF(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };
  const text = (key) => ({ value: f[key], onChange: (e) => set(key)(e.target.value) });
  const err = (key) => errors[key] && <p className={styles.fieldError} id={`qf-${key}-err`} role="alert">{errors[key]}</p>;
  const aria = (key) => ({ 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `qf-${key}-err` : undefined });

  const next = () => {
    const e = validate(step, f);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setStep(s => s + 1);
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (step < STEPS.length - 1) return next();
    const e = validate(step, f);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    /* Bot trap: pretend it worked. */
    if (f.website) { onSubmitted(); return; }

    setBusy(true);
    setSubmitError('');
    try {
      await api.submitLead({
        full_name: f.full_name.trim(),
        email: f.email.trim(),
        company: f.company.trim() || null,
        service_type: f.service_type,
        budget_range: f.budget_range,
        timeline: f.timeline,
        project_scope: f.project_scope.trim(),
        extra: f.decision_maker ? { decision_maker: f.decision_maker } : {},
      });
      onSubmitted(f.full_name.trim().split(/\s+/)[0]);
    } catch {
      setSubmitError('Something went wrong sending your request. Please try again in a moment.');
      setBusy(false);
    }
  };

  return (
    <form className={`${styles.card} ${styles.formCard}`} onSubmit={submit} noValidate>
      <p className={styles.eyebrow}>Request a project quote</p>
      <h1>Tell me about your project</h1>
      <p className={styles.muted}>Takes about a minute. You'll get a tailored proposal, not a generic price list.</p>

      <ol className={styles.stepper} aria-label="Form progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? styles.stepperActive : i < step ? styles.stepperDone : ''} aria-current={i === step ? 'step' : undefined}>
            <span>{i < step ? <Check size={11} /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      {/* Honeypot: off-screen, not tabbable, ignored by assistive tech. */}
      <div className={styles.honey} aria-hidden="true">
        <label>Website<input type="text" tabIndex={-1} autoComplete="off" {...text('website')} /></label>
      </div>

      {step === 0 && (
        <>
          <div className={styles.field}>
            <label htmlFor="qf-name">Your name <span className={styles.req}>*</span></label>
            <input id="qf-name" type="text" autoFocus autoComplete="name" maxLength={LIMITS.name} placeholder="Jordan Rivera" {...text('full_name')} {...aria('full_name')} />
            {err('full_name')}
          </div>
          <div className={styles.field}>
            <label htmlFor="qf-email">Email <span className={styles.req}>*</span></label>
            <input id="qf-email" type="email" autoComplete="email" maxLength={LIMITS.email} placeholder="jordan@company.com" {...text('email')} {...aria('email')} />
            {err('email')}
          </div>
          <div className={styles.field}>
            <label htmlFor="qf-company">Company <span className={styles.optional}>(optional)</span></label>
            <input id="qf-company" type="text" autoComplete="organization" maxLength={LIMITS.company} placeholder="Maple & Co." {...text('company')} />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <fieldset className={styles.fieldset}>
            <legend>What do you need help with? <span className={styles.req}>*</span></legend>
            <Choice name="service" options={SERVICES} value={f.service_type} onChange={set('service_type')} />
            {err('service_type')}
          </fieldset>
          <div className={styles.field}>
            <label htmlFor="qf-scope">Describe the project <span className={styles.req}>*</span></label>
            <textarea
              id="qf-scope" rows={6} maxLength={LIMITS.scope} autoFocus
              placeholder="What do you want done, which tools do you use, and what does success look like?"
              {...text('project_scope')} {...aria('project_scope')}
            />
            <span className={styles.counterText}>{f.project_scope.length}/{LIMITS.scope}</span>
            {err('project_scope')}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <fieldset className={styles.fieldset}>
            <legend>Budget <span className={styles.req}>*</span></legend>
            <Choice name="budget" options={BUDGETS} labelOf={(b) => b.label} value={f.budget_range} onChange={set('budget_range')} />
            {err('budget_range')}
          </fieldset>
          <fieldset className={styles.fieldset}>
            <legend>When do you want to start? <span className={styles.req}>*</span></legend>
            <Choice name="timeline" options={TIMELINES} value={f.timeline} onChange={set('timeline')} />
            {err('timeline')}
          </fieldset>
          <fieldset className={styles.fieldset}>
            <legend>Who decides? <span className={styles.optional}>(optional)</span></legend>
            <Choice name="decision" options={DECISION_OPTIONS} value={f.decision_maker} onChange={set('decision_maker')} />
          </fieldset>
        </>
      )}

      {submitError && <p className={styles.fieldError} role="alert">{submitError}</p>}

      <div className={styles.formActions}>
        {step === 0
          ? <button type="button" className={styles.btnGhost} onClick={onCancel}><ArrowLeft size={16} /> Back</button>
          : <button type="button" className={styles.btnGhost} onClick={() => setStep(s => s - 1)} disabled={busy}><ArrowLeft size={16} /> Back</button>}
        {step < STEPS.length - 1
          ? <button type="submit" className={styles.btnPrimary}>Continue <ArrowRight size={16} /></button>
          : (
            <button type="submit" className={styles.btnPrimary} disabled={busy}>
              {busy ? <Loader2 className={styles.spin} size={16} /> : <Send size={16} />} Send my request
            </button>
          )}
      </div>
    </form>
  );
}
