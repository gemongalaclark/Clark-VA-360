import { Mail } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        {/* Logo + tagline */}
        <div className={styles.brand}>
          <button className={styles.logoBtn} onClick={() => scrollTo('home')} aria-label="Home">
            <img src="/images/logo.png" alt="Clark VA 360" className={styles.logoImg} />
          </button>
          <p className={styles.tagline}>Driving Digital Growth, Streamlining Operations.</p>
        </div>

        {/* Nav links */}
        <div className={styles.links}>
          {['home', 'about', 'skills', 'projects', 'contact'].map(id => (
            <button key={id} className={styles.link} onClick={() => scrollTo(id)}>
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>

        {/* Social */}
        <div className={styles.social}>
          <a
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
          <a
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
          <a
            href="mailto:gemongalaclark.official@gmail.com"
            className="social-btn"
            aria-label="Email"
          >
            <Mail size={18} />
          </a>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {year} Clark VA 360. All rights reserved.</p>
        <p>Built with ❤️ · <a href="mailto:gemongalaclark.official@gmail.com">gemongalaclark.official@gmail.com</a></p>
      </div>
    </footer>
  );
}
