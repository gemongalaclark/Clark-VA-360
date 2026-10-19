import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { COUNTRIES } from './countries';
import styles from './ProfileModal.module.css';

/* Searchable country-code dropdown: type a country name, ISO code or dial code ("63", "+63", "ph") */
export default function CountryPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.dial.startsWith(q));
  }, [query]);

  const pick = (c) => { onChange(c); setOpen(false); setQuery(''); };

  return (
    <div className={styles.cpWrap} ref={root}>
      <button type="button" className={styles.cpBtn} onClick={() => setOpen(o => !o)} disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-label={`Country code, ${value.name} +${value.dial}`}>
        <span className={styles.cpIso}>{value.iso}</span>
        <span className={styles.cpDial}>+{value.dial}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className={styles.cpPop}>
          <div className={styles.cpSearch}>
            <Search size={14} />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code…" aria-label="Search country" />
          </div>
          <ul className={styles.cpList} role="listbox">
            {list.length === 0 && <li className={styles.cpEmpty}>No country found</li>}
            {list.map(c => (
              <li key={c.iso} role="option" aria-selected={c.iso === value.iso}>
                <button type="button" className={`${styles.cpItem} ${c.iso === value.iso ? styles.cpActive : ''}`} onClick={() => pick(c)}>
                  <span className={styles.cpIso}>{c.iso}</span>
                  <span className={styles.cpName}>{c.name}</span>
                  <span className={styles.cpDial}>+{c.dial}</span>
                  {c.iso === value.iso && <Check size={13} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
