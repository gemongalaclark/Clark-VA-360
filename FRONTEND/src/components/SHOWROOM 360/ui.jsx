/* Small pieces shared by the public site and the admin */
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { X, Moon, Sun } from 'lucide-react';
import styles from './Showroom360.module.css';
import { useShowroom } from './store.js';
import { formatPeso, saveErrorKind, themeFor, themeToSave } from './showroomRules.js';
import { t } from './i18n.js';
import CarArt from './CarArt.jsx';

export const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

/* In-app link: keeps the real href for new-tab clicks, navigates in place otherwise */
export function Link({ to, children, ...rest }) {
  const { navigate } = useNav();
  const onClick = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={onClick} {...rest}>{children}</a>;
}

/* ── dark mode ── */

const THEME_KEY = 'showroom360:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/* Follows the device until the visitor flips the switch (kept in this browser).
   The theme is put on <html data-sr-theme> so the page background, the toast and
   every dialog pick it up; it's removed when the showroom closes. */
export function useTheme() {
  const [deviceDark, setDeviceDark] = useState(() => !!window.matchMedia?.(DARK_QUERY).matches);
  const [saved, setSaved] = useState(() => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } });
  const theme = themeFor(saved, deviceDark);

  useEffect(() => {
    const mq = window.matchMedia?.(DARK_QUERY);
    if (!mq) return undefined;
    const on = () => setDeviceDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.srTheme = theme;
    return () => { delete root.dataset.srTheme; };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = themeToSave(theme === 'dark' ? 'light' : 'dark', deviceDark);
    setSaved(next);
    try {
      if (next) localStorage.setItem(THEME_KEY, next); else localStorage.removeItem(THEME_KEY);
    } catch { /* private mode: keep it for this visit only */ }
  }, [theme, deviceDark]);

  return [theme, toggleTheme];
}

/* Icon button that names what it switches to. `children` adds a visible label (admin sidebar). */
export function ThemeToggle({ className, children }) {
  const { theme, toggleTheme, lang, loc } = useNav();
  const dark = theme === 'dark';
  const label = loc.view === 'admin'
    ? (dark ? 'Switch to light mode' : 'Switch to dark mode')
    : t(lang, dark ? 'theme.toLight' : 'theme.toDark');
  const Icon = dark ? Sun : Moon;
  return (
    <button type="button" className={className} onClick={toggleTheme} aria-label={label} title={label}>
      <Icon size={children ? 18 : 20} strokeWidth={1.75} aria-hidden="true" />{children}
    </button>
  );
}

/* ── toasts ── */

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const nav = useNav();
  const dismiss = nav?.loc?.view === 'admin' ? 'Dismiss' : t(nav?.lang || 'en', 'common.dismiss');
  const show = useCallback((message, action) => {
    clearTimeout(timer.current);
    setToast({ message, action, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), action ? 8000 : 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.toastRegion} role="status" aria-live="polite">
        {toast && (
          <div className={styles.toast} key={toast.key}>
            <span>{toast.message}</span>
            {toast.action && (
              <button type="button" onClick={() => { toast.action.onClick(); setToast(null); }}>{toast.action.label}</button>
            )}
            <button type="button" className={styles.toastClose} aria-label={dismiss} onClick={() => setToast(null)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/* Admin wording for a failed save */
export const adminSaveError = (err) => (saveErrorKind(err) === 'full'
  ? 'This browser’s storage is full. Delete some photos or old cars, then try again.'
  : 'Could not save. Please try again.');

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

/* ── shop and car visuals ── */

export function ShopLogo({ settings, size = 'md' }) {
  const { photoUrl } = useShowroom();
  const url = photoUrl(settings.logoPhotoId);
  const initials = String(settings.shopName || 'S').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return url
    ? <img src={url} alt="" className={`${styles.logo} ${styles[`logo_${size}`]}`} />
    : <span className={`${styles.logo} ${styles.logoMark} ${styles[`logo_${size}`]}`} aria-hidden="true">{initials}</span>;
}

/* The car's photo, or its silhouette when it has none */
export function CarPhoto({ car, index = 0, label, className }) {
  const { photoUrl } = useShowroom();
  const url = photoUrl(car.photoIds?.[index]);
  if (url) return <img src={url} alt={label || ''} className={`${styles.photo} ${className || ''}`} loading="lazy" decoding="async" />;
  return (
    <div className={`${styles.photo} ${styles.photoArt} ${className || ''}`}>
      <CarArt body={car.body} color={car.color} label={label} />
    </div>
  );
}

export function PriceTag({ info, wasLabel = 'was', className }) {
  return (
    <span className={`${styles.priceTag} ${className || ''}`}>
      <span className={info.original ? styles.priceSale : undefined}>{formatPeso(info.price)}</span>
      {info.original && <s className={styles.priceWas}><span className={styles.srOnly}>{wasLabel} </span>{formatPeso(info.original)}</s>}
    </span>
  );
}

/* ── dialog / bottom sheet (native <dialog>: focus trap and Esc for free) ── */

export function Sheet({ open, onClose, title, children, wide = false, closeLabel = 'Close' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`${styles.sheet} ${wide ? styles.sheetWide : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className={styles.sheetInner}>
          <div className={styles.sheetHead}>
            <h2 id={titleId}>{title}</h2>
            <button type="button" className={styles.iconBtn} onClick={onClose} aria-label={closeLabel}>
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.sheetBody}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
