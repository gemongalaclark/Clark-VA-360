import { useCallback, useEffect, useState } from 'react';
import { Save, Plus, Trash2, RotateCw } from 'lucide-react';
import styles from './JobTracker.module.css';
import { api } from './jtApi';
import { Field } from './ui';
import { ANSWER_FIELDS, CUSTOM_MAX, PROFILE_MAX, cleanAnswers, withDefaults } from './copilotRules';

const STEPS = [
  <>In Chrome, open <code>chrome://extensions</code> and turn on <b>Developer mode</b> (top right).</>,
  <>Click <b>Load unpacked</b> and pick the <code>EXTENSION/JOB TRACKER COPILOT</code> folder of the Clark VA 360 project.</>,
  <>Click the extension’s icon and sign in with your Job Tracker username and password.</>,
  <>Open a job on OnlineJobs.ph, then its Apply page, and press <b>Write my application</b>.</>,
];

/* Copilot page: the profile and answer bank the Apply Copilot extension writes applications from.
   It loads its own data (jt_copilot_load); one Save stores both (jt_copilot_save). */
export default function Copilot({ notify, fail }) {
  const [loaded, setLoaded] = useState(null);       // null = loading | false = failed | { used_today, daily_cap }
  const [profile, setProfile] = useState('');
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const take = (s) => {
    setLoaded({ used_today: s.used_today ?? 0, daily_cap: s.daily_cap ?? 0 });
    setProfile(s.profile ?? '');
    setAnswers(withDefaults(s.answers ?? {}));
  };

  const load = useCallback(() => {
    setLoaded(null);
    api.copilotLoad().then(take).catch((err) => { setLoaded(false); fail(err); });
  }, [fail]);

  useEffect(() => { load(); }, [load]);

  const setAnswer = (key, value) => setAnswers(a => ({ ...a, [key]: value }));
  const custom = answers.custom ?? [];
  const setCustom = (next) => setAnswers(a => ({ ...a, custom: next }));
  const editRow = (i, key, value) => setCustom(custom.map((qa, j) => (j === i ? { ...qa, [key]: value } : qa)));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      take(await api.copilotSave(profile, cleanAnswers(answers)));
      notify('ok', 'Copilot profile saved.');
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <button type="submit" form="copilot-form" className={styles.btnPrimary} disabled={saving || !loaded}>
      <Save size={16} /> {saving ? 'Saving…' : 'Save'}
    </button>
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <span className={styles.eyebrow}>Apply Copilot</span>
          <h1>Your <em>application writer</em></h1>
          <p className={styles.muted}>The Copilot writes each OnlineJobs.ph application from what you save here. You read it and click Send yourself.</p>
        </div>
        <div className={styles.headActions}>{saveButton}</div>
      </header>

      {loaded === null && <p className={styles.muted}>Loading your Copilot settings…</p>}
      {loaded === false && (
        <div className={styles.card}>
          <p className={styles.muted}>Couldn’t load your Copilot settings.</p>
          <button className={styles.btnGhost} onClick={load}><RotateCw size={15} /> Try again</button>
        </div>
      )}

      {loaded && (
        <div className={styles.copilotGrid}>
          <form id="copilot-form" className={styles.copilotMain} onSubmit={save}>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h2>Your profile</h2>
                  <p className={styles.muted}>Who you are, what you’ve built and trained in, and your links. The AI only claims what’s written here.</p>
                </div>
              </div>
              <Field label="Profile" hint={`${profile.length.toLocaleString()} / ${PROFILE_MAX.toLocaleString()} characters`}>
                <textarea
                  className={styles.profileText}
                  value={profile}
                  onChange={e => setProfile(e.target.value)}
                  maxLength={PROFILE_MAX}
                  placeholder="Paste your one-page Copilot profile here."
                />
              </Field>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <h2>Answer bank</h2>
                  <p className={styles.muted}>Facts employers often ask for. They’re only used when a job post asks.</p>
                </div>
              </div>
              <div className={styles.answerGrid}>
                {ANSWER_FIELDS.map(f => (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    <input value={answers[f.key] ?? ''} onChange={e => setAnswer(f.key, e.target.value)} maxLength={f.max} />
                  </Field>
                ))}
              </div>

              <div className={styles.qaHead}>
                <h3>Saved answers</h3>
                <span className={styles.cardMeta}><b>{custom.length}</b> / {CUSTOM_MAX}</span>
              </div>
              {custom.length === 0 && <p className={styles.cardEmpty}>Questions that keep coming up, with the answer you want to give.</p>}
              {custom.map((qa, i) => (
                <div key={i} className={styles.qaRow}>
                  <label className={styles.field}>
                    <input aria-label="Question" placeholder="Question" value={qa.question ?? ''} maxLength={300} onChange={e => editRow(i, 'question', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <textarea aria-label="Answer" placeholder="Your answer" rows={2} value={qa.answer ?? ''} maxLength={1000} onChange={e => editRow(i, 'answer', e.target.value)} />
                  </label>
                  <button type="button" className={styles.iconBtn} onClick={() => setCustom(custom.filter((_, j) => j !== i))} aria-label="Remove this answer" title="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" className={styles.btnGhost} disabled={custom.length >= CUSTOM_MAX} onClick={() => setCustom([...custom, { question: '', answer: '' }])}>
                <Plus size={15} /> Add a saved answer
              </button>
            </section>

            <div className={styles.copilotSave}>{saveButton}</div>
          </form>

          <aside className={styles.copilotSide}>
            <section className={styles.card}>
              <div className={styles.cardHead}><h2>Today</h2></div>
              <p className={styles.usage}>
                <b>{loaded.used_today}</b> of <b>{loaded.daily_cap}</b> AI writes used
              </p>
              <p className={styles.fieldHint}>Resets at midnight, Philippine time.</p>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}><h2>Install the extension</h2></div>
              <ol className={styles.steps}>
                {STEPS.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
