import { useState, useEffect, useLayoutEffect } from 'react';
import styles from './Preloader.module.css';

const KEY = 'clarkva-intro-seen';
const COUNT_MS = 2200;
const CLOSE_MS = 340;
const SWEEP_MS = 900;

const CENTER = 240;
const RING_R = 196;
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const LABELS = [
  { text: 'Admin', angle: 0 },
  { text: 'Social', angle: 90 },
  { text: 'Leads', angle: 180 },
  { text: 'AI', angle: 270 },
];

const shouldPlay = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !sessionStorage.getItem(KEY); } catch { return true; }
};

/* Animating the sweep's conic mask needs a registered --sweep; older browsers fade out instead. */
const canSweep = () => typeof CSS !== 'undefined' && 'registerProperty' in CSS;

/* Bottom label sits below the ring unrotated so it stays upright; the others are tangent to it. */
const labelTransform = (angle) => (angle === 180 ? undefined : `rotate(${angle} ${CENTER} ${CENTER})`);
const labelY = (angle) => (angle === 180 ? CENTER + RING_R + 32 : CENTER - RING_R - 22);

/* Intro splash: a 360° dial sweeps around the logo (000° → 360°), then the screen opens with a
   clockwise radial sweep that reveals the hero.
   While it runs, <html> carries `intro-hold` so the hero's entrance animations wait for the sweep. */
export default function Preloader() {
  const [play] = useState(shouldPlay);
  const [phase, setPhase] = useState(play ? 'count' : 'gone'); // count | close | sweep | gone
  const [deg, setDeg] = useState(0);

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
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setDeg(Math.round(eased * 360));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase('close');
        t1 = setTimeout(() => {
          setPhase('sweep');
          document.documentElement.classList.remove('intro-hold');
          t2 = setTimeout(() => {
            document.body.style.overflow = '';
            try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked – replay next load */ }
            setPhase('gone');
          }, SWEEP_MS + 100);
        }, CLOSE_MS);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [play]);

  if (phase === 'gone') return null;

  const exit = canSweep() ? styles.sweep : styles.fade;

  return (
    <div
      className={`${styles.root} ${phase !== 'count' ? styles.closed : ''} ${phase === 'sweep' ? exit : ''}`}
      style={{ '--deg': `${deg}deg` }}
      role="status"
      aria-label="Loading portfolio"
    >
      <div className={styles.veil} aria-hidden="true">
        <div className={styles.center}>
          <div className={styles.dial}>
            <svg className={styles.svg} viewBox="0 0 480 480">
              <circle className={styles.track} cx={CENTER} cy={CENTER} r={RING_R} pathLength="360" />
              {TICKS.map((a, i) => (
                <line
                  key={a}
                  className={`${styles.tick} ${a % 90 === 0 ? styles.major : ''} ${a <= deg ? styles.tickLit : ''}`}
                  style={{ '--i': i }}
                  x1={CENTER}
                  x2={CENTER}
                  y1={CENTER - RING_R + 6}
                  y2={CENTER - RING_R + (a % 90 === 0 ? 20 : 12)}
                  transform={`rotate(${a} ${CENTER} ${CENTER})`}
                />
              ))}
              <circle
                className={styles.arc}
                cx={CENTER}
                cy={CENTER}
                r={RING_R}
                pathLength="360"
                strokeDasharray={`${deg} 360`}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              />
              <circle className={styles.pulse} cx={CENTER} cy={CENTER} r={RING_R} />
              <circle
                className={styles.head}
                cx={CENTER}
                cy={CENTER - RING_R}
                r="5"
                transform={`rotate(${deg} ${CENTER} ${CENTER})`}
              />
              {LABELS.map(l => (
                <text
                  key={l.text}
                  className={`${styles.compass} ${deg > l.angle ? styles.compassLit : ''}`}
                  x={CENTER}
                  y={labelY(l.angle)}
                  textAnchor="middle"
                  transform={labelTransform(l.angle)}
                >
                  {l.text}
                </text>
              ))}
            </svg>
            <img className={styles.logoDim} src="/images/logo-preloader.webp" alt="" width="900" height="805" />
            <img className={styles.logo} src="/images/logo-preloader.webp" alt="" width="900" height="805" />
          </div>
          <div className={styles.readout}>
            <span className={styles.count}>{String(deg).padStart(3, '0')}°</span>
            <span className={styles.label}>Clark Gemongala</span>
          </div>
        </div>
      </div>
      <span className={styles.hand} aria-hidden="true" />
    </div>
  );
}
