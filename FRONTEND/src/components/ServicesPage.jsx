import { ArrowLeft, Check, Minus } from 'lucide-react';
import { useTheme } from '../lib/theme';
import Cursor from './Cursor';
import { PassTrack } from './Services';
import { websitePlans, automationPlans, comparisonGroups, planFeatures } from './servicesData';
import styles from './Services.module.css';

const allPlans = [...websitePlans, ...automationPlans];

function ComparisonTable() {
  const included = new Map(allPlans.map(plan => [plan.id, new Set(planFeatures(plan))]));
  const premiumClass = plan => (plan.rank === 4 ? styles.compareLegendary : plan.rank === 3 ? styles.comparePremium : '');

  return (
    /* Scrolls sideways on small screens, so it has to be focusable for keyboard users */
    <div className={styles.compareScroll} role="region" aria-labelledby="compare-passes" tabIndex={0}>
      <table className={styles.compare}>
        <thead>
          <tr>
            <td className={styles.compareCorner} rowSpan={2} />
            <th scope="colgroup" colSpan={websitePlans.length} className={styles.compareTrack}>Websites</th>
            <th scope="colgroup" colSpan={automationPlans.length} className={styles.compareTrack}>Automations</th>
          </tr>
          <tr>
            {allPlans.map(plan => (
              <th key={plan.id} scope="col" className={`${styles.comparePlan} ${premiumClass(plan)}`}>
                <span className={styles.comparePlanName}>{plan.name}</span>
                <span className={styles.compareUsd}>${plan.usd}</span>
                <span className={styles.comparePhp}>₱{plan.php}</span>
              </th>
            ))}
          </tr>
        </thead>
        {comparisonGroups.map(group => (
          <tbody key={group.label}>
            <tr>
              <th scope="colgroup" colSpan={allPlans.length + 1} className={styles.compareGroup}>
                <span>{group.label}</span>
              </th>
            </tr>
            {group.features.map(feature => (
              <tr key={feature}>
                <th scope="row" className={styles.compareFeature}>{feature}</th>
                {allPlans.map(plan => (
                  <td key={plan.id} className={premiumClass(plan)}>
                    {included.get(plan.id).has(feature) ? (
                      <Check size={16} strokeWidth={3} className={styles.compareYes} role="img" aria-label="Included" />
                    ) : (
                      <Minus size={14} className={styles.compareNo} role="img" aria-label="Not included" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export default function ServicesPage({ onBackToPortfolio }) {
  useTheme(); // this page has no Navbar, which is what normally applies the saved theme

  return (
    <>
      <Cursor />
      <header className={styles.pageBar}>
        <div className={`container ${styles.pageBarInner}`}>
          <button type="button" className={styles.pageLogo} onClick={onBackToPortfolio} aria-label="Clark VA 360 Home">
            <img src="/images/logo.png" alt="Clark VA 360 Logo" />
          </button>
          <button type="button" className={styles.backBtn} onClick={onBackToPortfolio}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to portfolio
          </button>
        </div>
      </header>

      <main className={`section ${styles.services} ${styles.page}`}>
        <div className="container">
          <h1 className="section-title">All <span>Services</span></h1>
          <div className="section-divider" />
          <p className={styles.sectionSubtitle}>
            Every bundle in one place. Prices are one-time project fees.
          </p>

          <section className={styles.trackBlock} aria-labelledby="website-passes">
            <header className={styles.trackHead}>
              <p className={styles.trackEyebrow}>Track 01</p>
              <h2 id="website-passes" className={styles.trackTitle}>Website Passes</h2>
              <p className={styles.trackDesc}>From a clean business site to a complete system with AI.</p>
            </header>
            <PassTrack plans={websitePlans} />
          </section>

          <section className={styles.trackBlock} aria-labelledby="automation-passes">
            <header className={styles.trackHead}>
              <p className={styles.trackEyebrow}>Track 02</p>
              <h2 id="automation-passes" className={styles.trackTitle}>Automation Passes</h2>
              <p className={styles.trackDesc}>Automations only, for businesses that already have a website.</p>
            </header>
            <div className={styles.automationTrack}>
              <PassTrack plans={automationPlans} />
            </div>
          </section>

          <section className={`${styles.trackBlock} ${styles.compareBlock}`} aria-labelledby="compare-passes">
            <header className={styles.trackHead}>
              <p className={styles.trackEyebrow}>Compare</p>
              <h2 id="compare-passes" className={styles.trackTitle}>Compare All Passes</h2>
              <p className={styles.trackDesc}>See what each bundle includes, side by side.</p>
            </header>
            <ComparisonTable />
          </section>
        </div>
      </main>
    </>
  );
}
