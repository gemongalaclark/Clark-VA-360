import { useState, useEffect } from 'react';
import { RotateCcw, ArrowUpRight, ArrowLeft, ArrowRight, CarFront } from 'lucide-react';
import styles from './CarMark360.module.css';
import { Hero, Card } from './ui';
import { MODELS } from './carData';
import { GEN_CHECKS } from './carChecks';
import { findGeneration } from './carmarkRules';

/* Checks for any used car, shown after the car's own checks. Ids are stored on the phone, so keep them stable. */
const SECTIONS = [
  {
    id: 'flood', title: 'Flood damage',
    intro: 'Typhoon Tino (November 2025) put half of Cebu City under water, and flooded cars can be dried, cleaned and resold. Check every car, even a young one.',
    items: [
      ['smell', 'Smell inside with the doors closed: a musty, mouldy or heavy air-freshener smell is a warning.'],
      ['silt', 'Lift the carpets and look under the seats and in the spare-tyre well for mud, sand or a dried water line.'],
      ['rails', 'Seat rails, seat bolts and the metal under the dash should not be rusty in a car this age.'],
      ['carpet', 'Brand-new carpet or seat covers in an old car: ask why.'],
      ['lamps', 'Headlights and tail lights: no fog, droplets or a water line inside.'],
      ['electric', 'Try every window, lock, light, wiper, horn, A/C setting, camera and the radio. Flooded wiring fails at random.'],
      ['fuse', 'Open the fuse box and look at the plugs you can see: green or white crust means water got in.'],
      ['fluids', 'Engine oil and transmission fluid must not look milky or creamy.'],
      ['ask', 'Ask the seller straight: "Has it ever been in a flood?" Ask their insurer if a flood or total-loss claim was filed.'],
    ],
  },
  {
    id: 'mileage', title: 'Mileage and past use',
    intro: 'Ride-hailing, taxi and fleet cars are cheap for a reason: they run up to 60,000 km a year.',
    items: [
      ['wear', 'Compare the odometer with the wear on the steering wheel, pedals, gear knob and driver-seat bolster.'],
      ['records', 'Ask for the service booklet or dealer service records. Dates and mileage should rise steadily.'],
      ['forhire', 'Check the CR and ask if it was ever "for hire", Grab/TNVS, a taxi or a company car.'],
      ['owners', 'Ask how many owners it has had and why it is being sold.'],
    ],
  },
  {
    id: 'papers', title: 'Papers',
    intro: 'Most used-car scams in the Philippines are paper problems, not engine problems.',
    items: [
      ['orcr', 'See the original OR and CR. The name on them matches the seller\'s valid ID, and the registration is up to date.'],
      ['numbers', 'The engine and chassis numbers on the car match the CR exactly.'],
      ['encumbered', 'If the CR says "encumbered" (still under a bank loan), get the bank\'s release of chattel mortgage or written consent first.'],
      ['pasalo', 'Avoid "pasalo" (assume balance) deals the bank has not approved in writing: the car stays in the old owner\'s name.'],
      ['hpg', 'Get a PNP-HPG motor vehicle clearance (they macro-etch the engine and chassis numbers) to prove it is not stolen. Do this before paying in full.'],
      ['deed', 'Sign a notarized deed of sale with both names, the car\'s plate, engine and chassis numbers, the price and the date.'],
      ['recall', 'Give the VIN to the brand\'s dealer and ask about open recalls and remaining warranty.'],
    ],
  },
  {
    id: 'drive', title: 'Look and test drive',
    intro: 'Bring a mechanic you trust if you can. Go in daylight, and never look at a car in the rain.',
    items: [
      ['cold', 'Start it cold (ask the seller not to warm it up). Watch for heavy smoke and listen for knocking.'],
      ['lights', 'All warning lights go out after starting. An OBD scan shows no stored faults.'],
      ['shifts', 'Automatic or CVT: smooth pull-away, no jerks, slipping or whining. Manual: the clutch bites in the middle, not at the top.'],
      ['brakes', 'Brake firmly from speed: no shaking steering wheel and no pulling to one side.'],
      ['bumps', 'Drive over humps: no knocks or rattles from the suspension.'],
      ['aircon', 'The A/C blows cold within a few minutes, front and rear.'],
      ['body', 'Paint colour matches on every panel, the gaps are even, and there is no overspray on rubber seals (signs of accident repair).'],
      ['tyres', 'Tyres wear evenly. Uneven wear can mean bad alignment or a bent part.'],
    ],
  },
  {
    id: 'pay', title: 'Paying safely',
    intro: 'Pay only when the car and the papers both check out.',
    items: [
      ['noreservation', 'Don\'t send a "reservation fee" for a car you have not seen in person.'],
      ['bank', 'Pay by bank transfer or manager\'s check in the seller\'s own name, not cash to a middleman.'],
      ['transfer', 'Agree who pays for the transfer of ownership at the LTO, and transfer it into your name promptly.'],
      ['keys', 'Get every key, the spare key, the manual and the service booklet when you pay.'],
    ],
  },
];

