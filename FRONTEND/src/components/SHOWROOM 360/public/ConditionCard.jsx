/* Condition & papers. "Not stated" is its own state and never reads as "No". */
import { CircleCheck, CircleX, CircleHelp, FileText } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { t } from '../i18n.js';
import { useNav } from '../ui.jsx';

const TRI_ICON = { yes: CircleCheck, no: CircleX, unknown: CircleHelp };
const TRI_CLASS = { yes: 'condYes', no: 'condNo', unknown: 'condUnknown' };

const monthYear = (ym) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : null;
};

export default function ConditionCard({ car }) {
  const { lang } = useNav();
  const tri = ['floodFree', 'accidentFree', 'casaMaintained'].map(key => {
    const v = ['yes', 'no'].includes(car[key]) ? car[key] : 'unknown';
    return { key, label: t(lang, `cond.${key}`), state: v, text: t(lang, `cond.${v}`) };
  });
  const owners = car.owners && car.owners !== 'unknown' ? t(lang, `owners.${car.owners}`) : null;
  const orcr = car.orcr && car.orcr !== 'unknown' ? t(lang, `orcr.${car.orcr}`) : null;
  const reg = monthYear(car.regUntil);
  const papers = [
    { key: 'owners', label: t(lang, 'cond.owners'), text: owners },
    { key: 'orcr', label: t(lang, 'cond.orcr'), text: orcr },
    { key: 'regUntil', label: t(lang, 'cond.regUntil'), text: reg },
  ];

  return (
    <section className={styles.panel} aria-labelledby="sr-cond">
      <h2 id="sr-cond" className={styles.h3}>{t(lang, 'car.condition')}</h2>
      <ul className={styles.condList}>
        {tri.map(row => {
          const Icon = TRI_ICON[row.state];
          return (
            <li key={row.key} className={styles[TRI_CLASS[row.state]]}>
              <span className={styles.condLabel}>{row.label}</span>
              <span className={styles.condValue}><Icon size={18} strokeWidth={2} aria-hidden="true" />{row.text}</span>
            </li>
          );
        })}
        {papers.map(row => (
          <li key={row.key} className={row.text ? styles.condInfo : styles.condUnknown}>
            <span className={styles.condLabel}>{row.label}</span>
            <span className={styles.condValue}>
              {row.text
                ? <><FileText size={18} strokeWidth={1.75} aria-hidden="true" />{row.text}</>
                : <><CircleHelp size={18} strokeWidth={2} aria-hidden="true" />{t(lang, 'cond.unknown')}</>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
