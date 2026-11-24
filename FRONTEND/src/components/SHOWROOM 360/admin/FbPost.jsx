/* "Copy Facebook post": a ready Marketplace caption for one car, plus its photos.
   No link to the car page: with browser storage it would not open on other phones. */
import { useEffect, useId, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import s from '../Showroom360.module.css';
import a from './Admin.module.css';
import { useShowroom } from '../store.js';
import { useNav, Sheet, useToast, copyText } from '../ui.jsx';
import { fbCaption, effectivePrice } from '../showroomRules.js';

export default function FbPost({ car, onClose }) {
  const { settings, events, photoBlob } = useShowroom();
  const { now } = useNav();
  const toast = useToast();
  const [lang, setLang] = useState('en');
  const [text, setText] = useState('');
  const areaId = useId();

  useEffect(() => {
    if (car) setText(fbCaption(car, settings, effectivePrice(car, events, now), lang));
  }, [car, lang]);

  const copy = async () => toast(await copyText(text) ? 'Caption copied. Paste it in your Facebook post.' : 'Could not copy. Select the text and copy it.');

  const savePhotos = async () => {
    for (const [k, id] of car.photoIds.entries()) {
      const blob = await photoBlob(id);
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${car.stockNo}-${k + 1}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  return (
    <Sheet open={!!car} onClose={onClose} title="Facebook post" wide>
      {car && (
        <div className={s.formGrid}>
          <div className={a.inlineRow}>
            <span className={s.fieldLabel} id={`${areaId}-lang`}>Language</span>
            <div className={s.segmented} role="group" aria-labelledby={`${areaId}-lang`}>
              <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
              <button type="button" aria-pressed={lang === 'ceb'} onClick={() => setLang('ceb')}>Bisaya</button>
            </div>
          </div>
          <div className={s.field}>
            <label htmlFor={areaId} className={s.fieldLabel}>Caption (you can edit it)</label>
            <textarea id={areaId} className={`${s.textarea} ${a.captionArea}`} value={text} onChange={(e) => setText(e.target.value)} rows={12} />
          </div>
          <div className={s.sheetActions}>
            <button type="button" className={s.btnGhost} onClick={savePhotos} disabled={car.photoIds.length === 0}>
              <Download size={18} strokeWidth={1.75} aria-hidden="true" />
              {car.photoIds.length ? `Save ${car.photoIds.length} photo${car.photoIds.length === 1 ? '' : 's'}` : 'No photos yet'}
            </button>
            <button type="button" className={s.btnPrimary} onClick={copy}>
              <Copy size={18} strokeWidth={1.75} aria-hidden="true" />Copy caption
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
