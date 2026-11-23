import { useId, useState } from 'react';
import styles from '../Showroom360.module.css';
import { t } from '../i18n.js';
import { useNav } from '../ui.jsx';
import { loanQuote, loanTerms, formatPeso, clampDownPct } from '../showroomRules.js';

export default function LoanCalc({ price, fin }) {
  const { lang } = useNav();
  const terms = loanTerms(fin);
  const minDown = Math.max(0, Math.min(90, Number(fin.minDownPct) || 0));
  const maxDown = Math.max(60, minDown);
  const [rawDown, setDown] = useState(minDown);
  /* clamped on every render, so a minimum raised in another tab applies at once */
  const down = clampDownPct(rawDown, fin);
  const [term, setTerm] = useState(terms[terms.length - 1]);
  const rangeId = useId();
  const q = loanQuote(price, down, term, fin);

  return (
    <section className={styles.loan} aria-labelledby={`${rangeId}-title`}>
      <h2 id={`${rangeId}-title`} className={styles.h3}>{t(lang, 'loan.title')}</h2>

      <div className={styles.loanMonthly} aria-live="polite">
        <span className={styles.loanBig}>{formatPeso(q.monthly)}</span>
        <span className={styles.muted}>{t(lang, 'loan.perMo')} · {t(lang, 'loan.months', { n: term })}</span>
      </div>

      <div className={styles.field}>
        <div className={styles.loanRangeHead}>
          <label htmlFor={rangeId} className={styles.fieldLabel}>{t(lang, 'loan.down')}</label>
          <output htmlFor={rangeId} className={styles.loanOut}>{down}% · {formatPeso(q.down)}</output>
        </div>
        <input
          id={rangeId}
          type="range"
          className={styles.range}
          min={minDown}
          max={maxDown}
          step={5}
          value={down}
          onChange={(e) => setDown(Number(e.target.value))}
          aria-valuetext={`${down}%, ${formatPeso(q.down)}`}
          style={{ '--fill': `${((down - minDown) / Math.max(1, maxDown - minDown)) * 100}%` }}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel} id={`${rangeId}-term`}>{t(lang, 'loan.term')}</span>
        <div className={styles.segmented} role="group" aria-labelledby={`${rangeId}-term`}>
          {terms.map(m => (
            <button key={m} type="button" aria-pressed={m === term} onClick={() => setTerm(m)}>{m}</button>
          ))}
        </div>
      </div>

      <dl className={styles.loanFacts}>
        <div><dt>{t(lang, 'loan.financed')}</dt><dd>{formatPeso(q.financed)}</dd></div>
        <div><dt>{t(lang, 'loan.allIn')}</dt><dd>{formatPeso(q.allIn)}</dd></div>
      </dl>
      <p className={styles.hint}>{t(lang, 'loan.allInHint')} {t(lang, 'loan.note')}</p>
    </section>
  );
}
