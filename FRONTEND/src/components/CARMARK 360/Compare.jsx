import { useState, useEffect, useMemo } from 'react';
import { ArrowLeftRight, Check, Share2, ArrowRight, Plus, ArrowUpRight } from 'lucide-react';
import styles from './CarMark360.module.css';
import { FEATURES, POPULAR_PAIRS, DATA_AS_OF, MODELS } from './carData';
import { findVariant, diffVariants, priceRange, allVariants } from './carmarkRules';
import { Hero, Card, ProblemList } from './ui';
import Picker from './Picker';

/* The cars picked so far, so the Compare tab reopens on them during this visit.
   A fresh visit starts empty. */
let lastPair = [null, null];
const searchFor = ([a, b]) => {
  const q = [a && `a=${a}`, b && `b=${b}`].filter(Boolean).join('&');
  return q ? `?${q}` : '';
};
export const lastCompareSearch = () => searchFor(lastPair);

/* A link (shared, or from a Models page "Compare") fills in its cars; the rest stay empty */
function initialPair() {
  const q = new URLSearchParams(window.location.search);
  const valid = (id) => (id && findVariant(id) ? id : null);
  return [valid(q.get('a')), valid(q.get('b'))];
}

/* One of the two cars: tap to choose or change it */
function CarCard({ side, v, onOpen }) {
  const tag = <span className={styles.carSide}><i className={side === 'A' ? styles.dotA : styles.dotB} />Car {side}</span>;
  if (!v) {
    return (
      <button type="button" className={`${styles.carCard} ${styles.carEmpty}`} onClick={onOpen}>
        {tag}
        <span className={styles.carPlus}><Plus size={22} aria-hidden="true" /></span>
        <strong className={styles.carName}>Choose car {side}</strong>
        <span className={styles.carMeta}>Model, year and variant</span>
      </button>
    );
  }
  return (
    <button type="button" className={styles.carCard} onClick={onOpen} aria-label={`Car ${side}: ${v.fullName}. Change`}>
      {tag}
      <span className={styles.carMake}>{v.model.make}</span>
      <strong className={styles.carName}>{v.model.name} {v.name}</strong>
      <span className={styles.carMeta}>{v.years}</span>
      <span className={styles.carPrice}>{priceRange(v.gen.price)}</span>
      <span className={styles.carChange}>Change</span>
    </button>
  );
}

