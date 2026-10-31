import { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../lib/theme';
import styles from './Navbar.module.css';

const themeOptions = [
  { id: 'light', label: 'Light mode',          Icon: Sun },
  { id: 'dark',  label: 'Dark mode',           Icon: Moon },
  { id: 'auto',  label: 'Auto (system theme)', Icon: Monitor },
];

const navLinks = [
  { id: 'home',     label: 'Home' },
  { id: 'about',    label: 'About' },
  { id: 'skills',   label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'services', label: 'Services' },
  { id: 'contact',  label: 'Contact' },
];

export default function Navbar() {
  const [active, setActive]         = useState('home');
  const [menuOpen, setMenuOpen]     = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [indicator, setIndicator]   = useState({ left: 0, width: 0 });
  const [indReady, setIndReady]     = useState(false);
  const navListRef                  = useRef(null);
  const [theme, setTheme]           = useTheme();

  /* scroll spy + scrolled state */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = navLinks.map(l => document.getElementById(l.id));
      let current = 'home';
      sections.forEach(s => {
        if (s && s.getBoundingClientRect().top <= 100) current = s.id;
      });
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* sliding indicator */
  useEffect(() => {
    if (!navListRef.current) return;
    const btn = navListRef.current.querySelector(`[data-navid="${active}"]`);
    if (!btn) return;
    const listRect = navListRef.current.getBoundingClientRect();
    const btnRect  = btn.getBoundingClientRect();
    setIndicator({ left: btnRect.left - listRect.left, width: btnRect.width });
    setIndReady(true);
  }, [active]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setActive(id);
    setMenuOpen(false);
  };

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>

        {/* Logo */}
        <button className={styles.logo} onClick={() => scrollTo('home')} aria-label="Clark VA 360 Home">
          <img src="/images/logo.png" alt="Clark VA 360 Logo" className={styles.logoImg} />
        </button>

        {/* Desktop links */}
        <ul className={styles.navLinks} ref={navListRef}>
          {/* Sliding indicator */}
          {indReady && (
            <div
              className={styles.slidingIndicator}
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}

          {navLinks.map((link, i) => (
            <li key={link.id} style={{ '--i': i }}>
              <button
                data-navid={link.id}
                className={`${styles.navLink} ${active === link.id ? styles.active : ''}`}
                onClick={() => scrollTo(link.id)}
              >
                <span className={styles.navLinkHoverBg} />
                {link.label}
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          {/* Theme toggle */}
          <div className={styles.themeToggle} role="radiogroup" aria-label="Color theme">
            {themeOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                aria-label={label}
                title={label}
                className={`${styles.themeBtn} ${theme === id ? styles.themeBtnActive : ''}`}
                onClick={() => setTheme(id)}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            className={`btn-primary ${styles.ctaBtn}`}
            onClick={() => scrollTo('contact')}
          >
            Let&apos;s Talk
          </button>

          {/* Hamburger */}
          <button
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburgerBar} />
            <span className={styles.hamburgerBar} />
            <span className={styles.hamburgerBar} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
        <ul className={styles.mobileLinks}>
          {navLinks.map((link, i) => (
            <li key={link.id} style={{ '--i': i }}>
              <button
                className={`${styles.mobileLink} ${active === link.id ? styles.active : ''}`}
                onClick={() => scrollTo(link.id)}
              >
                <span className={styles.mobileLinkDot} />
                {link.label}
              </button>
            </li>
          ))}
        </ul>
        <button
          className={`btn-primary ${styles.mobileCta}`}
          onClick={() => scrollTo('contact')}
        >
          Let&apos;s Talk
        </button>
      </div>
    </nav>
  );
}
