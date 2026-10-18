import { useEffect, useRef } from 'react';
import { Mail, MapPin, Download, ArrowRight, BadgeCheck, GraduationCap } from 'lucide-react';
import styles from './Hero.module.css';

const highlights = [
  { value: '4 yrs', label: 'IT study' },
  { value: '1+ yr', label: 'Internship' },
  { value: '15+', label: 'VA tools' },
];

export default function Hero() {
  const photoRef = useRef(null);

  /* Photo motion: pointer parallax (mouse devices) + scroll-linked drift/fade.
     Both only write CSS variables (--mx, --my, --sp); all visuals live in the stylesheet. */
  useEffect(() => {
    const el = photoRef.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const hero = el.closest('section');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty('--mx', cx.toFixed(3));
      el.style.setProperty('--my', cy.toFixed(3));
      raf = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.7)));
      el.style.setProperty('--sp', p.toFixed(3));
    };

    if (finePointer) {
      window.addEventListener('mousemove', onMove, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

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
            <button id="hero-hire-btn" className="btn-primary" onClick={() => scrollTo('contact')}>
              <Mail size={18} />
              Hire Me
              <ArrowRight size={16} className={styles.ctaArrow} />
            </button>
            <button id="hero-projects-btn" className="btn-secondary" onClick={() => scrollTo('projects')}>
              See Projects
            </button>
          </div>

          {/* Quick proof */}
          <ul className={styles.highlights} aria-label="Highlights">
            {highlights.map(h => (
              <li key={h.label} className={styles.highlightItem}>
                <strong>{h.value}</strong>
                <span>{h.label}</span>
              </li>
            ))}
          </ul>

          {/* Connect */}
          <div className={styles.connect}>
            <span className={styles.connectLabel}>Find me on</span>
            <div className={styles.socialRow}>
              <a
                id="hero-linkedin"
                href="https://www.linkedin.com/in/clarkgemongala"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="LinkedIn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a
                id="hero-facebook"
                href="https://www.facebook.com/clarkva.360"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="Facebook"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a id="hero-email" href="mailto:gemongalaclark.official@gmail.com" className="social-btn" aria-label="Email">
                <Mail size={18} />
              </a>
              <span className={styles.divider} aria-hidden="true" />
              <a
                id="hero-cv"
                href="#"
                className={styles.cvBtn}
                aria-label="Download CV (coming soon)"
                aria-disabled="true"
                onClick={(e) => e.preventDefault()}
                title="CV coming soon"
              >
                <Download size={15} /> CV <em>soon</em>
              </a>
            </div>
          </div>

          <div className={styles.contactInfo}>
            <a className={styles.contactItem} href="mailto:gemongalaclark.official@gmail.com">
              <Mail size={14} /> gemongalaclark.official@gmail.com
            </a>
            <span className={styles.contactItem}>
              <MapPin size={14} /> Philippines
            </span>
          </div>
        </div>

        {/* Right – photo */}
        <div className={styles.photoWrapper} ref={photoRef}>
          <div className={styles.glow} aria-hidden="true" />
          <div className={styles.ring} aria-hidden="true"><span className={styles.orbitDot} /></div>
          <div className={styles.ringInner} aria-hidden="true" />

          <div className={`${styles.floatBadge} ${styles.badgeTop}`}>
            <span className={styles.badgeIcon}><BadgeCheck size={20} /></span>
            <div>
              <p className={styles.badgeLabel}>VA Certified</p>
              <p className={styles.badgeSub}>The VA Bar</p>
            </div>
          </div>

          <div className={`${styles.floatBadge} ${styles.badgeBottom}`}>
            <span className={`${styles.badgeIcon} ${styles.badgeIconNavy}`}><GraduationCap size={20} /></span>
            <div>
              <p className={styles.badgeLabel}>BSIT Graduate</p>
              <p className={styles.badgeSub}>CIT - University</p>
            </div>
          </div>

          <div className={styles.photoCircle}>
            <img src="/images/clark.png" alt="Clark Gemongala – Virtual Assistant" className={styles.photo} />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button type="button" className={styles.scrollIndicator} onClick={() => scrollTo('about')} aria-label="Scroll to About section">
        <span className={styles.scrollMouse}>
          <span className={styles.scrollDot} />
        </span>
        <span className={styles.scrollText}>Scroll down</span>
      </button>
    </section>
  );
}
