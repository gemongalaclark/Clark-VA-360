import { useEffect, useRef } from 'react';
import styles from './Cursor.module.css';

/* Minimal trailing dot cursor for mouse devices. The native cursor stays visible. */
export default function Cursor() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ok = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!ok) return undefined;

    let tx = -100, ty = -100, x = -100, y = -100, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      el.style.transform = `translate(${x}px, ${y}px)`;
      raf = Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      el.dataset.on = '1';
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onOver = (e) => {
      el.dataset.hover = e.target.closest?.('a, button, input, textarea, select, [role="button"]') ? '1' : '0';
    };
    const onLeave = () => { el.dataset.on = '0'; };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className={styles.cursor} aria-hidden="true"><span /></div>;
}
