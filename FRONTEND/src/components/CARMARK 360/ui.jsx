import styles from './CarMark360.module.css';
import { priceRange } from './carmarkRules';

/* Dark band at the top of every page. lift = the first card after it overlaps its bottom edge. */
export function Hero({ eyebrow, title, sub, stats, lift = false, children }) {
  return (
    <section className={`${styles.hero} ${lift ? styles.heroLift : ''}`}>
      <div className={styles.heroInner}>
        {eyebrow && <span className={styles.heroEyebrow}>{eyebrow}</span>}
        <h1>{title}</h1>
        {sub && <p className={styles.heroSub}>{sub}</p>}
        {stats && (
          <dl className={styles.stats}>
            {stats.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </div>
    </section>
  );
}

/* A white content card with an optional heading row */
export function Card({ title, aside, className = '', children, ...rest }) {
  return (
    <section className={`${styles.card} ${className}`} {...rest}>
      {(title || aside) && (
        <div className={styles.cardHead}>
          {title && <h2>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/* A generation's problems to check before buying, biggest risks first */
export function ProblemList({ problems }) {
  const ordered = [...problems].sort((x, y) => (x.level === y.level ? 0 : x.level === 'high' ? -1 : 1));
  return (
    <ul className={styles.problems}>
      {ordered.map(p => (
        <li key={p.title} className={p.level === 'high' ? styles.probHigh : styles.probCheck}>
          <span className={styles.level}>{p.level === 'high' ? 'High risk' : 'Check'}</span>
          <strong>{p.title}</strong>
          <p>{p.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function PriceLine({ price }) {
  return (
    <div className={styles.priceLine}>
      <span>Used price</span>
      <strong>{priceRange(price)}</strong>
      {price.note && <em>{price.note}</em>}
    </div>
  );
}
