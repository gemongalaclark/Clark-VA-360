import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, UserRound, Bookmark, FileText, Search, Inbox, AlertTriangle } from 'lucide-react';
import styles from './BuhayvaCopilot.module.css';
import { PLATFORMS, STATUSES, MAX_DESCRIPTION, detectPlatform, guessTitle, safeUrl, SAMPLE_JOB } from './bvData';
import { Spinner, useToast } from './ui';
import JobCard from './JobCard';
import ProfileModal from './ProfileModal';
import BookmarkletModal from './BookmarkletModal';

const FILTERS = ['All', ...STATUSES];

function Stats({ jobs }) {
  const scored = jobs.filter(j => j.fit_score != null);
  const avg = scored.length ? Math.round(scored.reduce((s, j) => s + j.fit_score, 0) / scored.length) : null;
  const count = (s) => jobs.filter(j => j.status === s).length;
  const items = [
    ['Analyzed', jobs.length],
    ['Applied', count('Applied') + count('Interviewing') + count('Offer')],
    ['Interviewing', count('Interviewing')],
    ['Offers', count('Offer')],
    ['Avg. fit', avg == null ? '—' : `${avg}%`],
  ];
  return (
    <div className={styles.stats}>
      {items.map(([label, value]) => (
        <div key={label} className={styles.stat}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function CopilotDashboard({ api, mode, profile, onProfileSaved, ingest, onIngestConsumed }) {
  const [jobs, setJobs] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [platform, setPlatform] = useState('OnlineJobs.ph');
  const [jobUrl, setJobUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(() => new Set());
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [showProfile, setShowProfile] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [toast, notify] = useToast();
  const autoRan = useRef(false);

  const hasProfile = !!profile?.resume_text;

  useEffect(() => {
    let alive = true;
    api.listJobs()
      .then(list => alive && setJobs(list))
      .catch(e => alive && setLoadError(e.message || 'Could not load your jobs.'));
    return () => { alive = false; };
  }, [api]);

  const upsertJob = useCallback((job) => {
    setJobs(list => {
      const rest = (list || []).filter(j => j.id !== job.id);
      return [job, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at));
    });
  }, []);

  const setBusy = (id, on) => setAnalyzing(prev => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });

  const runAnalysis = useCallback(async (job) => {
    setBusy(job.id, true);
    upsertJob({ ...job, analysis_state: 'pending', analysis_error: null });
    try {
      const done = await api.analyzeJob(job);
      upsertJob(done);
      if (done.analysis_state === 'done') notify(`Scored ${done.fit_score ?? '?'}% fit: pitch ready.`);
      else notify(done.analysis_error || 'Analysis failed.', 'error');
    } catch (e) {
      notify(e.message || 'Analysis failed.', 'error');
    } finally {
      setBusy(job.id, false);
    }
  }, [api, notify, upsertJob]);

  const analyze = useCallback(async ({ platform: p, job_url: url, raw_description: text }) => {
    const raw = text.trim();
    if (!raw || !hasProfile) return;
    setSubmitting(true);
    try {
      const job = await api.createJob({
        platform: p,
        job_url: safeUrl(url) || null,
        raw_description: raw.slice(0, MAX_DESCRIPTION),
        job_title: guessTitle(raw),
      });
      upsertJob(job);
      setDescription('');
      setJobUrl('');
      setFilter('All');
      runAnalysis(job);   // runs in the background; the card shows progress
    } catch (e) {
      notify(e.message || 'Could not save the job.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [api, hasProfile, notify, runAnalysis, upsertJob]);

  /* A job sent from the bookmarklet: prefill the form, and auto-run when it provably came from Upwork / OLJ. */
  useEffect(() => {
    if (!ingest || jobs === null) return;
    if (ingest.autoRun && hasProfile && !autoRan.current) {
      autoRan.current = true;
      analyze(ingest);
    } else {
      setPlatform(ingest.platform);
      setJobUrl(ingest.job_url || '');
      setDescription(ingest.raw_description);
      notify('Job post received from the bookmarklet. Review it, then press Score Job.');
    }
    onIngestConsumed();
  }, [ingest, jobs, hasProfile, analyze, notify, onIngestConsumed]);

  const onSubmit = (e) => {
    e.preventDefault();
    analyze({ platform, job_url: jobUrl, raw_description: description });
  };

  const onUrlChange = (value) => {
    setJobUrl(value);
    const p = detectPlatform(value);
    if (p !== 'Other') setPlatform(p);
  };

  const loadSample = () => {
    setPlatform(SAMPLE_JOB.platform);
    setJobUrl(SAMPLE_JOB.job_url);
    setDescription(SAMPLE_JOB.raw_description);
  };

  const updateJob = async (id, patch) => {
    try {
      upsertJob(await api.updateJob(id, patch));
      return true;
    } catch (e) {
      notify(e.message || 'Could not save the change.', 'error');
      return false;
    }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Delete "${job.job_title}"? This can't be undone.`)) return;
    try {
      await api.deleteJob(job.id);
      setJobs(list => list.filter(j => j.id !== job.id));
      notify('Job deleted.');
    } catch (e) {
      notify(e.message || 'Could not delete the job.', 'error');
    }
  };

  const visible = useMemo(() => {
    if (!jobs) return [];
    const q = query.trim().toLowerCase();
    return jobs
      .filter(j => filter === 'All' || j.status === filter)
      .filter(j => !q || [j.job_title, j.company_or_client, j.raw_description, j.notes]
        .some(v => v?.toLowerCase().includes(q)))
      .sort((a, b) => (sort === 'fit'
        ? (b.fit_score ?? -1) - (a.fit_score ?? -1)
        : b.created_at.localeCompare(a.created_at)));
  }, [jobs, filter, query, sort]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashHead}>
        <div>
          <span className={styles.eyebrow}>{mode === 'demo' ? 'Demo workspace' : 'Your workspace'}</span>
          <h1>{profile?.full_name ? `Mabuhay, ${profile.full_name.split(' ')[0]}!` : 'Welcome to your Copilot'}</h1>
        </div>
        <div className={styles.rowGap}>
          <button className={styles.btnGhost} onClick={() => setShowBookmarklet(true)}><Bookmark size={16} /> 1-click bookmarklet</button>
          <button className={styles.btnGhost} onClick={() => setShowProfile(true)}><UserRound size={16} /> Master profile</button>
        </div>
      </div>

      {jobs && <Stats jobs={jobs} />}

      <div className={styles.dashGrid}>
        <form onSubmit={onSubmit} className={`${styles.card} ${styles.analyzeCard}`}>
          <h2>Analyze a new job post</h2>
          {!hasProfile && (
            <p className={styles.calloutWarn}>
              <AlertTriangle size={18} />
              <span>
                Add your master resume first. Gemini compares every job against it.{' '}
                <button type="button" className={styles.linkBtn} onClick={() => setShowProfile(true)}>Set up profile</button>
              </span>
            </p>
          )}
          <div className={styles.field}>
            <label htmlFor="bv-platform">Platform</label>
            <select id="bv-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="bv-url">Job URL <span className={styles.muted}>(optional)</span></label>
            <input id="bv-url" type="url" placeholder="https://www.onlinejobs.ph/jobseekers/job/…" value={jobUrl} onChange={(e) => onUrlChange(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="bv-desc">Job description</label>
            <textarea
              id="bv-desc" rows={11} required maxLength={MAX_DESCRIPTION}
              placeholder="Paste the full Upwork or OnlineJobs.ph job description here…"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
            <div className={styles.fieldFoot}>
              <button type="button" className={styles.linkBtn} onClick={loadSample}><FileText size={13} /> Load sample job</button>
              <span className={styles.muted}>{description.length.toLocaleString()} / {MAX_DESCRIPTION.toLocaleString()}</span>
            </div>
          </div>
          <button type="submit" className={`${styles.btnPrimary} ${styles.btnBlock}`} disabled={submitting || !hasProfile || !description.trim()}>
            {submitting ? <Loader2 className={styles.spin} size={16} /> : <Sparkles size={16} />}
            {submitting ? 'Saving…' : 'Score Job & Draft Pitch'}
          </button>
          <p className={styles.muted}>
            {mode === 'demo'
              ? 'Demo mode uses a local rule-based analyzer. Live mode uses Gemini 2.5 Flash.'
              : 'Gemini usually answers in 10–30 seconds. You can queue several jobs.'}
          </p>
        </form>

        <section className={styles.jobsCol} aria-label="Analyzed jobs">
          <div className={styles.toolbar}>
            <div className={styles.chips} role="tablist" aria-label="Filter by status">
              {FILTERS.map(f => {
                const n = jobs ? (f === 'All' ? jobs.length : jobs.filter(j => j.status === f).length) : 0;
                return (
                  <button
                    key={f} role="tab" aria-selected={filter === f}
                    className={`${styles.chip} ${filter === f ? styles.chipActive : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f} <span>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.toolbarRow}>
              <label className={styles.search}>
                <Search size={15} />
                <span className={styles.srOnly}>Search jobs</span>
                <input type="search" placeholder="Search title, client, notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <label className={styles.srOnly} htmlFor="bv-sort">Sort</label>
              <select id="bv-sort" className={styles.sortSelect} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="fit">Best fit first</option>
              </select>
            </div>
          </div>

          {loadError && <p className={styles.fieldError} role="alert">{loadError}</p>}
          {jobs === null && !loadError && <Spinner label="Loading your pipeline…" />}
          {jobs && visible.length === 0 && (
            <div className={`${styles.card} ${styles.empty}`}>
              <Inbox size={28} />
              <strong>{jobs.length ? 'No jobs match this filter.' : 'No jobs analyzed yet.'}</strong>
              <span className={styles.muted}>
                {jobs.length ? 'Try another status or clear the search.' : 'Paste a job post on the left, or press “Load sample job” to see it in action.'}
              </span>
            </div>
          )}
          {visible.map(job => (
            <JobCard
              key={job.id}
              job={job}
              busy={analyzing.has(job.id)}
              onRetry={() => runAnalysis(job)}
              onUpdate={(patch) => updateJob(job.id, patch)}
              onDelete={() => deleteJob(job)}
              notify={notify}
            />
          ))}
        </section>
      </div>

      {showProfile && (
        <ProfileModal
          api={api}
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={(p) => { onProfileSaved(p); setShowProfile(false); notify('Master profile saved.'); }}
        />
      )}
      {showBookmarklet && <BookmarkletModal onClose={() => setShowBookmarklet(false)} />}
      {toast}
    </div>
  );
}
