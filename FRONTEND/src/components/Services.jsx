import { ArrowRight, Check, Crown, Flame, Shield, Zap } from 'lucide-react';
import { websitePlans } from './servicesData';
import styles from './Services.module.css';

/* Client-side navigation, same as opening a project. Contact picks up ?inquiry= from the URL. */
const navigate = (url) => {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/* The higher the rank, the flashier the pass. The look itself lives in .rank1 to .rank4. */
const RANKS = {
  1: { name: 'Starter', Icon: Shield },
  2: { name: 'Pro', Icon: Zap },
  3: { name: 'Elite', Icon: Flame },
  4: { name: 'Legendary', Icon: Crown },
};
const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7];

/* Feeds the cursor position to the glare in CSS */
const trackGlare = (e) => {
  const box = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - box.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - box.top}px`);
};

function PassCard({ plan }) {
  const { name: rankName, Icon } = RANKS[plan.rank];

  return (
    <article className={`${styles.pass} ${styles[`rank${plan.rank}`]}`} onMouseMove={trackGlare}>
      <div className={styles.fx} aria-hidden="true">
        <span className={styles.ghostTier}>{plan.tier}</span>
        {plan.rank === 4 && SPARKS.map(i => <i key={i} className={styles.spark} style={{ '--i': i }} />)}
      </div>

      <div className={styles.passHead}>
        <span className={styles.rankChip}>
          <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
          {rankName}
        </span>
        <h3 className={styles.passName}>{plan.name}</h3>
        <p className={styles.passTagline}>{plan.tagline}</p>
        <p className={styles.price}>
          <span className={styles.priceUsd}>${plan.usd}</span>
          <span className={styles.pricePhp}>₱{plan.php}</span>
        </p>
        <p className={styles.priceNote}>One-time</p>
      </div>

      <div className={styles.perforation} aria-hidden="true" />

      <div className={styles.passBody}>
        <ul className={styles.features}>
          {plan.features.map(f => (
            <li key={f}>
              <Check size={15} strokeWidth={3} aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={`${plan.rank > 1 ? 'btn-primary' : 'btn-secondary'} ${styles.passCta}`}
          aria-label={`Get the ${plan.name} pass`}
          onClick={() => navigate(`/?inquiry=${encodeURIComponent(plan.name)}#contact`)}
        >
          Get this pass
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/* Battle-pass rail: each tier is a level on one track, with its pass hanging below it. */
export function PassTrack({ plans }) {
  return (
    <ol className={styles.track} style={{ '--cols': plans.length }}>
      {plans.map(plan => (
        <li key={plan.id} className={`${styles.tier} ${styles[`tierRank${plan.rank}`]}`}>
          <div className={styles.level}>
            <span className={styles.levelNode} aria-hidden="true"><span>{plan.tier}</span></span>
            <span className={styles.levelLabel}>Tier {plan.tier}</span>
            {plan.popular && <span className={styles.popularTag}>Most popular</span>}
          </div>
          <PassCard plan={plan} />
        </li>
      ))}
    </ol>
  );
}

export default function Services() {
  return (
    <section id="services" className={`section ${styles.services}`}>
      <div className="container">
        <h2 className="section-title">My <span>Services</span></h2>
        <div className="section-divider" />
        <p className={styles.sectionSubtitle}>
          Bundled websites and automations for business owners. Pick a pass, then level up as you grow.
        </p>

        <div className={styles.homeTrack}>
          <PassTrack plans={websitePlans.slice(0, 2)} />
        </div>

        <div className={styles.moreRow}>
          <a
            href="/services"
            className="btn-secondary"
            onClick={(e) => {
              e.preventDefault();
              navigate('/services');
            }}
          >
            View all services
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
