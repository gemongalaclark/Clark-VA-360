/* What banks usually ask for, by kind of buyer: on the car page (under the loan
   calculator) and in the home page FAQ. A sample list, and it says so. */
import { useState } from 'react';
import { Check } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { t, FINANCING_DOCS } from '../i18n.js';

const GROUPS = ['employed', 'business', 'ofw'];

export default function Requirements({ lang }) {
  const [who, setWho] = useState('employed');
  const lines = (group) => Array.from({ length: FINANCING_DOCS[group] }, (_, i) => t(lang, `req.${group}.${i + 1}`));
  return (
    <div className={styles.reqs}>
      <div className={`${styles.segmented} ${styles.segmentedFill}`} role="group" aria-label={t(lang, 'req.for')}>
        {GROUPS.map(g => (
          <button key={g} type="button" aria-pressed={who === g} onClick={() => setWho(g)}>{t(lang, `req.${g}`)}</button>
        ))}
      </div>
      <ul className={styles.reqList}>
        {[...lines('all'), ...lines(who)].map(line => (
          <li key={line}><Check size={16} strokeWidth={2} aria-hidden="true" />{line}</li>
        ))}
      </ul>
      <p className={styles.hint}>{t(lang, 'req.note')}</p>
    </div>
  );
}
