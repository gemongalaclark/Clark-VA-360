import { useState } from 'react';
import { GraduationCap, Briefcase } from 'lucide-react';
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

function ToolCard({ tool }) {
  return (
    <li className={styles.toolCard} id={`skill-${tool.id}`}>
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
        <span className={styles.toolCategory}>{tool.category}</span>
      </div>
    </li>
  );
}

function ToolGroup({ icon: Icon, title, description, tools, tone }) {
  const [active, setActive] = useState('All');
  const categories = ['All', ...new Set(tools.map(t => t.category))];
  const visible = active === 'All' ? tools : tools.filter(t => t.category === active);

  return (
    <div className={styles.toolGroup}>
      <div className={styles.groupHeader}>
        <div className={`${styles.groupBadge} ${styles[tone]}`}><Icon size={22} /></div>
        <div className={styles.groupText}>
          <h3 className={styles.groupTitle}>{title}</h3>
          <p className={styles.groupDesc}>{description}</p>
        </div>
        <span className={styles.groupCount}>{tools.length} tools</span>
      </div>

      <div className={styles.filterRow} role="tablist" aria-label={`Filter ${title}`}>
        {categories.map(c => (
          <button
            key={c}
            role="tab"
            aria-selected={active === c}
            className={`${styles.filterPill} ${active === c ? styles.filterActive : ''}`}
            onClick={() => setActive(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className={styles.toolGrid}>
        {visible.map(tool => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </ul>
    </div>
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

        <ToolGroup
          icon={GraduationCap}
          tone="toneNavy"
          title="Tools from my BSIT Days"
          description="Tools and AI platforms I used during my Information Technology degree."
          tools={bsitTools}
        />

        <ToolGroup
          icon={Briefcase}
          tone="toneRed"
          title="Tools from my VA Training"
          description="Platforms and tools I'm mastering through intensive training at The VA Bar — training still ongoing!"
          tools={vaTools}
        />
      </div>
    </section>
  );
}
