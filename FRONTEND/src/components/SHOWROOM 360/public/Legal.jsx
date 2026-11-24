import { ArrowRight } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { useNav } from '../ui.jsx';
import { t } from '../i18n.js';
import { legalDoc, LEGAL_UPDATED } from '../legalText.js';

/* The sample Privacy Policy or Terms and Conditions. The body is English in both
   languages (the page says so in Bisaya); it names the shop from Settings. */
export default function Legal({ kind }) {
  const { settings } = useShowroom();
  const { lang, navigate } = useNav();
  const doc = legalDoc(kind, settings);
  const other = kind === 'privacy' ? 'terms' : 'privacy';
  const updated = new Date(`${LEGAL_UPDATED}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <article className={styles.legal}>
      <h1 className={styles.h1}>{t(lang, `legal.${kind}`)}</h1>
      <p className={styles.muted}>{t(lang, 'legal.updated', { date: updated })}</p>
      <p className={styles.legalSample} role="note">{t(lang, 'legal.sample')}</p>
      {lang !== 'en' && <p className={styles.muted}>{t(lang, 'legal.inEnglish')}</p>}

      <div lang="en">
        <p className={styles.legalIntro}>{doc.intro}</p>
        {doc.sections.map((sec, i) => (
          <section key={sec.heading} className={styles.legalSection}>
            <h2><span className={styles.legalNum}>{String(i + 1).padStart(2, '0')}</span>{sec.heading}</h2>
            {sec.paras.map(p => <p key={p}>{p}</p>)}
            {sec.list && <ul>{sec.list.map(item => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
      </div>

      <a
        href={`/showroom/${other}`}
        className={styles.arrowLink}
        onClick={(e) => { e.preventDefault(); navigate(`/showroom/${other}`); }}
      >
        {t(lang, `legal.${other}`)} <ArrowRight size={18} aria-hidden="true" />
      </a>
    </article>
  );
}
