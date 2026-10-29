import { useState } from 'react';
import { GraduationCap, Briefcase, Check } from 'lucide-react';
import styles from './Skills.module.css';

/* ── Tool data with SVG icons or emoji fallbacks ── */
const bsitTools = [
  {
    id: 'claude',
    category: 'AI Assistants',
    name: 'Claude',
    icon: '/images/icons/claude.png',
    type: 'img',
  },
  {
    id: 'perplexity',
    category: 'AI Assistants',
    name: 'Perplexity',
    icon: '/images/icons/perplexity.png',
    type: 'img',
    fallback: '🔍',
  },
  {
    id: 'deepseek',
    category: 'AI Assistants',
    name: 'DeepSeek',
    icon: '/images/icons/deepseek.png',
    type: 'img',
    fallback: '🤖',
  },
  {
    id: 'ms365',
    category: 'Productivity',
    name: 'Microsoft 365',
    icon: '/images/icons/ms365.png',
    type: 'img',
  },
  {
    id: 'canva-bsit',
    category: 'Design',
    name: 'Canva',
    icon: '/images/icons/canva.png',
    type: 'img',
  },
];

const vaTools = [
  {
    id: 'signaturehound',
    category: 'Email & Scheduling',
    name: 'SignatureHound',
    icon: '/images/icons/signaturehound.png',
    type: 'img',
    fallback: '✉️',
  },
  {
    id: 'calendly',
    category: 'Email & Scheduling',
    name: 'Calendly',
    icon: '/images/icons/calendly.png',
    type: 'img',
    fallback: '📅',
  },
  {
    id: 'meta-business',
    category: 'Social Media',
    name: 'Meta Business Suite',
    icon: '/images/icons/meta suite.png',
    type: 'img',
  },
  {
    id: 'buffer',
    category: 'Social Media',
    name: 'Buffer',
    icon: '/images/icons/buffer.png',
    type: 'img',
    fallback: '📤',
  },
  {
    id: 'linktree',
    category: 'Social Media',
    name: 'Linktree',
    icon: '/images/icons/linktree.png',
    type: 'img',
    fallback: '🌲',
  },
  {
    id: 'metricool',
    category: 'Social Media',
    name: 'Metricool',
    icon: '/images/icons/metricool.png',
    type: 'img',
    fallback: '📊',
  },
  {
    id: 'snov',
    category: 'Lead Generation',
    name: 'Snov.io',
    icon: '/images/icons/snov.png',
    type: 'img',
    fallback: '📧',
  },
  {
    id: 'contactout',
    category: 'Lead Generation',
    name: 'ContactOut',
    icon: '/images/icons/contactout.png',
    type: 'img',
    fallback: '📋',
  },
  {
    id: 'apollo',
    category: 'Lead Generation',
    name: 'Apollo.io',
    icon: '/images/icons/apollo.png',
    type: 'img',
    fallback: '🚀',
  },
  {
    id: 'canva-va',
    category: 'Design',
    name: 'Canva',
    icon: '/images/icons/canva.png',
    type: 'img',
  },
  {
    id: 'trello',
    category: 'Productivity',
    name: 'Trello',
    icon: '/images/icons/trello.png',
    type: 'img',
  },
  {
    id: 'ms365-va',
    category: 'Productivity',
    name: 'Microsoft 365',
    icon: '/images/icons/ms365.png',
    type: 'img',
  },
];

/* Accent colour per category — tints icon tiles, dots and hover borders */
const categoryColors = {
  'AI Assistants': '#7c3aed',
  'Productivity': '#2563eb',
  'Design': '#db2777',
  'Email & Scheduling': '#0891b2',
  'Social Media': '#ea580c',
  'Lead Generation': '#059669',
};

const allTools = [...bsitTools, ...vaTools];
const stats = [
  { value: new Set(allTools.map(t => t.name)).size, label: 'Tools learned' },
  { value: new Set(allTools.map(t => t.category)).size, label: 'Categories' },
  { value: 2, label: 'Learning tracks' },
];

