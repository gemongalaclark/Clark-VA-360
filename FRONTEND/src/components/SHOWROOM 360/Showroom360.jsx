import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Home as HomeIcon, CarFront, Phone, SearchX } from 'lucide-react';
import styles from './Showroom360.module.css';
import { ShowroomContext, useShowroomStore, useShowroom } from './store.js';
import { useLang, t } from './i18n.js';
import { NavContext, useNav, ToastProvider, ShopLogo, useTheme, ThemeToggle } from './ui.jsx';
import { parseShowroomPath, carTitle } from './showroomRules.js';
import { sampleCredit } from './samplePhotos.js';
import Home, { telHref } from './public/Home.jsx';
import Inventory from './public/Inventory.jsx';
import CarPage from './public/CarPage.jsx';
import Legal from './public/Legal.jsx';
import PromoPopup from './public/PromoPopup.jsx';
import TopStrip from './public/TopStrip.jsx';
import { LEGAL_KINDS } from './legalText.js';

/* The admin is its own download: buyers never load it */
const Admin = lazy(() => import('./admin/Admin.jsx'));

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
  const [theme, toggleTheme] = useTheme();
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
    document.title = loc.view === 'admin' ? `Admin · ${shopName}`
      : LEGAL_KINDS.includes(loc.view) ? `${t(lang, `legal.${loc.view}`)} · ${shopName}` : shopName;
    return () => { document.title = prev; };
  }, [shopName, loc.view, lang]);

  if (!store.ready) return <div className={styles.app} aria-busy="true" />;

  return (
    <ShowroomContext.Provider value={store}>
      <NavContext.Provider value={{ loc, navigate, lang, setLang, theme, toggleTheme, now, onBackToPortfolio }}>
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

/* True while the home page's contact section sits across the middle of the screen.
   Measured before the first paint, so arriving at /showroom#contact from another
   page never shows Home for a moment (Home jumps to #contact first: children's
   layout effects run before this one). */
function useContactInView(onHome) {
  const [inView, setInView] = useState(false);
  useLayoutEffect(() => {
    const el = onHome ? document.getElementById('contact') : null;
    const box = el?.getBoundingClientRect();
    setInView(!!box && box.top < window.innerHeight * 0.55 && box.bottom > window.innerHeight * 0.45);
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '-45% 0px -45% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [onHome]);
  return inView;
}

/* True while the page's photo hero ([data-sr-hero]) is still under the header, so
   the header can be see-through over it. Pages without one get the solid header
   straight away, measured before the first paint of each page. */
function useOverHero(pageKey) {
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const el = document.querySelector('[data-sr-hero]');
    if (!el) { setOver(false); return undefined; }
    const headerH = parseFloat(getComputedStyle(el).getPropertyValue('--header-h')) || 64;
    setOver(el.getBoundingClientRect().bottom > headerH + 1);
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setOver(entry.isIntersecting), { rootMargin: `-${headerH + 1}px 0px 0px 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [pageKey]);
  return over;
}

function PublicShell() {
  const { settings, persistent, cars } = useShowroom();
  const { loc, navigate, lang, setLang, onBackToPortfolio } = useNav();
  /* every bundled sample photo still on a car, for the credits in the footer */
  const credits = cars.flatMap(car => car.photoIds
    .map(id => ({ id, car, credit: sampleCredit(id) }))
    .filter(x => x.credit));
  const atContact = useContactInView(loc.view === 'home');
  const overHero = useOverHero(`${loc.view}/${loc.id || ''}`);

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

  /* the top nav leaves Contact out: on wide screens it's the white button at the right */
  const navItems = (cls, only) => (
    <nav className={cls} aria-label={t(lang, 'nav.menu')}>
      {links.filter(l => !only || only.includes(l.id)).map(l => (
        <a key={l.id} href={l.href} onClick={l.onClick} className={styles.navLink} aria-current={ariaCurrent(l.id)}>
          <l.Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>{l.label}</span>
        </a>
      ))}
    </nav>
  );
  const contact = links.find(l => l.id === 'contact');
  const footLink = (href, onClick, label, current) => (
    <a href={href} onClick={onClick} className={styles.footerLink} aria-current={current}>{label}</a>
  );

  return (
    <div className={styles.app}>
      {/* the notice comes first: a photo hero slides up under the header */}
      {!persistent && <p className={styles.notice} role="status">{t(lang, 'storage.off')}</p>}
      <TopStrip />
      <header className={`${styles.header} ${styles.onDark} ${overHero ? styles.headerClear : ''}`}>
        <div className={styles.headerInner}>
          <a href="/showroom" className={styles.brand} onClick={go('/showroom')}>
            <ShopLogo settings={settings} />
            <span>{settings.shopName}</span>
          </a>
          {navItems(styles.topNav, ['home', 'cars'])}
          <div className={styles.headerEnd}>
            <div className={styles.langSwitch} role="group" aria-label={t(lang, 'lang.switch')}>
              {[['en', 'EN'], ['ceb', 'CEB']].map(([id, label]) => (
                <button key={id} type="button" aria-pressed={lang === id} onClick={() => setLang(id)}>{label}</button>
              ))}
            </div>
            <ThemeToggle className={styles.iconBtn} />
            <a href={contact.href} onClick={contact.onClick} className={styles.contactBtn} aria-current={ariaCurrent('contact')}>
              {contact.label}
            </a>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {loc.view === 'home' && <Home />}
        {loc.view === 'cars' && <Inventory />}
        {loc.view === 'car' && <CarPage key={loc.id} id={loc.id} />}
        {LEGAL_KINDS.includes(loc.view) && <Legal kind={loc.view} />}
        {loc.view === 'notfound' && (
          <div className={styles.empty}>
            <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
            <h1>{t(lang, 'car.notFound')}</h1>
            <a href="/showroom" className={styles.btnPrimary} onClick={go('/showroom')}>{t(lang, 'nav.home')}</a>
          </div>
        )}
      </main>

      {/* the event's prize wheel: a gift button on the home page (public pages only) */}
      <PromoPopup />

      <footer className={`${styles.footer} ${styles.onDark} ${loc.view === 'car' ? styles.footerCar : ''}`}>
        <div className={styles.footerInner}>
          <div className={styles.footerGrid}>
            <div className={`${styles.footerCol} ${styles.footerShopCol}`}>
              <p className={styles.footerShop}><ShopLogo settings={settings} /><span>{settings.shopName}</span></p>
              <p className={styles.footerNote}>{t(lang, 'footer.note')}</p>
              <p className={styles.footerNote}>© {new Date().getFullYear()} {settings.shopName}</p>
            </div>
            <nav className={styles.footerCol} aria-label={t(lang, 'nav.menu')}>
              <p className={styles.footerHead}>{t(lang, 'nav.menu')}</p>
              {links.map(l => <span key={l.id}>{footLink(l.href, l.onClick, l.label, ariaCurrent(l.id))}</span>)}
            </nav>
            <nav className={styles.footerCol} aria-label={t(lang, 'legal.nav')}>
              <p className={styles.footerHead}>{t(lang, 'legal.nav')}</p>
              {LEGAL_KINDS.map(k => (
                <span key={k}>{footLink(`/showroom/${k}`, go(`/showroom/${k}`), t(lang, `legal.${k}`), loc.view === k ? 'page' : undefined)}</span>
              ))}
            </nav>
            {(settings.phone || settings.hours || settings.address) && (
              <div className={`${styles.footerCol} ${styles.footerContact}`}>
                <p className={styles.footerHead}>{t(lang, 'nav.contact')}</p>
                {settings.phone && footLink(telHref(settings.phone), undefined, settings.phone)}
                {settings.hours && <p className={styles.footerFact}>{settings.hours}</p>}
                {settings.address && <p className={styles.footerFact}>{settings.address}</p>}
              </div>
            )}
          </div>
          {credits.length > 0 && (
            <details className={styles.credits}>
              <summary>{t(lang, 'photo.credits')}</summary>
              <p>{t(lang, 'photo.creditsHint')}</p>
              <ul>
                {credits.map(({ id, car, credit }) => (
                  <li key={`${car.id}-${id}`}>
                    {carTitle(car)}, {t(lang, `angle.${id.split('-').pop()}`)}:{' '}
                    <a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.author}</a>, {credit.license}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <button type="button" className={styles.textBtn} onClick={onBackToPortfolio}>{t(lang, 'footer.madeBy')}</button>
        </div>
        <p className={styles.wordmark} style={{ '--len': Math.max(6, String(settings.shopName || '').length) }} aria-hidden="true">
          {settings.shopName}
        </p>
      </footer>

      {loc.view !== 'car' && navItems(styles.bottomNav)}
    </div>
  );
}
