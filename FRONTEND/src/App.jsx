import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VerseOfDay from './components/VerseOfDay';
import Preloader from './components/Preloader';
import Cursor from './components/Cursor';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { projectsReturnUrl, projectsReturnScroll } from './components/projectsData';
import './App.css';

/* Each project app is its own download, fetched only when it is opened,
   so portfolio visitors don't load all five. */
const PROJECT_APPS = {
  scheduler: lazy(() => import('./components/GOOGLE CALENDAR AUTO SCHEDULER/GoogleCalendarAutoScheduler')),
  teamsync: lazy(() => import('./components/TEAMSYNC WORKSPACE/TeamSyncWorkspace')),
  onboardbase: lazy(() => import('./components/ONBOARDBASE/OnboardBase')),
  copilot: lazy(() => import('./components/BUHAYVA COPILOT/BuhayvaCopilot')),
  balanse: lazy(() => import('./components/BALANSE/Balanse')),
  jobtracker: lazy(() => import('./components/Clark VA 360 Job Tracker/JobTracker')),
  clarkflow: lazy(() => import('./components/CLARKFLOW 360/ClarkFlow360')),
  carmark: lazy(() => import('./components/CARMARK 360/CarMark360')),
  services: lazy(() => import('./components/ServicesPage')),
  projects: lazy(() => import('./components/ProjectsPage')),
};

/* The portfolio pages share one chat bot; project apps have their own layouts. */
const ChatBot = lazy(() => import('./components/ChatBot'));
/* Portfolio pages that are not project apps */
const LISTING_ROUTES = ['services', 'projects'];
const CHAT_ROUTES = ['portfolio', 'services', 'projects'];

function checkRoute() {
  if (typeof window === 'undefined') return 'portfolio';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  /* Checked first: the copilot's #ingest= fragment carries job text that may contain other route words. */
  if (path.startsWith('/buhayva-copilot') || hash.startsWith('#buhayva-copilot')) return 'copilot';
  /* Path only, checked before the hash rules: a sign-in link returns with a token in the hash. */
  if (path.startsWith('/clarkflow')) return 'clarkflow';
  if (
    path.startsWith('/auto-scheduler') ||
    path.startsWith('/google-calendar-auto-scheduler') ||
    hash.includes('auto-scheduler') ||
    hash.includes('scheduler')
  ) return 'scheduler';
  if (
    path.startsWith('/teamsync-workspace') ||
    path.startsWith('/teamsync') ||
    hash.includes('teamsync')
  ) return 'teamsync';
  if (path.startsWith('/onboardbase') || hash.includes('onboardbase')) return 'onboardbase';
  if (path.startsWith('/balanse') || hash.includes('balanse')) return 'balanse';
  if (path.startsWith('/job-tracker') || hash.includes('job-tracker')) return 'jobtracker';
  if (path.startsWith('/carmark')) return 'carmark';
  if (path.startsWith('/services')) return 'services';
  if (path.startsWith('/projects')) return 'projects';
  return 'portfolio';
}

export default function App() {
  const [route, setRoute] = useState(checkRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(checkRoute());
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  /* Navigation is client-side (pushState), so the browser keeps the old scroll offset.
     Opening a project must start at the top of that page; coming back should land on
     the section the visitor left from (Projects, or Services for the services page). */
  const prevRoute = useRef(route);
  useLayoutEffect(() => {
    const prev = prevRoute.current;
    prevRoute.current = route;
    if (prev === route) return;
    if (route === 'projects' && !LISTING_ROUTES.includes(prev) && prev !== 'portfolio') {
      /* Back from an app opened on /projects: land on the card the visitor left from */
      window.scrollTo({ top: projectsReturnScroll(), left: 0, behavior: 'instant' });
    } else if (route !== 'portfolio') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else {
      const el = document.getElementById(prev === 'services' ? 'services' : 'projects');
      const top = el ? el.getBoundingClientRect().top + window.scrollY - 72 : 0;
      window.scrollTo({ top, left: 0, behavior: 'instant' });
    }
  }, [route]);

  const goToPortfolio = () => {
    /* A project opened from /projects returns there (same tab), not to the homepage */
    const fromList = !LISTING_ROUTES.includes(route) && projectsReturnUrl();
    window.history.pushState({}, '', fromList || '/');
    setRoute(fromList ? 'projects' : 'portfolio');
  };

  const ProjectApp = PROJECT_APPS[route];

  return (
    <>
      {ProjectApp ? (
        <Suspense fallback={null}>
          <ProjectApp onBackToPortfolio={goToPortfolio} />
        </Suspense>
      ) : (
        <>
          <Preloader />
          <Cursor />
          <Navbar />
          <main>
            <Hero />
            <VerseOfDay />
            <About />
            <Skills />
            <Projects />
            <Services />
            <Contact />
          </main>
          <Footer />
        </>
      )}
      {/* Rendered here so a conversation survives moving between the homepage and /services */}
      {CHAT_ROUTES.includes(route) && (
        <Suspense fallback={null}>
          <ChatBot />
        </Suspense>
      )}
    </>
  );
}
