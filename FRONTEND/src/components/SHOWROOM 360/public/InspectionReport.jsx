/* The car's inspection report: how many checks passed, who checked and when, then
   each group. What needs work says so, with the shop's note. Nothing until there's
   a report (inspectionSummary). */
import { CircleCheck, Wrench, CircleHelp } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { t } from '../i18n.js';
import { useNav } from '../ui.jsx';
import { INSPECTION, inspectionSummary } from '../showroomRules.js';

const STATE = {
  pass: { Icon: CircleCheck, cls: 'condYes', key: 'insp.pass' },
  fix: { Icon: Wrench, cls: 'inspFix', key: 'insp.fix' },
  none: { Icon: CircleHelp, cls: 'condUnknown', key: 'insp.none' },
};

export default function InspectionReport({ car }) {
  const { lang } = useNav();
  const insp = car.inspection;
  const sum = inspectionSummary(insp);
  if (!sum) return null;
  const [y, m, d] = insp.date.split('-').map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <section className={styles.panel} aria-labelledby="sr-insp">
      <h2 id="sr-insp" className={styles.h3}>{t(lang, 'insp.title')}</h2>
      <p className={styles.inspSummary}>
        <strong>{t(lang, 'insp.summary', { passed: sum.passed, total: sum.total })}</strong>
        <span>{insp.by ? t(lang, 'insp.on', { date, by: insp.by }) : t(lang, 'insp.onNoBy', { date })}</span>
      </p>
      <div className={styles.inspGroups}>
        {INSPECTION.map(group => (
          <div key={group.id} className={styles.inspGroup}>
            <h3 className={styles.inspGroupHead}>{t(lang, `insp.g.${group.id}`)}</h3>
            <ul className={styles.condList}>
              {group.items.map(([id]) => {
                const st = STATE[insp.results?.[id]] || STATE.none;
                return (
                  <li key={id} className={styles[st.cls]}>
                    <span className={styles.condLabel}>
                      {t(lang, `insp.${id}`)}
                      {insp.results?.[id] === 'fix' && insp.notes?.[id] && <span className={styles.inspNote}>{insp.notes[id]}</span>}
                    </span>
                    <span className={styles.condValue}><st.Icon size={18} strokeWidth={2} aria-hidden="true" />{t(lang, st.key)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
