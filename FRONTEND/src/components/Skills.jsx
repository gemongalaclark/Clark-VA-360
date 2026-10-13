import styles from './Skills.module.css';

/* ── Tool data with SVG icons or emoji fallbacks ── */
const bsitTools = [
  {
    id: 'claude',
    name: 'Claude',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Claude_AI_logo.svg',
    type: 'img',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: 'https://assets.perplexity.ai/brand-assets/logo-light.svg',
    type: 'img',
    fallback: '🔍',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: null,
    type: 'emoji',
    fallback: '🤖',
  },
  {
    id: 'ms365',
    name: 'Microsoft 365',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg/1200px-Microsoft_Office_logo_%282019%E2%80%93present%29.svg.png',
    type: 'img',
  },
  {
    id: 'canva-bsit',
    name: 'Canva',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Canva_icon_2021.svg/1200px-Canva_icon_2021.svg.png',
    type: 'img',
  },
];

const vaTools = [
  {
    id: 'signaturehound',
    name: 'SignatureHound',
    icon: null,
    type: 'emoji',
    fallback: '✉️',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    icon: 'https://asset.brandfetch.io/idB7HEiMB3/idAazpRXeD.png',
    type: 'img',
    fallback: '📅',
  },
  {
    id: 'meta-business',
    name: 'Meta Business Suite',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/1200px-Meta_Platforms_Inc._logo.svg.png',
    type: 'img',
  },
  {
    id: 'buffer',
    name: 'Buffer',
    icon: 'https://buffer.com/resources/content/images/2022/09/buffer-logo.png',
    type: 'img',
    fallback: '📤',
  },
  {
    id: 'linktree',
    name: 'Linktree',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Linktree-logo.svg/1200px-Linktree-logo.svg.png',
    type: 'img',
    fallback: '🌲',
  },
  {
    id: 'metricool',
    name: 'Metricool',
    icon: null,
    type: 'emoji',
    fallback: '📊',
  },
  {
    id: 'snov',
    name: 'Snov.io',
    icon: null,
    type: 'emoji',
    fallback: '📧',
  },
  {
    id: 'contactout',
    name: 'ContactOut',
    icon: null,
    type: 'emoji',
    fallback: '📋',
  },
  {
    id: 'apollo',
    name: 'Apollo.io',
    icon: 'https://asset.brandfetch.io/idnrCPuv87/id53r_YtSL.png',
    type: 'img',
    fallback: '🚀',
  },
  {
    id: 'canva-va',
    name: 'Canva',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Canva_icon_2021.svg/1200px-Canva_icon_2021.svg.png',
    type: 'img',
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Breezeicons-apps-48-trello.svg/1200px-Breezeicons-apps-48-trello.svg.png',
    type: 'img',
  },
  {
    id: 'ms365-va',
    name: 'Microsoft 365',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg/1200px-Microsoft_Office_logo_%282019%E2%80%93present%29.svg.png',
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
