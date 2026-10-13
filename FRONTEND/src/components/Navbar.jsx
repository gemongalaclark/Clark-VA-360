import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import styles from './Navbar.module.css';

const navLinks = [
  { id: 'home',     label: 'Home' },
  { id: 'about',    label: 'About' },
  { id: 'skills',   label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact',  label: 'Contact' },
];

export default function Navbar() {
  const [active, setActive]     = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Update active section based on scroll position
      const sections = navLinks.map(link => document.getElementById(link.id));
      let current = 'home';
      sections.forEach(section => {
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 100) current = section.id;
        }
      });
      setActive(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 72;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
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

        {/* Desktop nav links */}
        <ul className={styles.navLinks}>
          {navLinks.map(link => (
            <li key={link.id}>
              <button
                className={`${styles.navLink} ${active === link.id ? styles.active : ''}`}
                onClick={() => scrollTo(link.id)}
              >
                {link.label}
                {active === link.id && <span className={styles.activeBar} />}
              </button>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          className={`btn-primary ${styles.ctaBtn}`}
          onClick={() => scrollTo('contact')}
        >
          Let&apos;s Talk
        </button>

        {/* Hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.open : ''}`}>
        <ul className={styles.mobileLinks}>
          {navLinks.map(link => (
            <li key={link.id}>
              <button
                className={`${styles.mobileLink} ${active === link.id ? styles.active : ''}`}
                onClick={() => scrollTo(link.id)}
              >
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
