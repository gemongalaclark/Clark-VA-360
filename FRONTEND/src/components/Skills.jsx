import styles from './Skills.module.css';

/* ── Tool data with SVG icons or emoji fallbacks ── */
const bsitTools = [
  {
    id: 'claude',
    name: 'Claude',
    icon: '/images/icons/claude.png',
    type: 'img',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '/images/icons/perplexity.png',
    type: 'img',
    fallback: '🔍',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '/images/icons/deepseek.png',
    type: 'img',
    fallback: '🤖',
  },
  {
    id: 'ms365',
    name: 'Microsoft 365',
    icon: '/images/icons/ms365.png',
    type: 'img',
  },
  {
    id: 'canva-bsit',
    name: 'Canva',
    icon: '/images/icons/canva.png',
    type: 'img',
  },
];

const vaTools = [
  {
    id: 'signaturehound',
    name: 'SignatureHound',
    icon: '/images/icons/signaturehound.png',
    type: 'img',
    fallback: '✉️',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    icon: '/images/icons/calendly.png',
    type: 'img',
    fallback: '📅',
  },
  {
    id: 'meta-business',
    name: 'Meta Business Suite',
    icon: '/images/icons/meta suite.png',
    type: 'img',
  },
  {
    id: 'buffer',
    name: 'Buffer',
    icon: '/images/icons/buffer.png',
    type: 'img',
    fallback: '📤',
  },
  {
    id: 'linktree',
    name: 'Linktree',
    icon: '/images/icons/linktree.png',
    type: 'img',
    fallback: '🌲',
  },
  {
    id: 'metricool',
    name: 'Metricool',
    icon: '/images/icons/metricool.png',
    type: 'img',
    fallback: '📊',
  },
  {
    id: 'snov',
    name: 'Snov.io',
    icon: '/images/icons/snov.png',
    type: 'img',
    fallback: '📧',
  },
  {
    id: 'contactout',
    name: 'ContactOut',
    icon: '/images/icons/contactout.png',
    type: 'img',
    fallback: '📋',
  },
  {
    id: 'apollo',
    name: 'Apollo.io',
    icon: '/images/icons/apollo.png',
    type: 'img',
    fallback: '🚀',
  },
  {
    id: 'canva-va',
    name: 'Canva',
    icon: '/images/icons/canva.png',
    type: 'img',
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: '/images/icons/trello.png',
    type: 'img',
  },
  {
    id: 'ms365-va',
    name: 'Microsoft 365',
    icon: '/images/icons/ms365.png',
    type: 'img',
  },
];

function ToolCard({ tool }) {
  return (
    <div className={styles.toolCard} id={`skill-${tool.id}`}>
      <div className={styles.iconBox}>
        {tool.type === 'img' && tool.icon ? (
          <img
            src={tool.icon}
            alt={tool.name}
            className={styles.toolIcon}
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
      <span className={styles.toolName}>{tool.name}</span>
    </div>
  );
}

export default function Skills() {
  return (
    <section id="skills" className={`section ${styles.skills}`}>
      <div className="container">
        <h2 className="section-title">My <span>Skills</span></h2>
        <div className="section-divider" />

        {/* BSIT Tools */}
        <div className={styles.toolGroup}>
          <div className={styles.groupHeader}>
            <div className={styles.groupBadge}>🎓</div>
            <div>
              <h3 className={styles.groupTitle}>Tools from my BSIT Days</h3>
              <p className={styles.groupDesc}>Tools and AI platforms I used during my Information Technology degree.</p>
            </div>
          </div>
          <div className={styles.toolGrid}>
            {bsitTools.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>

        {/* VA Training Tools */}
        <div className={styles.toolGroup}>
          <div className={styles.groupHeader}>
            <div className={styles.groupBadge}>💼</div>
            <div>
              <h3 className={styles.groupTitle}>Tools from my VA Training</h3>
              <p className={styles.groupDesc}>Platforms and tools I&apos;m mastering through intensive training at The VA Bar — training still ongoing!</p>
            </div>
          </div>
          <div className={styles.toolGrid}>
            {vaTools.map(tool => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
