import styles from '../Showroom360.module.css';
import { wheelSlices } from '../promoRules.js';

/* The prize wheel: each slice as big as its chance, red and ink in turn, a pointer at the
   top. `rotation` turns it (degrees, clockwise); `spinning` animates the turn. Drawn in
   a 200 x 200 box centred on 0,0. Decorative: the pop-up says the result in words. */
const R = 92;
const point = (deg, r = R) => {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
};

/* Room for a label along the radius, from the hub to the rim, and the width of one
   character in Barlow Condensed (as a share of the font size) */
const ROOM = 66;
const CHAR = 0.47;
const fit = (label, max) => (label.length > max ? `${label.slice(0, Math.max(1, max - 1)).trimEnd()}…` : label);

export default function Wheel({ prizes, rotation = 0, spinning = false }) {
  const slices = wheelSlices(prizes);
  const fills = ['var(--red)', 'var(--ink)'];
  return (
    <svg className={styles.wheel} viewBox="-100 -100 200 200" role="presentation" aria-hidden="true" focusable="false">
      <g
        className={spinning ? styles.wheelSpinning : undefined}
        style={{ transform: `rotate(${rotation}deg)`, transformBox: 'view-box', transformOrigin: '50% 50%' }}
      >
        {slices.length === 0 && <circle r={R} fill="var(--paper-2)" />}
        {slices.map((s, i) => {
          /* an odd count would put two reds side by side at the top: the last one goes grey */
          const fill = slices.length > 1 && i === slices.length - 1 && slices.length % 2 === 1 ? 'var(--ink-2)' : fills[i % 2];
          const span = s.end - s.start;
          const [x0, y0] = point(s.start);
          const [x1, y1] = point(s.end);
          const mid = s.start + span / 2;
          const label = String(s.prize.label || '');
          /* as big as the slice's width allows, then smaller until the whole name fits */
          const size = Math.max(5, Math.min(9, span * 0.3, ROOM / (Math.max(label.length, 1) * CHAR)));
          const text = fit(label, Math.floor(ROOM / (size * CHAR)));
          /* labels on the left half turn round so none reads upside down */
          const flip = mid > 180;
          return (
            <g key={s.prize.id || i}>
              {span >= 359.99
                ? <circle r={R} fill={fill} />
                : <path d={`M0 0 L${x0} ${y0} A${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={fill} />}
              {/* the label runs along the slice's middle */}
              <text
                transform={`rotate(${flip ? mid + 90 : mid - 90})`}
                x={flip ? -(R - 8) : R - 8} y="0"
                textAnchor={flip ? 'start' : 'end'} dominantBaseline="central"
                fontSize={size}
                fill={fill === 'var(--red)' ? '#fff' : 'var(--paper)'}
                className={styles.wheelText}
              >
                {text}
              </text>
            </g>
          );
        })}
        <circle r={R} fill="none" stroke="var(--ink)" strokeWidth="3" />
      </g>
      <circle r="13" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
      {/* the pointer, fixed at the top */}
      <path d="M0 -78 L-9 -99 L9 -99 Z" fill="var(--red)" stroke="var(--paper)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
