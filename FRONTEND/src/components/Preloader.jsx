import { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import styles from './Preloader.module.css';

const KEY = 'clarkva-intro-seen';
const COLS = 14;
const ROWS = 8;
const COUNT_MS = 1900;
const WIPE_MS = 1100;

const shouldPlay = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !sessionStorage.getItem(KEY); } catch { return true; }
};

/* Intro splash: logo + 000→100 counter, then a stepped block wipe that reveals the hero.
   While it runs, <html> carries `intro-hold` so the hero's entrance animations wait for the wipe. */
export default function Preloader() {
  const [play] = useState(shouldPlay);
  const [phase, setPhase] = useState(play ? 'count' : 'gone'); // count | wipe | gone
  const [n, setN] = useState(0);

  const blocks = useMemo(() => {
    const out = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const delay = ((c * 7 + r * 5) % COLS) * 0.045 + c * 0.018;
        out.push({ key: `${r}-${c}`, delay });
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    if (!play) return undefined;
    const root = document.documentElement;
    root.classList.add('intro-hold');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => {
      root.classList.remove('intro-hold');
      document.body.style.overflow = prevOverflow;
    };
  }, [play]);

  useEffect(() => {
    if (!play) return undefined;
    let raf = 0;
    let t1 = 0;
    let t2 = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 2.2);
      setN(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        t1 = setTimeout(() => {
          setPhase('wipe');
          document.documentElement.classList.remove('intro-hold');
          t2 = setTimeout(() => {
            document.body.style.overflow = '';
            try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked – replay next load */ }
            setPhase('gone');
          }, WIPE_MS + 450);
        }, 280);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [play]);

  if (phase === 'gone') return null;

  return (
    <div
      className={`${styles.root} ${phase === 'wipe' ? styles.wipe : ''}`}
      role="status"
      aria-label="Loading portfolio"
    >
      <div className={styles.grid} aria-hidden="true" style={{ '--cols': COLS, '--rows': ROWS }}>
        {blocks.map(b => (
          <span key={b.key} className={styles.block} style={{ '--d': `${b.delay}s` }} />
        ))}
      </div>

      <div className={styles.center} aria-hidden="true">
        <img className={styles.logo} src="/images/logo-preloader.webp" alt="" width="900" height="805" />
        <span className={styles.rule} />
        <div className={styles.meta}>
          <span className={styles.label}>Clark Gemongala</span>
          <span className={styles.count}>{String(n).padStart(3, '0')}</span>
        </div>
      </div>
    </div>
  );
}
