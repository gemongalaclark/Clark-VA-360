import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Flame, Timer, Send, Trophy, Loader2, AlertTriangle, Archive, Inbox, Sparkles, Mail, CheckCircle2 } from 'lucide-react';
import styles from './QuoteVelo.module.css';
import { STAGES, TAGS, timeAgo, initials, fmtDuration, isTriaging, isStuck } from './qvData';
import { Spinner, useToast, ScoreDial, TagPill } from './ui';
import LeadDetail from './LeadDetail';

const STAGE_ICON = { new: Inbox, scored: Sparkles, sent: Mail, won: Trophy };

function LeadCard({ lead, now, onOpen }) {
  const triaging = isTriaging(lead);
  const stuck = isStuck(lead, now);
  const sending = lead.status === 'scored' && !!lead.send_requested_at;

  return (
    <button className={styles.leadCard} onClick={() => onOpen(lead.id)}>
      <span className={styles.leadTop}>
        <span className={styles.avatar}>{initials(lead.company || lead.full_name)}</span>
        <span className={styles.leadWho}>
          <strong>{lead.company || lead.full_name}</strong>
          <small>{lead.company ? lead.full_name : lead.email}</small>
        </span>
        {lead.ai_score != null && <ScoreDial score={lead.ai_score} size="sm" />}
      </span>

      <span className={styles.leadMeta}>
        <span>{lead.service_type}</span>
        <span>{lead.budget_range}</span>
      </span>

      <span className={styles.leadFoot}>
        {lead.ai_tag && <TagPill tag={lead.ai_tag} />}
        {triaging && !stuck && <span className={styles.drafting}><Loader2 className={styles.spin} size={12} /> AI is drafting…</span>}
        {stuck && <span className={styles.stuck}><AlertTriangle size={12} /> Automation not responding</span>}
        {lead.ai_error && <span className={styles.stuck}><AlertTriangle size={12} /> Draft failed</span>}
        {sending && <span className={styles.drafting}><Loader2 className={styles.spin} size={12} /> Sending…</span>}
        <span className={styles.leadAge}>{timeAgo(lead.status === 'sent' && lead.sent_at ? lead.sent_at : lead.created_at, now)}</span>
      </span>
    </button>
  );
}

export default function AdminDashboard({ api, profile }) {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showLost, setShowLost] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [toastNode, notify] = useToast();

  const refresh = useCallback(async () => {
    try {
      setLeads(await api.listLeads());
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load leads');
    }
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => api.subscribe(refresh), [api, refresh]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (leads || []).filter(l =>
      (!tagFilter || l.ai_tag === tagFilter) &&
      (!q || [l.full_name, l.company, l.email, l.service_type].some(v => v?.toLowerCase().includes(q))));
  }, [leads, query, tagFilter]);

  const columns = useMemo(() => {
    const out = { new: [], scored: [], sent: [], won: [], lost: [] };
    visible.forEach(l => out[l.status]?.push(l));
    /* Highest score first where the owner has to act; newest first elsewhere (list is already newest first). */
    out.scored.sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
    return out;
  }, [visible]);

  const stats = useMemo(() => {
    const all = leads || [];
    const live = all.filter(l => l.status !== 'lost');
    const times = all.filter(l => l.scored_at).map(l => new Date(l.scored_at) - new Date(l.created_at)).filter(t => t >= 0);
    return {
      open: live.filter(l => l.status === 'new' || l.status === 'scored').length,
      hot: all.filter(l => l.status === 'scored' && l.ai_tag === 'High Priority').length,
      draftTime: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      sent: all.filter(l => l.status === 'sent').length,
      won: all.filter(l => l.status === 'won').length,
    };
  }, [leads]);

  if (error) return <div className={styles.card}><p className={styles.fieldError}>{error}</p></div>;
  if (!leads) return <Spinner label="Loading leads…" />;

  const selected = leads.find(l => l.id === selectedId);

  return (
    <div>
      {toastNode}
      <header className={styles.adminHead}>
        <div>
          <h1>Lead pipeline</h1>
          <p className={styles.muted}>Signed in as {profile.full_name || profile.email}. Updates live as the AI finishes.</p>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}><Inbox size={18} /><strong>{stats.open}</strong><span>Open leads</span></div>
        <div className={`${styles.stat} ${stats.hot ? styles.statHot : ''}`}><Flame size={18} /><strong>{stats.hot}</strong><span>High priority to approve</span></div>
        <div className={styles.stat}><Timer size={18} /><strong>{fmtDuration(stats.draftTime)}</strong><span>Avg time to AI draft</span></div>
        <div className={styles.stat}><Send size={18} /><strong>{stats.sent}</strong><span>Proposals sent</span></div>
        <div className={styles.stat}><Trophy size={18} /><strong>{stats.won}</strong><span>Won</span></div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <label htmlFor="qv-search" className={styles.srOnly}>Search leads</label>
          <input id="qv-search" type="search" placeholder="Search name, company, email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className={styles.chips} role="group" aria-label="Filter by tag">
          <button className={`${styles.chip} ${!tagFilter ? styles.chipOn : ''}`} onClick={() => setTagFilter('')} aria-pressed={!tagFilter}>All</button>
          {TAGS.map(t => (
            <button key={t} className={`${styles.chip} ${tagFilter === t ? styles.chipOn : ''}`} onClick={() => setTagFilter(tagFilter === t ? '' : t)} aria-pressed={tagFilter === t}>{t}</button>
          ))}
        </div>
        <button className={`${styles.chip} ${showLost ? styles.chipOn : ''}`} onClick={() => setShowLost(v => !v)} aria-pressed={showLost}>
          <Archive size={13} /> Lost ({columns.lost.length})
        </button>
      </div>

      <div className={styles.kanban}>
        {STAGES.map(({ key, title, hint }) => {
          const Icon = STAGE_ICON[key];
          return (
            <section key={key} className={styles.column} aria-label={title}>
              <h2 className={`${styles.columnHead} ${styles[`stage_${key}`]}`}>
                <Icon size={16} /> {title} <span className={styles.count}>{columns[key].length}</span>
              </h2>
              <p className={styles.columnHint}>{hint}</p>
              {columns[key].length === 0 && <p className={styles.columnEmpty}>No leads here</p>}
              {columns[key].map(l => <LeadCard key={l.id} lead={l} now={now} onOpen={setSelectedId} />)}
            </section>
          );
        })}
      </div>

      {showLost && (
        <section className={`${styles.lostPanel}`} aria-label="Lost leads">
          <h2 className={styles.columnHead}><Archive size={16} /> Lost <span className={styles.count}>{columns.lost.length}</span></h2>
          {columns.lost.length === 0 && <p className={styles.columnEmpty}>Nothing lost. Nice.</p>}
          <div className={styles.lostGrid}>
            {columns.lost.map(l => <LeadCard key={l.id} lead={l} now={now} onOpen={setSelectedId} />)}
          </div>
        </section>
      )}

      {stats.won > 0 && stats.open === 0 && (
        <p className={styles.allClear}><CheckCircle2 size={16} /> Inbox zero: every lead has a proposal out or a decision.</p>
      )}

      {selected && (
        <LeadDetail
          key={selected.id}
          api={api}
          lead={selected}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
          notify={notify}
        />
      )}
    </div>
  );
}
