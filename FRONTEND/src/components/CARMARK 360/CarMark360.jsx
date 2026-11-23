import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowLeftRight, BookOpen, MapPin, ListChecks } from 'lucide-react';
import styles from './CarMark360.module.css';
import Compare, { lastCompareSearch } from './Compare';
import Models from './Models';
import Dealers from './Dealers';
import Checklist from './Checklist';

const TABS = [
  { id: 'compare', label: 'Compare', path: '/carmark', Icon: ArrowLeftRight },
  { id: 'models', label: 'Models', path: '/carmark/models', Icon: BookOpen },
  { id: 'dealers', label: 'Dealers', path: '/carmark/dealers', Icon: MapPin },
  { id: 'checklist', label: 'Checklist', path: '/carmark/checklist', Icon: ListChecks },
];

const readLocation = () => {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const tab = TABS.find(t => t.id !== 'compare' && path.startsWith(t.path))?.id || 'compare';
  return { tab, search: window.location.search };
};

export default function CarMark360({ onBackToPortfolio }) {
  const [loc, setLoc] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLoc(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'CarMark 360 · Cebu used-car guide';
    return () => { document.title = prevTitle; };
  }, []);

  /* In-app links: push a new URL, keep the back button working, start the page at the top */
  const navigate = useCallback((url) => {
    window.history.pushState({}, '', url);
    setLoc(readLocation());
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const openTab = (tab) => navigate(tab.id === 'compare' ? `${tab.path}${lastCompareSearch()}` : tab.path);

  const nav = (cls) => (
    <nav className={cls} aria-label="CarMark 360 pages">
      {TABS.map(tab => (
        <a
          key={tab.id}
          href={tab.path}
          className={styles.navItem}
          aria-current={loc.tab === tab.id ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); openTab(tab); }}
        >
          <tab.Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>{tab.label}</span>
        </a>
      ))}
    </nav>
  );

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button type="button" className={styles.iconBtn} onClick={onBackToPortfolio} aria-label="Back to Clark VA 360 portfolio">
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <a href="/carmark" className={styles.brand} onClick={(e) => { e.preventDefault(); openTab(TABS[0]); }}>
            CarMark<span>360</span>
          </a>
          <span className={styles.region}>Cebu</span>
          {nav(styles.topNav)}
        </div>
      </header>

      <main className={styles.main}>
        {loc.tab === 'compare' && <Compare key={loc.search} navigate={navigate} />}
        {loc.tab === 'models' && <Models key={loc.search} navigate={navigate} />}
        {loc.tab === 'dealers' && <Dealers />}
        {loc.tab === 'checklist' && <Checklist />}
      </main>

      <footer className={styles.footer}>
        <p>A free guide for secondhand-car buyers in Cebu. Prices are rough, so always check the actual car and its papers.</p>
        <button type="button" className={styles.textBtn} onClick={onBackToPortfolio}>Made by Clark VA 360</button>
      </footer>

      {nav(styles.bottomNav)}
    </div>
  );
}
