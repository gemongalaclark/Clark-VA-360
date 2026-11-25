import styles from '../Showroom360.module.css';
import { wheelSlices } from '../promoRules.js';

/* The prize wheel, made to sit on the dark band (the buyer pop-up's header, the admin
   preview): a rim of marquee lights, slices as big as their chance in red and cream,
   a hub and a red pointer at the top. The colours are fixed in both themes (the band is
   dark in both). `rotation` turns it (degrees, clockwise); `spinning` animates the turn
   and blinks the lights; `winnerId` dims the other slices once it stops.
   Drawn in a 200 x 200 box centred on 0,0. Decorative: the pop-up says the result. */

const R = 86;          /* slices */
const RIM = 99;        /* outer edge of the lights' rim */
const LIGHTS = 24;
const point = (deg, r = R) => {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
};

/* Room for a label along the radius, hub to rim, and one character's width in
   Inter (semibold, as typed) as a share of the font size */
const ROOM = 60;
const CHAR = 0.56;
const fit = (label, max) => (label.length > max ? `${label.slice(0, Math.max(1, max - 1)).trimEnd()}…` : label);

/* A slice's colour by its place: red and cream in turn; with an odd count the last one
   is a softer cream so two reds never meet at the top. The legend uses the same colours. */
export function sliceFill(i, count) {
  if (count > 1 && count % 2 === 1 && i === count - 1) return 'rgba(var(--on-band-rgb), 0.74)';
  return i % 2 === 0 ? 'var(--red)' : 'var(--on-band)';
}

export default function Wheel({ prizes, rotation = 0, spinning = false, winnerId = null }) {
  const slices = wheelSlices(prizes);
  const settled = winnerId && !spinning;
  return (
    <svg className={styles.wheel} viewBox="-100 -100 200 200" role="presentation" aria-hidden="true" focusable="false">
      {/* the rim and its lights stay still; only the slices turn */}
      <circle r={RIM} fill="rgba(var(--on-band-rgb), 0.07)" stroke="rgba(var(--on-band-rgb), 0.22)" strokeWidth="1.5" />
      <g className={spinning ? styles.wheelLightsOn : undefined}>
        {Array.from({ length: LIGHTS }, (_, i) => {
          const [x, y] = point((i * 360) / LIGHTS, 93);
          return <circle key={i} cx={x} cy={y} r="2.3" className={i % 2 ? styles.lightB : styles.lightA} />;
        })}
      </g>
      <g
        className={spinning ? styles.wheelSpinning : undefined}
        /* turn about the wheel's own centre: its fill box is the r=86 disc centred on 0,0 */
        style={{ transform: `rotate(${rotation}deg)`, transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        {slices.length === 0 && <circle r={R} fill="rgba(var(--on-band-rgb), 0.16)" />}
        {slices.map((s, i) => {
          const fill = sliceFill(i, slices.length);
          const span = s.end - s.start;
          const [x0, y0] = point(s.start);
          const [x1, y1] = point(s.end);
          const mid = s.start + span / 2;
          const label = String(s.prize.label || '');
          /* as big as the slice allows, then smaller until the whole name fits */
          const size = Math.max(5, Math.min(8.5, span * 0.28, ROOM / (Math.max(label.length, 1) * CHAR)));
          const text = fit(label, Math.floor(ROOM / (size * CHAR)));
          /* labels on the left half turn round so none reads upside down */
          const flip = mid > 180;
          const dim = settled && s.prize.id !== winnerId;
          return (
            <g key={s.prize.id || i} className={`${styles.wheelSlice} ${dim ? styles.wheelSliceDim : ''}`}>
              {span >= 359.99
                ? <circle r={R} fill={fill} />
                : <path d={`M0 0 L${x0} ${y0} A${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={fill} stroke="var(--band)" strokeWidth="1.4" strokeLinejoin="round" />}
              <text
                transform={`rotate(${flip ? mid + 90 : mid - 90})`}
                x={flip ? -(R - 7) : R - 7} y="0"
                textAnchor={flip ? 'start' : 'end'} dominantBaseline="central"
                fontSize={size}
                fill={fill === 'var(--red)' ? '#fff' : 'var(--band)'}
                className={styles.wheelText}
              >
                {text}
              </text>
            </g>
          );
        })}
      </g>
      {/* hub */}
      <circle r="15" fill="var(--band)" stroke="var(--on-band)" strokeWidth="3" />
      <circle r="5" fill="var(--red)" />
      {/* the pointer, fixed at the top, its tip just inside the slices */}
      <path d="M0 -74 L-9.5 -96 Q0 -103 9.5 -96 Z" fill="var(--red)" stroke="var(--on-band)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
