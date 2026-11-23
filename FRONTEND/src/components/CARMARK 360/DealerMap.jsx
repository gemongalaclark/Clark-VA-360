import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Plus, Minus, Maximize2, MapPin } from 'lucide-react';
import styles from './CarMark360.module.css';
import { TILE, project, fitView, visibleTiles, clusterPins } from './carmarkRules';

/* Esri's Light Gray Canvas: a quiet grey street map, plus its transparent layer of place names.
   No key needed; the attribution is shown on the map. (OpenStreetMap's own servers block apps,
   and CARTO now needs a key.) Note Esri's tile order is z/y/x. */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
const baseUrl = ({ z, x, y }) => `${ESRI}/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`;
const labelUrl = ({ z, x, y }) => `${ESRI}/World_Light_Gray_Reference/MapServer/tile/${z}/${y}/${x}`;

const MIN_Z = 3;
const MAX_Z = 16; // the grey canvas has no tiles beyond 16
const PAD = 40;            // keeps pins (about 32 px tall) clear of the frame's edge
const CLUSTER_RADIUS = 28; // pins closer than this on screen merge into one bubble
const SIDE = 56;           // the zoom buttons' column on the right
const TOP = 40;            // the "N dealers" tag on the top left

/* A map that shows every dealer at once. pins: [{ dealer, no }] for dealers with coordinates. */
export default function DealerMap({ pins, selected, focus, onSelect }) {
  const frameRef = useRef(null);
  const [size, setSize] = useState(null);
  const [view, setView] = useState(null);
  const drag = useRef(null);

  /* Track the frame's size */
  useLayoutEffect(() => {
    const el = frameRef.current;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Fit all the pins whenever the list (area filter) or the frame size changes */
  const pinKey = pins.map(p => p.no).join(',');
  /* Fit dealers into the part of the frame the buttons and the tag don't cover */
  const fitClear = (dealers, extra = 0, maxZ = 16) => {
    const narrow = size.w < 500; // phones: slimmer margins, so the dealers still fit one zoom level closer
    const side = narrow ? 50 : SIDE;
    const v = fitView(dealers, size.w - side, size.h - TOP, (narrow ? 16 : PAD) + extra, maxZ);
    return { ...v, cx: v.cx + side / 2, cy: v.cy - TOP / 2 };
  };
  const fitAll = () => {
    if (size) setView(fitClear(pins.map(p => p.dealer)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fitAll(); }, [pinKey, size?.w, size?.h]);

  /* "Show on map" from the list: centre on that dealer, close enough to see the street */
  useEffect(() => {
    const d = focus?.dealer;
    if (!d || d.lat == null) return;
    setView(v => {
      const z = Math.min(MAX_Z, Math.max(v?.z ?? 15, 15));
      const c = project(d.lat, d.lng, z);
      return { z, cx: c.x, cy: c.y };
    });
  }, [focus]);

  const zoom = (dz) => setView(v => {
    const z = Math.min(MAX_Z, Math.max(MIN_Z, v.z + dz));
    const k = 2 ** (z - v.z);
    return { z, cx: v.cx * k, cy: v.cy * k };
  });

  /* Drag to pan with a mouse; on phones the page keeps scrolling normally */
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, a')) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    setView(v => ({ ...v, cx: d.cx - (e.clientX - d.x), cy: d.cy - (e.clientY - d.y) }));
  };
  const endDrag = () => { drag.current = null; };

  const ready = size && view;
  const left = ready ? view.cx - size.w / 2 : 0;
  const top = ready ? view.cy - size.h / 2 : 0;

  /* Pins on screen; the selected dealer always gets its own pin, the rest are grouped when they overlap */
  const placed = ready ? pins.map(p => {
    const w = project(p.dealer.lat, p.dealer.lng, view.z);
    return { ...p, x: w.x - left, y: w.y - top };
  }) : [];
  const chosen = placed.find(p => p.dealer === selected);
  const groups = clusterPins(placed.filter(p => p !== chosen), CLUSTER_RADIUS);

  /* A bubble tapped: zoom in until its dealers separate */
  const openGroup = (members) => {
    onSelect(null);
    setView(v => {
      const next = fitClear(members.map(m => m.dealer), 20, MAX_Z);
      if (next.z > v.z) return next;
      const z = Math.min(MAX_Z, v.z + 2); // same spot: just zoom in
      const c = project(members[0].dealer.lat, members[0].dealer.lng, z);
      return { z, cx: c.x, cy: c.y };
    });
  };

  const pin = (p, active = false) => (
    <button
      key={p.no}
      type="button"
      className={`${styles.pin} ${active ? styles.pinActive : ''}`}
      style={{ left: p.x, top: p.y }}
      onClick={() => onSelect(p.dealer)}
      aria-label={`${p.no}. ${p.dealer.name}`}
      aria-pressed={active}
    >
      <span>{p.no}</span>
    </button>
  );

  /* Name label above the selected pin, kept inside the frame */
  const labelX = chosen ? Math.min(Math.max(chosen.x, 110), size.w - 110) : 0;

  return (
    <div
      ref={frameRef}
      className={styles.map}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {ready && (
        <>
          <div className={styles.tiles} aria-hidden="true">
            {[['b', baseUrl], ['l', labelUrl]].map(([layer, url]) => visibleTiles(view, size.w, size.h).map(t => (
              <img
                key={`${layer}${t.key}`}
                src={url(t)}
                alt=""
                draggable="false"
                width={TILE}
                height={TILE}
                style={{ left: t.left, top: t.top }}
                onLoad={(e) => e.currentTarget.classList.add(styles.tileLoaded)}
              />
            )))}
          </div>
          <div className={styles.mapShade} aria-hidden="true" />

          {groups.map(g => (g.members.length === 1 ? pin(g.members[0]) : (
            <button
              key={g.members.map(m => m.no).join('-')}
              type="button"
              className={styles.cluster}
              style={{ left: g.x, top: g.y }}
              onClick={() => openGroup(g.members)}
              aria-label={`${g.members.length} dealers here: ${g.members.map(m => m.dealer.name).join(', ')}. Zoom in`}
            >
              {g.members.length}
            </button>
          )))}

          {chosen && (
            <>
              {pin(chosen, true)}
              <div className={styles.pinLabel} style={{ left: labelX, top: chosen.y - 50 }}>
                <strong>{chosen.dealer.name}</strong>
                <span>{chosen.dealer.area}</span>
              </div>
            </>
          )}
        </>
      )}

      <div className={styles.mapLegend}>
        <MapPin size={13} aria-hidden="true" />
        {pins.length} {pins.length === 1 ? 'dealer' : 'dealers'} · tap a pin
      </div>

      <div className={styles.mapControls}>
        <button type="button" onClick={() => zoom(1)} aria-label="Zoom in" disabled={!ready || view.z >= MAX_Z}><Plus size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out" disabled={!ready || view.z <= MIN_Z}><Minus size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => { onSelect(null); fitAll(); }} aria-label="Show all dealers"><Maximize2 size={16} aria-hidden="true" /></button>
      </div>

      <p className={styles.attribution}>
        Map: <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>, HERE, Garmin, ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