export default function Compare({ navigate }) {
  const [pair, setPair] = useState(initialPair);
  const [picking, setPicking] = useState(null); // 0 | 1 | null
  const a = pair[0] && findVariant(pair[0]);
  const b = pair[1] && findVariant(pair[1]);

  /* Keep the pair in the address so it can be shared or reopened */
  useEffect(() => {
    lastPair = pair;
    window.history.replaceState({}, '', `/carmark${searchFor(pair)}`);
  }, [pair]);

  const pick = (id) => {
    setPair(p => (picking === 0 ? [id, p[1]] : [p[0], id]));
    setPicking(null);
  };

  return (
    <div className={styles.page}>
      <Hero
        eyebrow="Compare"
        title="Which one should you buy?"
        sub="Any two variants side by side: features, specs, used prices and what to check."
      >
        <div className={styles.matchup}>
          <CarCard side="A" v={a} onOpen={() => setPicking(0)} />
          <span className={styles.vs} aria-hidden="true">VS</span>
          <CarCard side="B" v={b} onOpen={() => setPicking(1)} />
        </div>
        {a && b && (
          <button type="button" className={styles.swapBtn} onClick={() => setPair([pair[1], pair[0]])}>
            <ArrowLeftRight size={15} aria-hidden="true" /> Swap cars
          </button>
        )}
      </Hero>

      {a && b ? (
        <Results a={a} b={b} navigate={navigate} />
      ) : a || b ? (
        <p className={styles.nudge}>Now choose car {a ? 'B' : 'A'} to see the differences.</p>
      ) : (
        <Card title="Popular comparisons">
          <p className={styles.lead}>Start with one of these, or pick any two cars above.</p>
          <ul className={styles.popular}>
            {POPULAR_PAIRS.map(p => {
              const [va, vb] = [findVariant(p.a), findVariant(p.b)];
              return (
                <li key={p.label}>
                  <button type="button" onClick={() => setPair([p.a, p.b])}>
                    <strong>{p.label}</strong>
                    <span>{va.fullName} <em>vs</em> {vb.fullName}</span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}>{MODELS.length} models · {allVariants().length} variants to choose from.</p>
        </Card>
      )}

      {picking !== null && (
        <Picker
          current={picking === 0 ? a : b}
          title={picking === 0 ? 'Car A' : 'Car B'}
          onPick={pick}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

/* Everything shown once both cars are chosen */
function Results({ a, b, navigate }) {
  const [onlyDiff, setOnlyDiff] = useState(true);
  const [problemTab, setProblemTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const diff = useMemo(() => diffVariants(a, b), [a, b]);

  const share = async () => {
    const url = window.location.href;
    const title = `${a.fullName} vs ${b.fullName}`;
    try {
      if (navigator.share) await navigator.share({ title, text: `${title} · CarMark 360`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* share sheet closed */ }
  };

  const same = a.id === b.id;
  const sameGen = a.gen.id === b.gen.id;
  const rows = onlyDiff ? diff.rows.filter(r => !r.same) : diff.rows;
  const featureRows = [...diff.onlyA.map(f => [f, true, false]), ...diff.onlyB.map(f => [f, false, true])];
  const shown = [a, b][problemTab];

  /* Short names when both are the same model ("GLS AT"), full names otherwise */
  const nameOf = (v) => (a.model.id === b.model.id ? v.name : v.fullName);
  const count = (n) => `${n} ${n === 1 ? 'feature' : 'features'}`;
  const extra = (v, n, other) => `The ${nameOf(v)} has ${count(n)} the ${nameOf(other)} doesn’t.`;
  const summary = same
    ? 'Both sides show the same car. Tap Car B to change it.'
    : !featureRows.length
      ? 'Same features on our list. Compare the specs and prices below.'
      : [diff.onlyA.length && extra(a, diff.onlyA.length, b), diff.onlyB.length && extra(b, diff.onlyB.length, a)]
          .filter(Boolean).join(' ');

  const mark = (on) => (on
    ? <span className={styles.yes} aria-label="Yes"><Check size={15} strokeWidth={3} aria-hidden="true" /></span>
    : <span className={styles.no} aria-label="No">–</span>);

  return (
    <>
      <Card
        title="Features"
        aside={(
          <button type="button" className={styles.chipBtn} onClick={share}>
            <Share2 size={14} aria-hidden="true" /> {copied ? 'Link copied' : 'Share'}
          </button>
        )}
      >
        <p className={styles.summary}>{summary}</p>

        {!same && featureRows.length > 0 && (
          <div className={styles.table} role="table" aria-label="Features only one car has">
            <div className={`${styles.tRow} ${styles.tHead}`} role="row">
              <span role="columnheader">Only on one car</span>
              <span role="columnheader" title={a.fullName}><i className={styles.dotA} />A</span>
              <span role="columnheader" title={b.fullName}><i className={styles.dotB} />B</span>
            </div>
            {featureRows.map(([f, inA, inB]) => (
              <div key={f} className={styles.tRow} role="row">
                <span role="rowheader">{FEATURES[f]}</span>
                <span role="cell">{mark(inA)}</span>
                <span role="cell">{mark(inB)}</span>
              </div>
            ))}
          </div>
        )}

        {diff.shared.length > 0 && (
          <details className={styles.disclosure}>
            <summary>Both have <span>{diff.shared.length}</span></summary>
            <ul className={styles.sharedList}>
              {diff.shared.map(f => <li key={f}><Check size={14} aria-hidden="true" />{FEATURES[f]}</li>)}
            </ul>
          </details>
        )}
      </Card>

      <Card
        title="Specs"
        aside={(
          <label className={styles.switch}>
            <input type="checkbox" role="switch" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
            <span className={styles.switchTrack} aria-hidden="true" />
            Differences only
          </label>
        )}
      >
        <dl className={styles.specs}>
          <div className={`${styles.specRow} ${styles.specPrice}`}>
            <dt>Used price (rough)</dt>
            <dd>{priceRange(a.gen.price)}</dd>
            <dd>{priceRange(b.gen.price)}</dd>
          </div>
          {rows.map(r => (
            <div key={r.key} className={`${styles.specRow} ${r.same ? '' : styles.specDiff}`}>
              <dt>{r.label}</dt>
              <dd>{r.a}</dd>
              <dd>{r.b}</dd>
            </div>
          ))}
        </dl>
        {onlyDiff && rows.length < diff.rows.length && (
          <p className={styles.note}>{diff.rows.length - rows.length} specs are the same and hidden.</p>
        )}
      </Card>

      <Card title="Before you buy">
        {sameGen ? (
          <p className={styles.lead}>Both are the {a.model.name} {a.gen.label} ({a.gen.years}), so they share the same things to check.</p>
        ) : (
          <div className={styles.segmented} role="tablist" aria-label="Problems to check">
            {[a, b].map((v, i) => (
              <button key={i} type="button" role="tab" aria-selected={problemTab === i} onClick={() => setProblemTab(i)}>
                <i className={i === 0 ? styles.dotA : styles.dotB} />{a.model.id === b.model.id ? v.gen.years : v.model.name}
              </button>
            ))}
          </div>
        )}
        <ProblemList problems={(sameGen ? a : shown).gen.problems} />
        <a
          href="/carmark/checklist"
          className={styles.ctaLink}
          onClick={(e) => { e.preventDefault(); navigate('/carmark/checklist'); }}
        >
          <span>
            <strong>Going to see the car?</strong>
            Open the checklist: flood signs, papers, test drive.
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </Card>

      <p className={styles.fine}>
        Prices are rough secondhand asking prices for the whole generation as of {DATA_AS_OF}, from Carmudi,
        Philkotse and Automart listings. Features are the main differences between Philippine variants at
        launch, and a specific unit can differ. Sources are on each model’s page.
      </p>
    </>
  );
}
