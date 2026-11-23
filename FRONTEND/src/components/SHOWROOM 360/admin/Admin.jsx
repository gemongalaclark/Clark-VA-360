/* Dealer admin at /showroom/admin. Not linked from the public site.
   One sign-in page, two PINs: the admin (cars, events, leads) and the superadmin
   (everything, plus Settings and History). The PINs are a demo lock, not security:
   the code ships to every visitor, and the data lives in this browser anyway.
   A real dealer version needs real logins. */
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, CarFront, CalendarRange, Inbox, Settings as SettingsIcon, History as HistoryIcon,
  ExternalLink, Lock, SearchX, ShieldAlert,
} from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, Link, ShopLogo, ThemeToggle } from '../ui.jsx';
import Dashboard from './Dashboard.jsx';
import CarsAdmin from './CarsAdmin.jsx';
import CarForm from './CarForm.jsx';
import EventsAdmin from './EventsAdmin.jsx';
import EventForm from './EventForm.jsx';
import Leads from './Leads.jsx';
import Settings from './Settings.jsx';
import History from './History.jsx';
import { roleForPin, canOpen } from '../showroomRules.js';

const UNLOCK_KEY = 'showroom360:unlocked';

/* History lives in the phone's top bar, not the bottom tabs (they stay at 5 or fewer) */
const PAGES = [
  { id: 'dashboard', label: 'Dashboard', path: '/showroom/admin', Icon: LayoutDashboard },
  { id: 'cars', label: 'Cars', path: '/showroom/admin/cars', Icon: CarFront },
  { id: 'events', label: 'Events', path: '/showroom/admin/events', Icon: CalendarRange },
  { id: 'leads', label: 'Leads', path: '/showroom/admin/leads', Icon: Inbox },
  { id: 'history', label: 'History', path: '/showroom/admin/history', Icon: HistoryIcon, noTab: true },
  { id: 'settings', label: 'Settings', path: '/showroom/admin/settings', Icon: SettingsIcon },
];
const ROLE_LABEL = { admin: 'Admin', superadmin: 'Superadmin' };

const readRole = () => {
  try { const r = sessionStorage.getItem(UNLOCK_KEY); return ROLE_LABEL[r] ? r : null; } catch { return null; }
};

