import { Component, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Home as HomeIcon, CarFront, Phone, SearchX } from 'lucide-react';
import styles from './Showroom360.module.css';
import { ShowroomContext, useShowroomStore, useShowroom } from './store.js';
import { useLang, t } from './i18n.js';
import { NavContext, useNav, ToastProvider, ShopLogo } from './ui.jsx';
import { parseShowroomPath } from './showroomRules.js';
import Home from './public/Home.jsx';
import Inventory from './public/Inventory.jsx';
import CarPage from './public/CarPage.jsx';

/* The admin is its own download: buyers never load it */
const Admin = lazy(() => import('./admin/Admin.jsx'));

/* The condensed display face is only used here, so only this chunk asks for it */
const DISPLAY_FONT = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap';
if (typeof document !== 'undefined' && !document.querySelector(`link[href="${DISPLAY_FONT}"]`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = DISPLAY_FONT;
  document.head.appendChild(link);
}

export const readLocation = () => ({ ...parseShowroomPath(window.location.pathname), search: window.location.search });

/* Last line of defence: if a page still throws (say, data saved by an older
   version), offer a reset instead of a blank screen. */
class CrashGuard extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={styles.app}>
        <div className={styles.empty} role="alert">
          <h1>Something went wrong on this page.</h1>
          <p>The data saved in this browser may be from an older version.</p>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={async () => { await this.props.onReset(); window.location.assign('/showroom'); }}
          >
            Reset demo data
          </button>
          <button type="button" className={styles.textBtn} onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    );
  }
}

/* A clock for countdowns and event start/end, ticking every 30 s */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Showroom360({ onBackToPortfolio }) {
  const store = useShowroomStore();
  const [loc, setLoc] = useState(readLocation);
  const [lang, setLang] = useLang();
  const now = useNow();

  useEffect(() => {
    const onPop = () => setLoc(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((url, { replace = false, keepScroll = false } = {}) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
    setLoc(readLocation());
    if (!keepScroll) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const shopName = store.settings?.shopName || 'Showroom 360';
  useEffect(() => {
    const prev = document.title;
    document.title = loc.view === 'admin' ? `Admin · ${shopName}` : shopName;
    return () => { document.title = prev; };
  }, [shopName, loc.view]);

  if (!store.ready) return <div className={styles.app} aria-busy="true" />;

  return (
    <ShowroomContext.Provider value={store}>
      <NavContext.Provider value={{ loc, navigate, lang, setLang, now, onBackToPortfolio }}>
        <ToastProvider>
          <CrashGuard onReset={store.resetDemo}>
            {loc.view === 'admin' ? (
              <Suspense fallback={<div className={styles.app} aria-busy="true" />}>
                <Admin />
              </Suspense>
            ) : (
              <PublicShell />
            )}
          </CrashGuard>
        </ToastProvider>
      </NavContext.Provider>
    </ShowroomContext.Provider>
  );
}

/* True while the home page's contact section sits across the middle of the screen */
function useContactInView(onHome) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    setInView(false);
    const el = onHome && document.getElementById('contact');
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '-45% 0px -45% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [onHome]);
  return inView;
}

function PublicShell() {
  const { settings, persistent } = useShowroom();
  const { loc, navigate, lang, setLang, onBackToPortfolio } = useNav();
  const atContact = useContactInView(loc.view === 'home');

  const go = (url) => (e) => { e.preventDefault(); navigate(url); };
  const goContact = (e) => {
    e.preventDefault();
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (loc.view === 'home') document.getElementById('contact')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    else navigate('/showroom#contact');
  };

  const links = [
    { id: 'home', href: '/showroom', label: t(lang, 'nav.home'), Icon: HomeIcon, onClick: go('/showroom') },
    { id: 'cars', href: '/showroom/cars', label: t(lang, 'nav.cars'), Icon: CarFront, onClick: go('/showroom/cars') },
    { id: 'contact', href: '/showroom#contact', label: t(lang, 'nav.contact'), Icon: Phone, onClick: goContact },
  ];
  const current = loc.view === 'car' ? 'cars' : atContact ? 'contact' : loc.view;
  /* Contact is a place on the home page, not a page of its own */
  const ariaCurrent = (id) => (current !== id ? undefined : id === 'contact' ? 'location' : 'page');

  const navItems = (cls) => (
    <nav className={cls} aria-label={t(lang, 'nav.menu')}>
      {links.map(l => (
        <a key={l.id} href={l.href} onClick={l.onClick} className={styles.navLink} aria-current={ariaCurrent(l.id)}>
          <l.Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>{l.label}</span>
        </a>
      ))}
    </nav>
  );

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/showroom" className={styles.brand} onClick={go('/showroom')}>
            <ShopLogo settings={settings} />
            <span>{settings.shopName}</span>
          </a>
          {navItems(styles.topNav)}
          <div className={styles.langSwitch} role="group" aria-label={t(lang, 'lang.switch')}>
            {[['en', 'EN'], ['ceb', 'CEB']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={lang === id} onClick={() => setLang(id)}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      {!persistent && <p className={styles.notice} role="status">{t(lang, 'storage.off')}</p>}

      <main className={styles.main}>
        {loc.view === 'home' && <Home />}
        {loc.view === 'cars' && <Inventory />}
        {loc.view === 'car' && <CarPage key={loc.id} id={loc.id} />}
        {loc.view === 'notfound' && (
          <div className={styles.empty}>
            <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
            <h1>{t(lang, 'car.notFound')}</h1>
            <a href="/showroom" className={styles.btnPrimary} onClick={go('/showroom')}>{t(lang, 'nav.home')}</a>
          </div>
        )}
      </main>

      <footer className={`${styles.footer} ${loc.view === 'car' ? styles.footerCar : ''}`}>
        <div className={styles.footerInner}>
          <p className={styles.footerShop}>{settings.shopName}{settings.address ? ` · ${settings.address}` : ''}</p>
          <p>{t(lang, 'footer.note')}</p>
          <button type="button" className={styles.textBtn} onClick={onBackToPortfolio}>{t(lang, 'footer.madeBy')}</button>
        </div>
      </footer>

      {loc.view !== 'car' && navItems(styles.bottomNav)}
    </div>
  );
}
