import { useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, useToast } from '../ui.jsx';
import { weekRange, weekReport, reportLines, reportText, rangeLabel } from '../autoRules.js';

/* The owner's week at a glance (superadmin only: it shows sales), ready to paste into Viber */
export default function WeekReport() {
  const { leads, cars, settings } = useShowroom();
  const { now } = useNav();
  const toast = useToast();
  const [which, setWhich] = useState('last');
  const range = weekRange(now, which);
  const report = weekReport({ leads, cars }, range, now);
  const text = reportText(report, settings, range);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Week report copied.');
    } catch {
      toast('Could not copy here. Try Share on Viber.');
    }
  };

  return (
    <section className={a.block} aria-labelledby="ad-week">
      <div className={a.blockHead}>
        <h2 id="ad-week" className={s.h3}>Week report</h2>
        <span className={s.muted}>{rangeLabel(range)}</span>
      </div>
      <div className={`${a.tabs} ${a.weekTabs}`} role="group" aria-label="Which week">
        <button type="button" aria-pressed={which === 'last'} onClick={() => setWhich('last')}>Last week</button>
        <button type="button" aria-pressed={which === 'this'} onClick={() => setWhich('this')}>This week so far</button>
      </div>
      <dl className={a.weekFacts}>
        {reportLines(report).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div className={a.todoActions}>
        <button type="button" className={s.btnGhost} onClick={copy}><Copy size={18} strokeWidth={1.75} aria-hidden="true" />Copy</button>
        <a href={`viber://forward?text=${encodeURIComponent(text)}`} className={s.btnGhost}>
          <Share2 size={18} strokeWidth={1.75} aria-hidden="true" />Share on Viber
        </a>
      </div>
    </section>
  );
}
