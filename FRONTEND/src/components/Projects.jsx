import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Github } from 'lucide-react';
import styles from './Projects.module.css';

/* Projects data – blank placeholders for now */
const projects = [
  {
    id: 1,
    title: 'Coming Soon',
    description: 'My first VA project will be showcased here. Stay tuned!',
    tags: [],
    image: null,
    liveUrl: null,
    githubUrl: null,
    placeholder: true,
  },
  {
    id: 2,
    title: 'Coming Soon',
    description: 'More exciting projects are on the way. Check back later!',
    tags: [],
    image: null,
    liveUrl: null,
    githubUrl: null,
    placeholder: true,
  },
  {
    id: 3,
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
    title: 'Coming Soon',
    description: 'Building out my portfolio one project at a time.',
    tags: [],
    image: null,
    liveUrl: null,
    githubUrl: null,
    placeholder: true,
  },
];

function ProjectCard({ project }) {
  return (
    <div className={styles.card} id={`project-${project.id}`}>
      {/* Image / placeholder */}
      <div className={styles.cardImage}>
        {project.image ? (
          <img src={project.image} alt={project.title} />
        ) : (
          <div className={styles.placeholderImg}>
            <span className={styles.placeholderIcon}>🚀</span>
            <span className={styles.placeholderText}>Project Preview<br />Coming Soon</span>
          </div>
        )}
        {!project.placeholder && (
          <div className={styles.cardOverlay}>
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className={styles.overlayBtn}>
                <ExternalLink size={16} /> Live Demo
              </a>
            )}
            {project.githubUrl && (
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className={styles.overlayBtnOutline}>
                <Github size={16} /> Code
              </a>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{project.title}</h3>
        <p className={styles.cardDesc}>{project.description}</p>
        {project.tags.length > 0 && (
          <div className={styles.tagRow}>
            {project.tags.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Projects() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef(null);
  const touchStart = useRef(null);

  const visibleCount = 3; // cards visible at once on desktop
  const maxIndex = projects.length - 1;

  const goTo = (index) => {
    const clamped = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(clamped);
  };

  const prev = () => goTo(currentIndex - 1);
  const next = () => goTo(currentIndex + 1);

  /* Touch/swipe support */
  const onTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
    touchStart.current = null;
  };

  return (
    <section id="projects" className={`section ${styles.projects}`}>
      <div className="container">
        <h2 className="section-title">My <span>Projects</span></h2>
        <div className="section-divider" />

        <div className={styles.carouselWrapper}>
          {/* Prev button */}
          <button
            id="carousel-prev"
            className={`${styles.navBtn} ${currentIndex === 0 ? styles.disabled : ''}`}
            onClick={prev}
            aria-label="Previous project"
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={22} />
          </button>

          {/* Track */}
          <div
            className={styles.trackOuter}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              ref={trackRef}
              className={styles.track}
              style={{ transform: `translateX(calc(-${currentIndex * (100 / visibleCount)}% - ${currentIndex * (24 / visibleCount)}px))` }}
            >
              {projects.map(project => (
                <div key={project.id} className={styles.slide}>
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          </div>

          {/* Next button */}
          <button
            id="carousel-next"
            className={`${styles.navBtn} ${currentIndex >= maxIndex ? styles.disabled : ''}`}
            onClick={next}
            aria-label="Next project"
            disabled={currentIndex >= maxIndex}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Dots */}
        <div className={styles.dots}>
          {projects.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to project ${i + 1}`}
            />
          ))}
        </div>

        {/* Coming soon note */}
        <p className={styles.comingSoonNote}>
          🚀 Projects will be added as I complete them during my VA training. Stay tuned!
        </p>
      </div>
    </section>
  );
}