const MAKES = [...new Set(MODELS.map(m => m.make))];

/* The car last opened here, so the Checklist tab reopens it during this visit */
let lastGen = null;
export const lastChecklistSearch = () => (lastGen ? `?g=${lastGen}` : '');

/* Ticks are saved per generation, so two cars never share them */
const keyFor = (genId) => `carmark-checklist:${genId}`;
const load = (genId) => {
  try { return new Set(JSON.parse(localStorage.getItem(keyFor(genId))) || []); } catch { return new Set(); }
};

export default function Checklist({ navigate }) {
  const q = new URLSearchParams(window.location.search);
  const found = findGeneration(q.get('g'));
  if (!found) return <CarPick navigate={navigate} model={MODELS.find(m => m.id === q.get('m'))} />;
  return <CarChecklist navigate={navigate} model={found.model} gen={found.gen} />;
}

/* Step 1 and 2: pick the model, then the generation */
function CarPick({ navigate, model }) {
  const link = (url) => ({ href: url, onClick: (e) => { e.preventDefault(); navigate(url); } });

  if (model) {
    return (
      <div className={styles.page}>
        <Hero
          eyebrow="Checklist"
          title={`Which ${model.name}?`}
          sub="Pick the generation. Not sure? Check the year model on the CR, then find the range it falls in."
        >
          <a className={styles.heroBtn} {...link('/carmark/checklist')}>
            <ArrowLeft size={17} aria-hidden="true" /> All models
          </a>
        </Hero>
        <Card title={`${model.make} ${model.name}`}>
          <ul className={styles.popular}>
            {[...model.generations].reverse().map(g => (
              <li key={g.id}>
                <button type="button" onClick={() => navigate(`/carmark/checklist?g=${g.id}`)}>
                  <strong>{g.label}</strong>
                  <span>{g.years} · {GEN_CHECKS[g.id].items.length} checks for this car</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Hero
        eyebrow="Checklist"
        title="Which car are you checking?"
        sub="Pick the model and generation. You get the checks made for that car, plus the flood, papers and test-drive checks every used car needs."
      />
      {MAKES.map(make => (
        <section key={make} className={styles.makeGroup}>
          <h2 className={styles.groupLabel}>{make}</h2>
          <ul className={styles.modelGrid}>
            {MODELS.filter(m => m.make === make).map(m => (
              <li key={m.id}>
                <a className={styles.modelCard} {...link(`/carmark/checklist?m=${m.id}`)}>
                  <span className={styles.modelBody}>{m.body}</span>
                  <strong>{m.name}</strong>
                  <span className={styles.modelYears}>{m.generations.length} {m.generations.length === 1 ? 'generation' : 'generations'}</span>
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

/* The checklist for one generation */
function CarChecklist({ navigate, model, gen }) {
  const own = GEN_CHECKS[gen.id];
  const sections = [{ id: 'car', title: `For this ${model.name}`, intro: own.intro, items: own.items }, ...SECTIONS];
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const [done, setDone] = useState(() => load(gen.id));

  useEffect(() => { lastGen = gen.id; }, [gen.id]);

  useEffect(() => {
    try { localStorage.setItem(keyFor(gen.id), JSON.stringify([...done])); } catch { /* not saved */ }
  }, [done, gen.id]);

  const toggle = (id) => setDone(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const changeUrl = `/carmark/checklist?m=${model.id}`;
  const pct = Math.round((done.size / total) * 100);
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className={styles.page}>
      <Hero
        eyebrow="Checklist"
        title={`${model.name} ${gen.label}`}
        sub={`${model.make} · ${gen.years}. Go through this while you look at the car. Your ticks are saved on this phone.`}
      >
        <a href={changeUrl} className={styles.heroBtn} onClick={(e) => { e.preventDefault(); navigate(changeUrl); }}>
          <CarFront size={17} aria-hidden="true" /> Change car
        </a>
        <div className={styles.ringRow}>
          <svg className={styles.ring} viewBox="0 0 80 80" role="img" aria-label={`${done.size} of ${total} checked`}>
            <circle cx="40" cy="40" r={R} className={styles.ringTrack} />
            <circle cx="40" cy="40" r={R} className={styles.ringFill} strokeDasharray={C} strokeDashoffset={C * (1 - done.size / total)} />
            <text x="40" y="45" textAnchor="middle">{pct}%</text>
          </svg>
          <div className={styles.ringText}>
            <strong>{done.size} of {total} checked</strong>
            <span>{done.size === total ? 'All done. Good luck with the deal!' : `Start with the ${model.name} checks, then flood signs and papers.`}</span>
            <button type="button" className={styles.ghostBtn} onClick={() => setDone(new Set())} disabled={!done.size}>
              <RotateCcw size={14} aria-hidden="true" /> Start over for another unit
            </button>
          </div>
        </div>
      </Hero>

      {sections.map((s, i) => {
        const ticked = s.items.filter(([id]) => done.has(`${s.id}.${id}`)).length;
        return (
          <Card
            key={s.id}
            className={ticked === s.items.length ? styles.cardDone : ''}
            title={<><span className={styles.stepNo}>{i + 1}</span>{s.title}</>}
            aside={<span className={styles.count}>{ticked}/{s.items.length}</span>}
          >
            <p className={styles.lead}>{s.intro}</p>
            <ul className={styles.checks}>
              {s.items.map(([id, text]) => {
                const key = `${s.id}.${id}`;
                return (
                  <li key={key}>
                    <label>
                      <input type="checkbox" checked={done.has(key)} onChange={() => toggle(key)} />
                      <span>{text}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <Card title="Read more">
        <ul className={styles.sources}>
          <li><a href="https://mb.com.ph/2024/9/23/how-to-spot-a-flooded-second-hand-car" target="_blank" rel="noopener noreferrer">Manila Bulletin: how to spot a flooded second-hand car<ArrowUpRight size={14} aria-hidden="true" /></a></li>
          <li><a href="https://www.sunstar.com.ph/cebu/half-of-cebu-city-submerged-as-tino-triggers-massive-floods" target="_blank" rel="noopener noreferrer">SunStar: half of Cebu City submerged in Typhoon Tino<ArrowUpRight size={14} aria-hidden="true" /></a></li>
          <li><a href="https://philkotse.com/car-buying-and-selling/car-ownership-transfer-in-the-philippines-7-steps-to-do-2617" target="_blank" rel="noopener noreferrer">Philkotse: transfer of ownership steps and fees<ArrowUpRight size={14} aria-hidden="true" /></a></li>
          <li><a href="https://www.carmudi.com.ph/advice/buying-a-used-car-in-the-philippines-heres-how-to-dodge-scams/" target="_blank" rel="noopener noreferrer">Carmudi: how to dodge used-car scams<ArrowUpRight size={14} aria-hidden="true" /></a></li>
        </ul>
      </Card>
    </div>
  );
}
