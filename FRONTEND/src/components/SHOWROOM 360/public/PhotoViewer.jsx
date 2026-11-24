import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t } from '../i18n.js';
import { sampleCredit } from '../samplePhotos.js';
import { clampView, zoomAt, ZOOM_MAX } from '../showroomRules.js';

const FIT = { s: 1, x: 0, y: 0 };
const TAP_MS = 300;
const SWIPE_PX = 50;

/* A car's photos full screen. Pinch, double-tap, the wheel or the +/− buttons zoom;
   drag pans while zoomed; swipe, the arrows or the arrow keys change photo.
   The phone's Back button closes it (it adds one history step while open). */
export default function PhotoViewer({ car, title, lang, index, onIndex, onClose }) {
  const { photoUrl } = useShowroom();
  const dialog = useRef(null);
  const stage = useRef(null);
  const img = useRef(null);
  const [view, setViewState] = useState(FIT);
  const viewRef = useRef(FIT);
  const [moving, setMoving] = useState(false);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(null);

  const total = car.photoIds.length;
  const url = photoUrl(car.photoIds[index]);
  const credit = sampleCredit(car.photoIds[index]);

  /* The photo's size on screen at 1x (object-fit: contain) and the frame's */
  const box = () => {
    const st = stage.current;
    const im = img.current;
    const boxW = st?.clientWidth || 1;
    const boxH = st?.clientHeight || 1;
    const nw = im?.naturalWidth || boxW;
    const nh = im?.naturalHeight || boxH;
    const fit = Math.min(boxW / nw, boxH / nh);
    return { imgW: nw * fit, imgH: nh * fit, boxW, boxH };
  };
  const setView = useCallback((v) => {
    const next = clampView(v, box());
    viewRef.current = next;
    setViewState(next);
  }, []);
  /* a point on screen, measured from the frame's centre */
  const fromCentre = (clientX, clientY) => {
    const r = stage.current.getBoundingClientRect();
    return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
  };
  const zoomBy = (k, fx = 0, fy = 0) => {
    const v = viewRef.current;
    const s2 = Math.max(1, Math.min(ZOOM_MAX, v.s * k));
    /* close enough to fitted: snap back exactly */
    setView(s2 < 1.05 ? FIT : zoomAt(v, s2, fx, fy));
  };

  const go = useCallback((d) => {
    if (total > 1) onIndex((index + d + total) % total);
  }, [index, total, onIndex]);

  /* a new photo starts fitted */
  useEffect(() => { viewRef.current = FIT; setViewState(FIT); }, [index]);

  /* Open as a modal, and let Back close it */
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    if (!window.history.state?.srViewer) window.history.pushState({ ...(window.history.state || {}), srViewer: true }, '');
    const onPop = () => onClose(true);
    window.addEventListener('popstate', onPop);
    /* the page behind stays still (and its scrollbar out of the way) */
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => { window.removeEventListener('popstate', onPop); root.style.overflow = before; };
  }, [onClose]);

  /* The wheel needs a non-passive listener to stop the page scrolling */
  useEffect(() => {
    const st = stage.current;
    const onWheel = (e) => {
      e.preventDefault();
      const p = fromCentre(e.clientX, e.clientY);
      zoomBy(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y);
    };
    st?.addEventListener('wheel', onWheel, { passive: false });
    return () => st?.removeEventListener('wheel', onWheel);
  });

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const v = viewRef.current;
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = {
        kind: 'pinch', view: v, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
    } else if (pts.length === 1) {
      gesture.current = { kind: 'pan', view: v, x: pts[0].x, y: pts[0].y, at: Date.now(), moved: false };
    } else gesture.current = null;
  };

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return;
    stage.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setMoving(true);
    startGesture();
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      const s2 = Math.max(1, Math.min(ZOOM_MAX, g.view.s * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist)));
      const mid = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      const v = zoomAt(g.view, s2, g.mid.x, g.mid.y);
      setView({ s: v.s, x: v.x + (mid.x - g.mid.x), y: v.y + (mid.y - g.mid.y) });
    } else {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.hypot(dx, dy) > 8) g.moved = true;
      if (g.view.s > 1) setView({ s: g.view.s, x: g.view.x + dx, y: g.view.y + dy });
    }
  };

  const onPointerUp = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (g?.kind === 'pan' && pointers.current.size === 0) {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (g.view.s === 1 && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1);
      } else if (!g.moved && Date.now() - g.at < TAP_MS) {
        /* double-tap: zoom in at that spot, or back out */
        const prev = lastTap.current;
        const now = Date.now();
        if (prev && now - prev.at < TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30) {
          lastTap.current = null;
          const p = fromCentre(e.clientX, e.clientY);
          if (viewRef.current.s > 1) setView(FIT);
          else setView(zoomAt(viewRef.current, 2.5, p.x, p.y));
        } else lastTap.current = { at: now, x: e.clientX, y: e.clientY };
      }
    }
    /* a pinch that drops to one finger carries on as a pan */
    startGesture();
    if (pointers.current.size === 0) setMoving(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === '+' || e.key === '=') zoomBy(1.5);
    else if (e.key === '-') zoomBy(1 / 1.5);
  };

  const mouse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
  const label = total > 1 ? `${title}, ${t(lang, 'car.photo', { n: index + 1, total })}` : title;

  return (
    <dialog
      ref={dialog}
      className={styles.viewer}
      aria-label={label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onKeyDown={onKeyDown}
    >
      <div className={styles.viewerBar}>
        <span className={styles.viewerCount} aria-hidden={total < 2}>{total > 1 ? `${index + 1} / ${total}` : ''}</span>
        <button type="button" className={styles.viewerBtn} onClick={() => zoomBy(1 / 1.5)} disabled={view.s <= 1} aria-label={t(lang, 'car.zoomOut')}>
          <ZoomOut size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button type="button" className={styles.viewerBtn} onClick={() => zoomBy(1.5)} disabled={view.s >= ZOOM_MAX} aria-label={t(lang, 'car.zoomIn')}>
          <ZoomIn size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button type="button" className={styles.viewerBtn} onClick={() => onClose()} aria-label={t(lang, 'common.close')}>
          <X size={24} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div
        ref={stage}
        className={styles.viewerStage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {url && (
          <img
            ref={img}
            src={url}
            alt={label}
            draggable={false}
            className={`${styles.viewerImg} ${moving ? styles.viewerMoving : ''}`}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, cursor: view.s > 1 ? 'grab' : 'zoom-in' }}
          />
        )}
        {total > 1 && (
          <>
            <button type="button" className={`${styles.viewerBtn} ${styles.viewerPrev}`} onClick={() => go(-1)} aria-label={t(lang, 'car.prevPhoto')}>
              <ChevronLeft size={26} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.viewerBtn} ${styles.viewerNext}`} onClick={() => go(1)} aria-label={t(lang, 'car.nextPhoto')}>
              <ChevronRight size={26} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className={styles.viewerFoot}>
        <p>{t(lang, mouse ? 'car.zoomHintMouse' : 'car.zoomHint')}</p>
        {credit && (
          <p>
            {t(lang, 'photo.credit')}{' '}
            <a href={credit.source} target="_blank" rel="noopener noreferrer">{credit.author}</a>, {credit.license}
          </p>
        )}
      </div>
    </dialog>
  );
}
