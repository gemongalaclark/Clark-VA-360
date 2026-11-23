/* Side-view silhouette for a car with no photos, one per body type, painted in
   the car's color. Used for the sample cars so the demo needs no stock photos. */
import { useId } from 'react';
import { COLORS } from './showroomRules.js';

const SHAPES = {
  sedan: {
    body: 'M22 98 L22 84 C22 76 28 72 38 71 L92 66 C108 52 124 42 146 40 L196 40 C214 40 232 50 250 64 L288 69 C298 71 302 77 302 86 L302 98 Z',
    glass: 'M104 65 C118 53 132 46 148 45 L192 45 C206 45 220 52 236 64 Z',
    pillars: [170], wheels: [80, 246], head: [290, 74], tail: [24, 76],
  },
  hatchback: {
    body: 'M44 98 L44 80 C44 70 50 62 60 54 L82 42 C86 40 92 39 98 39 L212 39 C230 40 246 50 260 64 L284 70 C292 72 296 78 296 86 L296 98 Z',
    glass: 'M66 62 L86 47 C90 45 94 44 100 44 L210 44 C224 45 236 53 246 63 Z',
    pillars: [156], wheels: [88, 252], head: [286, 74], tail: [46, 72],
  },
  crossover: {
    body: 'M20 99 L20 82 C20 74 26 68 38 67 L86 62 C102 46 118 36 140 35 L246 35 C264 36 278 46 290 60 C298 64 302 70 302 80 L302 99 Z',
    glass: 'M98 61 C112 47 126 41 142 41 L242 41 C256 42 266 50 274 60 Z',
    pillars: [168, 230], wheels: [80, 248], head: [290, 68], tail: [22, 72],
  },
  suv: {
    body: 'M18 100 L18 80 C18 70 24 64 36 63 L80 60 C94 40 106 30 128 29 L262 29 C276 29 286 38 292 54 L298 58 C304 62 304 70 304 80 L304 100 Z',
    glass: 'M92 59 C104 42 114 35 130 35 L258 35 C268 35 276 42 280 58 Z',
    pillars: [162, 224], wheels: [78, 250], head: [292, 64], tail: [20, 68],
  },
  mpv: {
    body: 'M18 100 L18 82 C18 72 24 67 36 66 L66 62 C86 40 104 28 132 27 L268 27 C282 27 292 36 296 52 L300 60 C304 64 304 72 304 82 L304 100 Z',
    glass: 'M80 61 C98 42 112 33 134 33 L264 33 C274 33 282 40 286 60 Z',
    pillars: [152, 214], wheels: [78, 252], head: [292, 68], tail: [20, 70],
  },
  pickup: {
    body: 'M14 100 L14 80 C14 70 20 64 32 63 L74 60 C88 40 100 30 122 29 L188 29 C196 29 200 34 200 42 L200 64 L300 64 C304 64 306 68 306 74 L306 100 Z',
    glass: 'M86 59 C98 42 108 35 124 35 L186 35 C192 35 194 39 194 44 L194 59 Z',
    pillars: [140], wheels: [74, 254], head: [16, 68], tail: [298, 70], facesLeft: true,
  },
  van: {
    body: 'M20 102 L20 66 C20 54 26 44 38 34 C48 26 60 22 76 22 L292 22 C300 22 304 26 304 34 L304 102 Z',
    glass: 'M30 60 C32 50 38 41 48 35 C56 30 64 28 74 28 L294 28 C297 28 298 30 298 33 L298 56 Z',
    pillars: [86, 150, 212, 262], wheels: [72, 256], head: [22, 70], tail: [296, 66], facesLeft: true,
  },
};

/* Theme colours (tokens on .app), so the drawings follow dark mode. Set through
   style, since SVG attributes don't take var(). */
const INK = { stroke: 'var(--ink)' };
const GLASS = { fill: 'var(--paper)', stroke: 'var(--ink)' };
const LAMP = { fill: 'var(--art-rim)', stroke: 'var(--ink)' };
const TYRE = { fill: 'var(--art-tyre)', stroke: 'var(--ink)' };

/* Drawn like a spec-sheet line drawing: ink outline, a wash of the car's paint,
   door and sill lines clipped to the body, solid tyres on a ground line. */
export default function CarArt({ body, color, label, className }) {
  const clip = `sr-body-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const s = SHAPES[body] || SHAPES.sedan;
  const paint = COLORS[color]?.hex || COLORS.silver.hex;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const headX = s.facesLeft ? s.head[0] : s.head[0] - 10;
  return (
    <svg viewBox="0 0 320 126" className={className} {...a11y} focusable="false">
      <defs><clipPath id={clip}><path d={s.body} /></clipPath></defs>
      <line x1="4" y1="120" x2="316" y2="120" style={INK} strokeWidth="1.25" opacity="0.45" />
      <path d={s.body} fill={paint} fillOpacity="0.5" />
      <path d={s.glass} style={GLASS} fillOpacity="0.75" strokeWidth="1.5" strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`} style={INK} strokeWidth="1.5">
        {s.pillars.map(x => <line key={x} x1={x} y1="20" x2={x} y2="96" />)}
        <line x1="0" y1="88" x2="320" y2="88" opacity="0.5" />
      </g>
      <path d={s.body} fill="none" style={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x={headX} y={s.head[1]} width="10" height="5" rx="1" style={LAMP} strokeWidth="1.25" />
      <rect x={s.tail[0]} y={s.tail[1]} width="6" height="6" rx="1" fill="#cb2525" />
      {s.wheels.map(x => (
        <g key={x}>
          {/* r 18.5 + half the 2px edge = the old 19.5 solid tyre; the edge shows the tyre on dark paper */}
          <circle cx={x} cy="100" r="18.5" style={TYRE} strokeWidth="2" />
          <circle cx={x} cy="100" r="10.5" style={{ fill: 'var(--art-rim)' }} />
          <circle cx={x} cy="100" r="3" style={{ fill: 'var(--art-tyre)' }} />
        </g>
      ))}
    </svg>
  );
}
