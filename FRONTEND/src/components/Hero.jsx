import { Mail, MapPin, Download } from 'lucide-react';
import styles from './Hero.module.css';

export default function Hero() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className={styles.hero}>
      {/* Decorative blobs */}
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />
      <div className={styles.blob3} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        {/* Left content */}
        <div className={styles.content}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Available for hire · Philippines
          </div>

          <h1 className={styles.heading}>
            Hi, I&apos;m <span className={styles.highlight}>Clark!</span>
          </h1>

          <div className={styles.roles}>
            <span className={styles.role}>Virtual Assistant</span>
            <span className={styles.roleDivider}>/</span>
            <span className={styles.role}>Tech-Savvy VA</span>
          </div>

          <p className={styles.description}>
            IT graduate turned Virtual Assistant — combining a technical background
            with formal VA training to streamline your daily operations and scale your business.
          </p>

          <div className={styles.ctaRow}>
            <button
              id="hero-hire-btn"
              className="btn-primary"
              onClick={() => scrollTo('contact')}
            >
              <Mail size={18} />
              Hire Me
            </button>
            <button
              id="hero-projects-btn"
              className="btn-secondary"
              onClick={() => scrollTo('projects')}
            >
              See Projects
            </button>
          </div>

          <div className={styles.socialRow}>
            {/* LinkedIn */}
            <a
              id="hero-linkedin"
              href="https://www.linkedin.com/in/clarkgemongala"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
              aria-label="LinkedIn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            {/* Facebook */}
            <a
              id="hero-facebook"
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
              aria-label="Facebook"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            {/* Email */}
            <a
              id="hero-email"
              href="mailto:gemongalaclark.official@gmail.com"
              className="social-btn"
              aria-label="Email"
            >
              <Mail size={18} />
            </a>
            {/* Download CV */}
            <a
              id="hero-cv"
              href="#"
              className="social-btn"
              style={{ background: 'var(--gradient-red)', borderColor: 'transparent', color: 'white' }}
              aria-label="Download CV"
              onClick={(e) => e.preventDefault()}
              title="CV coming soon"
            >
              <Download size={18} />
            </a>
          </div>

          <div className={styles.contactInfo}>
            <span className={styles.contactItem}>
              <Mail size={14} /> gemongalaclark.official@gmail.com
            </span>
            <span className={styles.contactItem}>
              <MapPin size={14} /> Philippines
            </span>
          </div>
        </div>

        {/* Right – photo */}
        <div className={styles.photoWrapper}>
          {/* Decorative ring */}
          <div className={styles.ring} aria-hidden="true" />
          <div className={styles.ringInner} aria-hidden="true" />

          {/* Floating badges */}
          <div className={`${styles.floatBadge} ${styles.badgeTop}`}>
            <span className={styles.badgeIcon}>✓</span>
            <div>
              <p className={styles.badgeLabel}>VA Certified</p>
              <p className={styles.badgeSub}>The VA Bar</p>
            </div>
          </div>

          <div className={`${styles.floatBadge} ${styles.badgeBottom}`}>
            <span className={styles.badgeIcon}>🎓</span>
            <div>
              <p className={styles.badgeLabel}>BSIT Graduate</p>
              <p className={styles.badgeSub}>CIT - University</p>
            </div>
          </div>

          <div className={styles.photoCircle}>
            <img
              src="/images/clark.png"
              alt="Clark Gemongala – Virtual Assistant"
              className={styles.photo}
            />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={styles.scrollIndicator} onClick={() => scrollTo('about')}>
        <div className={styles.scrollMouse}>
          <div className={styles.scrollDot} />
        </div>
        <span>Scroll down</span>
      </div>
    </section>
  );
}
