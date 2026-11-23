import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import styles from './CarMark360.module.css';
import { MODELS, DATA_AS_OF } from './carData';
import { priceRange, allVariants } from './carmarkRules';
import { Hero, Card, ProblemList, PriceLine } from './ui';

const MAKES = [...new Set(MODELS.map(m => m.make))];

/* "2012–present" style span across a model's generations */
const span = (m) => {
  const first = m.generations[0].years.split('–')[0].replace(/^\D+/, '');
  const last = m.generations[m.generations.length - 1].years.split('–').pop();
  return `${first}–${last}`;
};
const priceSpan = (m) => priceRange({
  min: Math.min(...m.generations.map(g => g.price.min)),
  max: Math.max(...m.generations.map(g => g.price.max)),
});
const variantCount = (m) => m.generations.reduce((n, g) => n + g.variants.length, 0);

function ModelList({ navigate }) {
  return (
    <div className={styles.page}>
      <Hero
        eyebrow="Models"
        title="Know the car before you see it"
        sub="The used cars Cebu buyers ask about most: every generation, what changed, rough prices and what breaks."
        stats={[['Models', MODELS.length], ['Generations', MODELS.reduce((n, m) => n + m.generations.length, 0)], ['Variants', allVariants().length]]}
      />
      {MAKES.map(make => (
        <section key={make} className={styles.makeGroup}>
          <h2 className={styles.groupLabel}>{make}</h2>
          <ul className={styles.modelGrid}>
            {MODELS.filter(m => m.make === make).map(m => (
              <li key={m.id}>
                <a
                  href={`/carmark/models?m=${m.id}`}
                  className={styles.modelCard}
                  onClick={(e) => { e.preventDefault(); navigate(`/carmark/models?m=${m.id}`); }}
                >
                  <span className={styles.modelBody}>{m.body}</span>
                  <strong>{m.name}</strong>
                  <span className={styles.modelYears}>{span(m)} · {variantCount(m)} variants</span>
                  <span className={styles.modelPrice}>{priceSpan(m)}</span>
                  <ArrowRight size={16} className={styles.modelArrow} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function Models({ navigate }) {
  const id = new URLSearchParams(window.location.search).get('m');
  const model = MODELS.find(m => m.id === id);
  if (!model) return <ModelList navigate={navigate} />;

  const compareWith = (variantId) => navigate(`/carmark?a=${variantId}`);

  return (
    <div className={styles.page}>
      <Hero
        eyebrow={(
          <a
            href="/carmark/models"
            className={styles.heroBack}
            onClick={(e) => { e.preventDefault(); navigate('/carmark/models'); }}
          >
            <ArrowLeft size={14} aria-hidden="true" /> All models · {model.make}
          </a>
        )}
        title={model.name}
        sub={model.body}
        stats={[['Years', span(model)], ['Generations', model.generations.length], ['Used price', priceSpan(model)]]}
      />

      <ol className={styles.timeline}>
        {[...model.generations].reverse().map((g, i) => (
          <li key={g.id} className={styles.gen}>
            <div className={styles.genHead}>
              <span className={styles.genYears}>{g.years}</span>
              {i === 0 && <span className={styles.latest}>Latest</span>}
            </div>
            <h2>{g.label}</h2>
            <p className={styles.genSummary}>{g.summary}</p>
            <PriceLine price={g.price} />

            <h3 className={styles.miniHead}>Variants · tap to compare</h3>
            <div className={styles.variantChips}>
              {g.variants.map(v => (
                <button key={v.id} type="button" onClick={() => compareWith(v.id)}>
                  {v.name}{v.years && <small>{v.years}</small>}
                </button>
              ))}
            </div>

            <h3 className={styles.miniHead}>Check before you buy</h3>
            <ProblemList problems={g.problems} />
          </li>
        ))}
      </ol>

      <Card title="Sources">
        <ul className={styles.sources}>
          {model.sources.map(s => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}<ArrowUpRight size={14} aria-hidden="true" /></a>
            </li>
          ))}
        </ul>
        <p className={styles.note}>Prices are rough secondhand asking prices as of {DATA_AS_OF}. Always check the actual car and its papers.</p>
      </Card>
    </div>
  );
}
