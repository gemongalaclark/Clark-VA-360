import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Preloader from './components/Preloader';
import Cursor from './components/Cursor';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import './App.css';

/* Each project app is its own download, fetched only when it is opened,
   so portfolio visitors don't load all five. */
const PROJECT_APPS = {
  scheduler: lazy(() => import('./components/GOOGLE CALENDAR AUTO SCHEDULER/GoogleCalendarAutoScheduler')),
  teamsync: lazy(() => import('./components/TEAMSYNC WORKSPACE/TeamSyncWorkspace')),
  onboardbase: lazy(() => import('./components/ONBOARDBASE/OnboardBase')),
  copilot: lazy(() => import('./components/BUHAYVA COPILOT/BuhayvaCopilot')),
  balanse: lazy(() => import('./components/BALANSE/Balanse')),
  services: lazy(() => import('./components/ServicesPage')),
};

function checkRoute() {
  if (typeof window === 'undefined') return 'portfolio';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  /* Checked first: the copilot's #ingest= fragment carries job text that may contain other route words. */
  if (path.startsWith('/buhayva-copilot') || hash.startsWith('#buhayva-copilot')) return 'copilot';
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
  if (path.startsWith('/services')) return 'services';
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
    if (route !== 'portfolio') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else {
      const el = document.getElementById(prev === 'services' ? 'services' : 'projects');
      const top = el ? el.getBoundingClientRect().top + window.scrollY - 72 : 0;
      window.scrollTo({ top, left: 0, behavior: 'instant' });
    }
  }, [route]);

  const goToPortfolio = () => {
    window.history.pushState({}, '', '/');
    setRoute('portfolio');
  };

  const ProjectApp = PROJECT_APPS[route];
  if (ProjectApp) {
    return (
      <Suspense fallback={null}>
        <ProjectApp onBackToPortfolio={goToPortfolio} />
      </Suspense>
    );
  }

  return (
    <>
      <Preloader />
      <Cursor />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Services />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
