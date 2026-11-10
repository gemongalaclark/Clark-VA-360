import { useEffect, useState } from 'react';
import styles from './VerseOfDay.module.css';

const API_URL = 'https://beta.ourmanna.com/api/v1/get?format=json&order=daily';
const CACHE_KEY = 'clarkva360-votd';
const FALLBACK = {
  text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
  reference: 'Colossians 3:23',
  version: 'NIV',
};

/* Local calendar date, so the verse rolls over at the visitor's midnight. */
const today = () => new Date().toLocaleDateString('en-CA');

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

export default function VerseOfDay() {
  const [verse, setVerse] = useState(() => {
    const cached = readCache();
    return cached?.date === today() ? cached : null;
  });

  useEffect(() => {
    if (verse) return undefined;
    const ctrl = new AbortController();

    fetch(API_URL, { signal: ctrl.signal })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then(data => {
        const d = data?.verse?.details;
        if (!d?.text || !d?.reference) throw new Error('Unexpected response');
        const next = { date: today(), text: d.text.trim(), reference: d.reference, version: d.version };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
        setVerse(next);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setVerse(readCache() || FALLBACK);
      });

    return () => ctrl.abort();
  }, [verse]);

  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <section className={styles.band} aria-labelledby="votd-heading">
      <div className={styles.inner}>
        <h2 id="votd-heading" className={styles.label}>Verse of the Day</h2>

        <figure className={`${styles.body} ${verse ? styles.ready : ''}`} aria-busy={!verse}>
          {verse && (
            <>
              <blockquote className={styles.text}>&ldquo;{verse.text}&rdquo;</blockquote>
              <figcaption className={styles.cite}>
                &mdash; {verse.reference}{verse.version ? ` (${verse.version})` : ''}
                <span className={styles.dot} aria-hidden="true">·</span>
                {date}
              </figcaption>
            </>
          )}
        </figure>

        <a className={styles.credit} href="https://www.ourmanna.com/" target="_blank" rel="noopener noreferrer">
          Powered by OurManna
        </a>
      </div>
    </section>
  );
}
