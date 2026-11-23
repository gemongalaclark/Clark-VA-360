import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import styles from './CarMark360.module.css';
import { MODELS } from './carData';
import { priceRange } from './carmarkRules';

const MAKES = [...new Set(MODELS.map(m => m.make))];

/* Sheet for choosing a car in three steps: model → generation → variant.
   Opens on the variant step of the current car (the change people make most),
   or on the model list when no car is chosen yet. */
export default function Picker({ current, title, onPick, onClose }) {
  const ref = useRef(null);
  const [model, setModel] = useState(current?.model || null);
  const [gen, setGen] = useState(current?.gen || null);
  const [step, setStep] = useState(current ? 'variant' : 'model');

  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);

  /* Lists start at the top on every step */
  const bodyRef = useRef(null);
  useEffect(() => { bodyRef.current?.scrollTo(0, 0); }, [step]);

  const chooseModel = (m) => { setModel(m); setGen(m.generations[m.generations.length - 1]); setStep('gen'); };
  const chooseGen = (g) => { setGen(g); setStep('variant'); };
  const back = () => setStep(step === 'variant' ? 'gen' : 'model');

  const heading = step === 'model' ? 'Choose a model' : step === 'gen' ? model.name : `${model.name} · ${gen.years}`;

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-label={title}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className={styles.sheetHead}>
        {step !== 'model' ? (
          <button type="button" className={styles.iconBtn} onClick={back} aria-label="Back">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        ) : <span className={styles.iconSpacer} />}
        <div className={styles.sheetTitle}>
          <span>{title}</span>
          <strong>{heading}</strong>
        </div>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div ref={bodyRef} className={styles.sheetBody}>
        {step === 'model' && MAKES.map(make => (
          <div key={make} className={styles.sheetGroup}>
            <h3>{make}</h3>
            {MODELS.filter(m => m.make === make).map(m => (
              <button key={m.id} type="button" className={styles.option} onClick={() => chooseModel(m)} aria-current={m.id === model?.id || undefined}>
                <span className={styles.optionMain}>
                  <strong>{m.name}</strong>
                  <span>{m.body}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
        ))}

        {step === 'gen' && (
          <div className={styles.sheetGroup}>
            {[...model.generations].reverse().map(g => (
              <button key={g.id} type="button" className={styles.option} onClick={() => chooseGen(g)} aria-current={g.id === gen.id || undefined}>
                <span className={styles.optionMain}>
                  <strong>{g.years}</strong>
                  <span>{g.label} · {priceRange(g.price)}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
            <button type="button" className={styles.sheetLink} onClick={() => setStep('model')}>Choose a different model</button>
          </div>
        )}

        {step === 'variant' && (
          <div className={styles.sheetGroup}>
            {gen.variants.map(v => (
              <button key={v.id} type="button" className={styles.option} onClick={() => onPick(v.id)} aria-current={v.id === current?.id || undefined}>
                <span className={styles.optionMain}>
                  <strong>{v.name}</strong>
                  {v.years && <span>{v.years}</span>}
                </span>
                {v.id === current?.id && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
            <button type="button" className={styles.sheetLink} onClick={() => setStep('gen')}>Choose a different year</button>
          </div>
        )}
      </div>
    </dialog>
  );
}
