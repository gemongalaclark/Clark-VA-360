import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, Calendar, ArrowUpRight, ArrowRight, Zap, Rocket, ClipboardCheck, ShieldCheck, BookOpen, X, Briefcase, Wallet, Target, Gamepad2, Send, Bookmark, MailCheck } from 'lucide-react';
import { projects, docs, openProject, HOME_FEATURED_IDS } from './projectsData';
import styles from './Projects.module.css';

export function DocsModal({ project, onClose }) {
  const doc = docs[project.id];
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className={styles.docsBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.docsModal} role="dialog" aria-modal="true" aria-labelledby="docs-title">
        <button ref={closeRef} className={styles.docsClose} onClick={onClose} aria-label="Close guide"><X size={18} /></button>
        <span className={styles.cardCategory}>{project.category} · Project guide</span>
        <h3 id="docs-title" className={styles.docsTitle}>{project.title}</h3>

        <h4>What is it?</h4>
        <p>{doc.what}</p>

        <h4>How do I use it?</h4>
        <ol>{doc.use.map(t => <li key={t}>{t}</li>)}</ol>

        <h4>What is it for?</h4>
        <p>{doc.purpose}</p>

        <h4>How can it help?</h4>
        <ul>{doc.help.map(t => <li key={t}>{t}</li>)}</ul>

        <div className={styles.docsActions}>
          <a
            href={project.liveUrl}
            className={styles.docsOpen}
            onClick={(e) => { e.preventDefault(); onClose(); openProject(project.liveUrl); }}
          >
            Open {project.title} <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}

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

export function ProjectCard({ project, onDocs }) {
  const handleCardClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return;
    if (!project.liveUrl) return;
    /* Internal routes use pushState; external links open in new tab */
    if (project.liveUrl.startsWith('/')) openProject(project.liveUrl);
    else window.open(project.liveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article
      className={`${styles.card} ${project.spotlight ? styles.featuredCard : ''} ${project.placeholder ? styles.placeholderCard : ''}`}
      id={`project-${project.id}`}
      onClick={handleCardClick}
      style={{ cursor: project.liveUrl ? 'pointer' : 'default' }}
    >
      {project.spotlight && (
        <div className={styles.featuredRibbon}>
          <Sparkles size={12} />
          <span>Featured AI Project</span>
        </div>
      )}
      {project.badge && !project.spotlight && (
        <div className={`${styles.featuredRibbon} ${styles.liveRibbon}`}>
          <span className={styles.liveDot} aria-hidden="true" />
          <span>{project.badge}</span>
        </div>
      )}

      {/* Graphic preview */}
      <div className={styles.cardImage}>
        {project.spotlight ? (
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
              <img src="/images/teamsync/teamsync-logo.png" alt="TeamSync Workspace" className={styles.teamsyncLogoImg} />
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Zap size={11} /> Real-time</span>
                <span className={styles.teamsyncRolePill}>Role-based</span>
              </div>
            </div>
          </div>
        ) : project.id === 3 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <ClipboardCheck size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>OnboardBase</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><ShieldCheck size={11} /> RLS secured</span>
                <span className={styles.teamsyncRolePill}>Client portal</span>
              </div>
            </div>
          </div>
        ) : project.id === 4 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <Briefcase size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>BuhayVA Copilot</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Sparkles size={11} /> Gemini AI</span>
                <span className={styles.teamsyncRolePill}>Fit score + CRM</span>
              </div>
            </div>
          </div>
        ) : project.id === 5 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <Wallet size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>BALANSE</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Target size={11} /> Goals</span>
                <span className={styles.teamsyncRolePill}>Debt tracker</span>
              </div>
            </div>
          </div>
        ) : project.id === 6 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <Gamepad2 size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>KalakalGG</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><ShieldCheck size={11} /> KYC sellers</span>
                <span className={styles.teamsyncRolePill}>Middleman trades</span>
              </div>
            </div>
          </div>
        ) : project.id === 7 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <Send size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>Job Tracker</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Bookmark size={11} /> Bookmarks</span>
                <span className={styles.teamsyncRolePill}>Source insights</span>
              </div>
            </div>
          </div>
        ) : project.id === 8 ? (
          <div className={styles.teamsyncGraphic}>
            <div className={styles.teamsyncGlow} />
            <div className={styles.teamsyncGraphicInner}>
              <div className={styles.teamsyncIconWrap}>
                <MailCheck size={30} className={styles.teamsyncIcon} />
              </div>
              <span className={styles.teamsyncTitle}>ClarkFlow 360</span>
              <div className={styles.graphicBadgeRow}>
                <span className={styles.graphicAiPill}><Sparkles size={11} /> Gemini AI</span>
                <span className={styles.teamsyncRolePill}>Gmail triage</span>
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
          {docs[project.id] && (
            <button
              type="button"
              className={styles.docsBtn}
              onClick={(e) => { e.stopPropagation(); onDocs(project); }}
            >
              <BookOpen size={15} /> How it works
            </button>
          )}
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

const homeProjects = HOME_FEATURED_IDS.map(id => projects.find(p => p.id === id));

export default function Projects() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [docsProject, setDocsProject] = useState(null);
  const perView = usePerView();
  const maxIndex = Math.max(0, homeProjects.length - perView);
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
              {homeProjects.map(project => (
                <div key={project.id} className={styles.slide}>
                  <ProjectCard project={project} onDocs={setDocsProject} />
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

        {docsProject && <DocsModal project={docsProject} onClose={() => setDocsProject(null)} />}

        <div className={styles.moreRow}>
          <a
            href="/projects"
            className="btn-secondary"
            onClick={(e) => {
              e.preventDefault();
              openProject('/projects');
            }}
          >
            View all projects
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