export default function Admin() {
  const { settings, leads, persistent, setActor } = useShowroom();
  const { loc, theme } = useNav();
  const [role, setRole] = useState(readRole);

  /* Every change made from here is stamped with this role in the history */
  useEffect(() => { setActor(role); }, [role, setActor]);

  const unlock = (r) => {
    try { sessionStorage.setItem(UNLOCK_KEY, r); } catch { /* fine: stays unlocked for this page view */ }
    setRole(r);
  };
  const lock = () => {
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
    setRole(null);
  };

  if (!role) return <PinGate settings={settings} onUnlock={unlock} />;

  const newLeads = leads.filter(l => l.status === 'new').length;
  const sub = String(loc.sub || 'dashboard').toLowerCase();
  const pages = PAGES.filter(p => canOpen(role, p.id));

  let page;
  if (PAGES.some(p => p.id === sub) && !canOpen(role, sub)) page = <SuperadminOnly />;
  else if (sub === 'dashboard') page = <Dashboard role={role} />;
  else if (sub === 'cars' && !loc.id) page = <CarsAdmin />;
  else if (sub === 'cars') page = <CarForm key={loc.id} id={loc.id} />;
  else if (sub === 'events' && !loc.id) page = <EventsAdmin />;
  else if (sub === 'events') page = <EventForm key={loc.id} id={loc.id} />;
  else if (sub === 'leads') page = <Leads />;
  else if (sub === 'settings') page = <Settings />;
  else if (sub === 'history') page = <History />;
  else page = <AdminNotFound />;

  const navItems = (cls, list) => (
    <nav className={cls} aria-label="Admin pages" style={{ '--tabs': list.length }}>
      {list.map(p => (
        <Link key={p.id} to={p.path} className={a.navItem} aria-current={sub === p.id ? 'page' : undefined}>
          <span className={a.navIcon}>
            <p.Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            {p.id === 'leads' && newLeads > 0 && <span className={a.navBadge} aria-label={`${newLeads} new`}>{newLeads}</span>}
          </span>
          <span>{p.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className={`${s.app} ${a.admin}`}>
      <aside className={a.sidebar}>
        <div className={a.sideBrand}>
          <ShopLogo settings={settings} />
          <div>
            <p className={a.sideName}>{settings.shopName}</p>
            <p className={a.sideRole}>{ROLE_LABEL[role]}</p>
          </div>
        </div>
        {navItems(a.sideNav, pages)}
        <div className={a.sideFoot}>
          <a href="/showroom" target="_blank" rel="noopener noreferrer" className={a.sideLink}>
            <ExternalLink size={18} strokeWidth={1.75} aria-hidden="true" />View site
          </a>
          <ThemeToggle className={a.sideLink}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</ThemeToggle>
          <button type="button" className={a.sideLink} onClick={lock}>
            <Lock size={18} strokeWidth={1.75} aria-hidden="true" />Lock
          </button>
        </div>
      </aside>

      <header className={a.topBar}>
        <div className={a.topBrand}>
          <ShopLogo settings={settings} />
          <span className={a.topName}>
            <span>{settings.shopName}</span>
            <span className={a.topRole}>{ROLE_LABEL[role]}</span>
          </span>
        </div>
        {canOpen(role, 'history') && (
          <Link to="/showroom/admin/history" className={s.iconBtn} aria-label="History" aria-current={sub === 'history' ? 'page' : undefined}>
            <HistoryIcon size={20} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
        <ThemeToggle className={s.iconBtn} />
        <a href="/showroom" target="_blank" rel="noopener noreferrer" className={s.iconBtn} aria-label="View site (new tab)">
          <ExternalLink size={20} strokeWidth={1.75} aria-hidden="true" />
        </a>
        <button type="button" className={s.iconBtn} onClick={lock} aria-label="Lock admin">
          <Lock size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </header>

      <main className={a.main}>
        {!persistent && <p className={s.notice} role="status">This browser can’t save changes (private window?), so edits are lost when you leave or reload.</p>}
        {page}
      </main>

      {navItems(a.bottomNav, pages.filter(p => !p.noTab))}
    </div>
  );
}

function PinGate({ settings, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const role = roleForPin(pin, settings);
    if (role) onUnlock(role);
    else { setError('That PIN is not right.'); setPin(''); }
  };
  return (
    <div className={`${s.app} ${a.gateWrap}`}>
      <form className={a.gate} onSubmit={submit}>
        <ShopLogo settings={settings} size="lg" />
        <h1 className={s.h2}>{settings.shopName}</h1>
        <p className={s.muted}>Admin. Enter the PIN to manage cars, events and leads.</p>
        <div className={s.field}>
          <label htmlFor="sr-pin" className={s.fieldLabel}>PIN</label>
          <input
            id="sr-pin"
            className={`${s.input} ${a.pinInput}`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'sr-pin-err' : undefined}
            autoFocus
          />
          {error && <p id="sr-pin-err" className={s.error} role="alert">{error}</p>}
        </div>
        <button type="submit" className={`${s.btnPrimary} ${s.btnBlock}`}>Unlock</button>
        <Link to="/showroom" className={s.textBtn}>Back to the site</Link>
      </form>
    </div>
  );
}

function SuperadminOnly() {
  return (
    <div className={s.empty}>
      <ShieldAlert size={40} strokeWidth={1.5} aria-hidden="true" />
      <h1>Superadmin only</h1>
      <p>Settings and History open with the superadmin PIN. Lock the admin and sign in again to switch.</p>
      <Link to="/showroom/admin" className={s.btnPrimary}>Go to dashboard</Link>
    </div>
  );
}

function AdminNotFound() {
  return (
    <div className={s.empty}>
      <SearchX size={40} strokeWidth={1.5} aria-hidden="true" />
      <h1>Page not found</h1>
      <Link to="/showroom/admin" className={s.btnPrimary}>Go to dashboard</Link>
    </div>
  );
}
