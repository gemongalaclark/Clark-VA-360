import { useEffect, useRef } from 'react';
import { Mail, MapPin, Download, ArrowRight } from 'lucide-react';
import styles from './Hero.module.css';

const highlights = [
  { value: '4 yrs', label: 'IT study' },
  { value: '1+ yr', label: 'Internship' },
  { value: '15+', label: 'VA tools' },
];


export default function Hero() {
  const coverRef = useRef(null);

  /* Pointer parallax (mouse devices) + scroll-linked drift/fade.
     JS only writes --mx / --my / --sp; every visual lives in the stylesheet. */
  useEffect(() => {
    const el = coverRef.current;
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
      const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.8)));
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
        <div className={styles.frame} aria-hidden="true" />

        <div className={styles.stage}>
          {/* ── Cover: giant name, cut-out portrait, script signature ── */}
          <div className={styles.cover} ref={coverRef}>
            <p className={`${styles.kana} ${styles.r}`} style={{ '--rd': '0s' }} aria-hidden="true">Virtual Assistant</p>

            <h1 className={styles.name} aria-label="Clark Gemongala">
              {'CLARK'.split('').map((ch, i) => (
                <span key={i} className={`${styles.letter} ${styles.r}`} style={{ '--rd': `${0.08 + i * 0.07}s` }} aria-hidden="true">{ch}</span>
              ))}
            </h1>

            <div className={styles.portraitWrap}>
              <img
                src="/images/clark-cutout.webp"
                alt="Clark Gemongala – Virtual Assistant"
                className={`${styles.portrait} ${styles.r}`}
                style={{ '--rd': '0.25s' }}
                width="1400"
                height="1875"
                fetchPriority="high"
              />
            </div>

            <span className={styles.script} aria-hidden="true">Gemongala</span>
          </div>

          {/* ── Top-left: self-intro card ── */}
          <article className={`${styles.card} ${styles.cardTL} ${styles.r}`} style={{ '--rd': '0.55s' }}>
            <div className={styles.tlBadgeBox}>
              <span className={styles.tlBadgeTitle}>VA<br />360</span>
              <span className={styles.pill}>Open !!</span>
            </div>
            <div className={styles.tlBody}>
              <h2 className={styles.cardHeading}>Self-Intro</h2>
              <p className={styles.italic}>
                Hi, I&apos;m Clark! An IT graduate turned VA who turns busy workloads into smooth operations.
              </p>
            </div>
          </article>

          {/* ── Top-right: meta + socials ── */}
          <aside className={`${styles.meta} ${styles.r}`} style={{ '--rd': '0.65s' }}>
            <p className={styles.metaLine}><MapPin size={13} aria-hidden="true" /> Philippines · BSIT Graduate</p>
            <p className={styles.metaLine}>Portfolio · 2026</p>
            <a className={styles.metaLink} href="mailto:gemongalaclark.official@gmail.com">
              <Mail size={13} aria-hidden="true" /> gemongalaclark.official@gmail.com
            </a>
            <div className={styles.socialRow}>
              <a
                id="hero-linkedin"
                href="https://www.linkedin.com/in/clarkgemongala"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="LinkedIn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a id="hero-email" href="mailto:gemongalaclark.official@gmail.com" className="social-btn" aria-label="Email">
                <Mail size={16} />
              </a>
              <a
                id="hero-cv"
                href="#"
                className={styles.cvBtn}
                aria-label="Download CV (coming soon)"
                aria-disabled="true"
                onClick={(e) => e.preventDefault()}
                title="CV coming soon"
              >
                <Download size={14} /> CV <em>soon</em>
              </a>
            </div>
          </aside>

          {/* ── Bottom-left: current focus + CTAs ── */}
          <div className={`${styles.news} ${styles.r}`} style={{ '--rd': '0.75s' }}>
            <h2 className={styles.newsHeading}>Available now !!</h2>
            <p className={styles.newsBody}>
              A Virtual Assistant pairing a technical background with formal VA training,
              ready to streamline your daily operations and help you scale.
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
          </div>

          {/* ── Bottom-right: the question card ── */}
          <article className={`${styles.card} ${styles.cardBR} ${styles.r}`} style={{ '--rd': '0.85s' }}>
            <h2 className={styles.cardHeading}>The Question Is:</h2>
            <p className={styles.italic}>&ldquo;Why settle for a VA who can&apos;t speak tech?&rdquo;</p>
            <p className={styles.attrib}>&mdash; Clark Gemongala &mdash;</p>
            <ul className={styles.highlights} aria-label="Highlights">
              {highlights.map(h => (
                <li key={h.label} className={styles.highlightItem}>
                  <strong>{h.value}</strong>
                  <span>{h.label}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* ── Scroll rail ── */}
          <button type="button" className={styles.rail} onClick={() => scrollTo('about')} aria-label="Scroll to About section">
            <span className={styles.railText}>S C R O L L</span>
            <span className={styles.railTrack}><span className={styles.railDot} /></span>
          </button>
        </div>
    </section>
  );
}
