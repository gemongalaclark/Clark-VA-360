import { useId } from 'react';
import styles from './SharedPages.module.css';

/* Smooth multi-series area/line chart.
   data:   [{ label, [series.key]: number }]
   series: [{ key, label, color }] — drawn in order, last on top */
export default function ActivityChart({ data, series, height = 170 }) {
  const uid = useId().replace(/:/g, '');
  if (!data || data.length < 2) return <div className={styles.chartEmpty}>No data yet</div>;

  const W = 500, H = height, PL = 30, PR = 12, PT = 12, PB = 26;
  const cw = W - PL - PR, ch = H - PT - PB;
  const maxVal = Math.max(1, ...data.flatMap(d => series.map(s => d[s.key])));
  const px = (i) => PL + (i / (data.length - 1)) * cw;
  const py = (v) => PT + (1 - v / maxVal) * ch;
  const ticks = [...new Set([0, Math.round(maxVal / 2), maxVal])];

  const linePath = (key) => {
    const pts = data.map((d, i) => ({ x: px(i), y: py(d[key]) }));
    return pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const cx = (pts[i - 1].x + p.x) / 2;
      return `${acc} C ${cx} ${pts[i - 1].y} ${cx} ${p.y} ${p.x} ${p.y}`;
    }, '');
  };
  const areaPath = (key) => `${linePath(key)} L ${px(data.length - 1)} ${PT + ch} L ${px(0)} ${PT + ch} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Activity over the last ${data.length} months`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {series.map(s => (
          <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {ticks.map(v => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={py(v)} y2={py(v)} stroke="#eceff3" strokeWidth="1" strokeDasharray={v === 0 ? '0' : '4 4'} />
          <text x={PL - 8} y={py(v) + 3.5} textAnchor="end" fontSize="9.5" fill="#8a93a0">{v}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#6c757d">{d.label}</text>
      ))}

      {series.map(s => (
        <g key={s.key}>
          <path d={areaPath(s.key)} fill={`url(#${uid}-${s.key})`} />
          <path d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
          {data.map((d, i) => (
            <circle key={i} cx={px(i)} cy={py(d[s.key])} r="4" fill="#fff" stroke={s.color} strokeWidth="2">
              <title>{`${d.label}: ${d[s.key]} ${s.label.toLowerCase()}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}
