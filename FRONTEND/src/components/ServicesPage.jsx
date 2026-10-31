import { ArrowLeft } from 'lucide-react';
import { useTheme } from '../lib/theme';
import Cursor from './Cursor';
import { PassTrack } from './Services';
import { websitePlans, automationPlans } from './servicesData';
import styles from './Services.module.css';

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
        </div>
      </main>
    </>
  );
}
