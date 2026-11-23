import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useTheme } from '../lib/theme';
import Cursor from './Cursor';
import { ProjectCard, DocsModal } from './Projects';
import { GROUPS, projects, rememberProjectsView } from './projectsData';
import pageStyles from './Services.module.css';
import cardStyles from './Projects.module.css';
import styles from './ProjectsPage.module.css';

const realProjects = projects.filter(p => !p.placeholder);
const countIn = (groupId) => realProjects.filter(p => p.group === groupId).length;

/* ?group=<id> picks a tab, so a filtered view can be shared; anything else means All */
function groupFromUrl() {
  const id = new URLSearchParams(window.location.search).get('group');
  return GROUPS.some(g => g.id === id) ? id : null;
}

export default function ProjectsPage({ onBackToPortfolio }) {
  useTheme(); // this page has no Navbar, which is what normally applies the saved theme
  const [group, setGroup] = useState(groupFromUrl);
  const [docsProject, setDocsProject] = useState(null);
  const tabsRef = useRef(null);

  /* On phones the tab row scrolls sideways: bring a tab opened from a shared link into view */
  useEffect(() => {
    const row = tabsRef.current;
    const active = row?.querySelector('[aria-pressed="true"]');
    if (row && active) row.scrollLeft = active.offsetLeft - row.offsetLeft - 16;
  }, []);

  const pick = (id) => {
    setGroup(id);
    window.history.replaceState({}, '', id ? `/projects?group=${id}` : '/projects');
    rememberProjectsView();
  };

  const tabs = [{ id: null, label: 'All', count: realProjects.length }, ...GROUPS.map(g => ({ ...g, count: countIn(g.id) }))];
  /* Coming Soon placeholders only make sense on All */
  const shown = group ? realProjects.filter(p => p.group === group) : projects;

  return (
    <>
      <Cursor />
      <header className={pageStyles.pageBar}>
        <div className={`container ${pageStyles.pageBarInner}`}>
          <button type="button" className={pageStyles.pageLogo} onClick={onBackToPortfolio} aria-label="Clark VA 360 Home">
            <img src="/images/logo.png" alt="Clark VA 360 Logo" />
          </button>
          <button type="button" className={pageStyles.backBtn} onClick={onBackToPortfolio}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to portfolio
          </button>
        </div>
      </header>

      <main className={`section ${cardStyles.projects} ${styles.page}`}>
        <div className="container">
          <h1 className="section-title">All <span>Projects</span></h1>
          <div className="section-divider" />
          <p className={cardStyles.sectionSubtitle}>
            Real tools I've designed and built, grouped by what they do. Click a card to try it live.
          </p>

          <div ref={tabsRef} className={styles.tabs} role="group" aria-label="Filter projects by category">
            {tabs.map(tab => (
              <button
                key={tab.label}
                type="button"
                className={`${styles.tab} ${group === tab.id ? styles.tabActive : ''}`}
                aria-pressed={group === tab.id}
                onClick={() => pick(tab.id)}
              >
                {tab.label}
                <span className={styles.tabCount}>{tab.count}</span>
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {shown.map(project => (
              <ProjectCard key={project.id} project={project} onDocs={setDocsProject} />
            ))}
          </div>

          {/* The tip points at the Auto Scheduler card, so only where that card is shown */}
          {(!group || group === 'productivity') && (
            <p className={cardStyles.hint}>
              <Sparkles size={14} /> Tip: open the Auto Scheduler to test drive the Gemini AI schedule scanner.
            </p>
          )}

          {docsProject && <DocsModal project={docsProject} onClose={() => setDocsProject(null)} />}
        </div>
      </main>
    </>
  );
}