function ToolCard({ tool, dimmed, index }) {
  return (
    <li
      className={`${styles.toolCard} ${dimmed ? styles.dimmed : ''}`}
      id={`skill-${tool.id}`}
      style={{ '--accent': categoryColors[tool.category], '--delay': `${index * 40}ms` }}
    >
      <div className={styles.iconBox}>
        {tool.type === 'img' && tool.icon ? (
          <img
            src={tool.icon}
            alt=""
            className={styles.toolIcon}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        ) : null}
        <span
          className={styles.toolEmoji}
          style={{ display: tool.type === 'emoji' || !tool.icon ? 'block' : 'none' }}
        >
          {tool.fallback || '🔧'}
        </span>
      </div>
      <div className={styles.toolText}>
        <span className={styles.toolName}>{tool.name}</span>
        <span className={styles.toolCategory}>
          <span className={styles.catDot} aria-hidden="true" />
          {tool.category}
        </span>
      </div>
    </li>
  );
}

function ToolGroup({ icon: Icon, track, status, ongoing, title, description, tools, tone }) {
  const [active, setActive] = useState('All');
  const categories = ['All', ...new Set(tools.map(t => t.category))];
  const countFor = c => (c === 'All' ? tools.length : tools.filter(t => t.category === c).length);

  return (
    <article className={`${styles.toolGroup} ${styles[tone]}`}>
      <header className={styles.groupHeader}>
        <div className={styles.groupBadge}><Icon size={24} strokeWidth={2} /></div>
        <div className={styles.groupText}>
          <div className={styles.groupEyebrow}>
            <span>{track}</span>
            <span className={`${styles.statusTag} ${ongoing ? styles.statusLive : ''}`}>
              {ongoing ? <span className={styles.liveDot} aria-hidden="true" /> : <Check size={12} strokeWidth={3} />}
              {status}
            </span>
          </div>
          <h3 className={styles.groupTitle}>{title}</h3>
          <p className={styles.groupDesc}>{description}</p>
        </div>
        <div className={styles.groupCount}>
          <span className={styles.countNum}>{String(tools.length).padStart(2, '0')}</span>
          <span className={styles.countLabel}>tools</span>
        </div>
      </header>

      <div className={styles.filterRow} role="group" aria-label={`Filter ${title}`}>
        {categories.map(c => (
          <button
            key={c}
            type="button"
            aria-pressed={active === c}
            className={`${styles.filterPill} ${active === c ? styles.filterActive : ''}`}
            style={c !== 'All' ? { '--accent': categoryColors[c] } : undefined}
            onClick={() => setActive(c)}
          >
            {c !== 'All' && <span className={styles.catDot} aria-hidden="true" />}
            {c}
            <span className={styles.pillCount}>{countFor(c)}</span>
          </button>
        ))}
      </div>

      <ul className={styles.toolGrid}>
        {tools.map((tool, i) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            index={i}
            dimmed={active !== 'All' && tool.category !== active}
          />
        ))}
      </ul>
    </article>
  );
}

export default function Skills() {
  return (
    <section id="skills" className={`section ${styles.skills}`}>
      <div className="container">
        <h2 className="section-title">My <span>Skills</span></h2>
        <div className="section-divider" />
        <p className={styles.sectionSubtitle}>
          The platforms I know, from my IT degree to hands-on virtual assistant training.
        </p>

        <ul className={styles.statsStrip}>
          {stats.map(s => (
            <li key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </li>
          ))}
        </ul>

        <div className={styles.tracks}>
          <ToolGroup
            icon={GraduationCap}
            tone="toneNavy"
            track="Track 01"
            status="Completed"
            title="Tools from my BSIT Days"
            description="Tools and AI platforms I used during my Information Technology degree."
            tools={bsitTools}
          />

          <ToolGroup
            icon={Briefcase}
            tone="toneRed"
            track="Track 02"
            status="In progress"
            ongoing
            title="Tools from my VA Training"
            description="Platforms and tools I'm mastering through intensive training at The VA Bar — training still ongoing!"
            tools={vaTools}
          />
        </div>
      </div>
    </section>
  );
}
