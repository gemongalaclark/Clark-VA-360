import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, Calendar, ArrowUpRight, ArrowRight, Users, Zap, Rocket } from 'lucide-react';
import styles from './Projects.module.css';

/* Projects data */
const projects = [
  {
    id: 1,
    category: 'AI Automation',
    title: "Google Calendar AUTO Scheduler",
    description: "Gemini AI-powered schedule scanner that automatically extracts shift rotas, PDF timetables, and spreadsheets to sync directly into Google Calendar.",
    tags: ['Gemini AI', 'Google Calendar API', 'Multimodal OCR', 'React'],
    image: null,
    liveUrl: '/auto-scheduler',
    githubUrl: null,
    placeholder: false,
    featured: true,
  },
  {
    id: 2,
    category: 'Team Collaboration',
    title: 'TeamSync Workspace',
    description: 'Real-time team collaboration platform with room-based workspaces, role-separated dashboards for owners and employees, task assignment and review, and instant notifications.',
    tags: ['React', 'Supabase', 'Realtime', 'Role-based Auth'],
    image: null,
    liveUrl: '/teamsync-workspace',
    githubUrl: null,
    placeholder: false,
    featured: false,
    inDevelopment: false,
  },
  {
    id: 3,
    category: 'In the pipeline',
    title: 'Coming Soon',
    description: 'Projects from my VA training will appear here as they develop.',
    tags: [],
    image: null,
    liveUrl: null,
    githubUrl: null,
    placeholder: true,
  },
  {
    id: 4,
    category: 'In the pipeline',
    title: 'Coming Soon',
    description: 'Building out my portfolio one project at a time.',
    tags: [],
    image: null,
    liveUrl: null,
    githubUrl: null,
    placeholder: true,
  },
];

/* Cards visible at once — mirrors the CSS breakpoints (--n) */
function usePerView() {
  const get = () => (window.matchMedia('(max-width: 600px)').matches ? 1
    : window.matchMedia('(max-width: 900px)').matches ? 2 : 3);
  const [n, setN] = useState(get);
  useEffect(() => {
    const onChange = () => setN(get());
    const mqs = ['(max-width: 600px)', '(max-width: 900px)'].map(q => window.matchMedia(q));
    mqs.forEach(m => m.addEventListener('change', onChange));
    return () => mqs.forEach(m => m.removeEventListener('change', onChange));
  }, []);
  return n;
}

const openProject = (url) => {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function ProjectCard({ project }) {
  const handleCardClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    if (!project.liveUrl) return;
    /* Internal routes use pushState; external links open in new tab */
    if (project.liveUrl.startsWith('/')) openProject(project.liveUrl);
    else window.open(project.liveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article
      className={`${styles.card} ${project.featured ? styles.featuredCard : ''} ${project.placeholder ? styles.placeholderCard : ''}`}
      id={`project-${project.id}`}
      onClick={handleCardClick}
      style={{ cursor: project.liveUrl ? 'pointer' : 'default' }}
    >
      {project.featured && (
        <div className={styles.featuredRibbon}>
          <Sparkles size={12} />
          <span>Featured AI Project</span>
        </div>
      )}

      {/* Graphic preview */}
      <div className={styles.cardImage}>
        {project.featured ? (
          <div className={styles.featuredGraphic}>
            <div className={styles.featuredGlow} />
            <div className={styles.featuredGraphicInner}>
              <div className={styles.graphicLogoWrap}>
                <img src="/images/logo.png" alt="Clark VA 360 Logo" className={styles.graphicLogoImg} />
              </div>
              <div className={styles.graphicCalWrap}>
                <Calendar size={26} className={styles.graphicCalIcon} />
                <span className={styles.graphicCalText}>Auto Scheduler</span>
              </div>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Sparkles size={11} /> Gemini AI</span>
                <span className={styles.graphicSyncPill}>Google Sync</span>
              </div>
            </div>
          </div>
        ) : project.id === 2 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <Users size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>TeamSync</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Zap size={11} /> Real-time</span>
                <span className={styles.teamsyncRolePill}>Role-based</span>
              </div>
            </div>
          </div>
        ) : project.image ? (
          <img src={project.image} alt={project.title} />
        ) : (
          <div className={styles.placeholderImg}>
            <span className={styles.placeholderIconWrap}><Rocket size={26} /></span>
            <span className={styles.placeholderText}>Project preview</span>
          </div>
        )}

        {!project.placeholder && project.liveUrl && (
          <div className={styles.cardOverlay}>
            <a
              href={project.liveUrl}
              className={styles.overlayBtn}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); openProject(project.liveUrl); }}
            >
              <ExternalLink size={16} /> Open Web App
            </a>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        <span className={styles.cardCategory}>{project.category}</span>
        <div className={styles.cardHeaderRow}>
          <h3 className={styles.cardTitle}>{project.title}</h3>
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cardArrowLink}
              title={`Open ${project.title} in a new tab`}
              aria-label={`Open ${project.title} in a new tab`}
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
        <p className={styles.cardDesc}>{project.description}</p>
        {project.tags.length > 0 && (
          <div className={styles.tagRow}>
            {project.tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        <div className={styles.cardFooter}>
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              className={styles.viewBtn}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openProject(project.liveUrl); }}
            >
              View project <ArrowRight size={15} />
            </a>
          ) : (
            <span className={styles.soonChip}><span className={styles.soonDot} /> In planning</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const perView = usePerView();
  const maxIndex = Math.max(0, projects.length - perView);
  const index = Math.min(currentIndex, maxIndex);

  const goTo = (i) => setCurrentIndex(Math.max(0, Math.min(i, maxIndex)));
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  /* Touch/swipe support */
  const [touchStart, setTouchStart] = useState(null);
  const onTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) (diff > 0 ? next() : prev());
    setTouchStart(null);
  };

  return (
    <section id="projects" className={`section ${styles.projects}`}>
      <div className="container">
        <h2 className="section-title">My <span>Projects</span></h2>
        <div className="section-divider" />
        <p className={styles.sectionSubtitle}>
          Real tools I've designed and built. Click a card to try it live.
        </p>

        <div className={styles.carouselWrapper}>
          <button
            id="carousel-prev"
            className={`${styles.navBtn} ${index === 0 ? styles.disabled : ''}`}
            onClick={prev}
            aria-label="Previous project"
            disabled={index === 0}
          >
            <ChevronLeft size={22} />
          </button>

          <div className={styles.trackOuter} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className={styles.track} style={{ '--i': index }}>
              {projects.map(project => (
                <div key={project.id} className={styles.slide}>
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          </div>

          <button
            id="carousel-next"
            className={`${styles.navBtn} ${index >= maxIndex ? styles.disabled : ''}`}
            onClick={next}
            aria-label="Next project"
            disabled={index >= maxIndex}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Pager */}
        {maxIndex > 0 && (
          <div className={styles.pager}>
            <div className={styles.dots}>
              {Array.from({ length: maxIndex + 1 }, (_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Show projects from ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
            <span className={styles.counter}>
              {String(index + 1).padStart(2, '0')} / {String(maxIndex + 1).padStart(2, '0')}
            </span>
          </div>
        )}

        <p className={styles.hint}>
          <Sparkles size={14} /> Tip: open the Auto Scheduler to test drive the Gemini AI schedule scanner.
        </p>
      </div>
    </section>
  );
}
