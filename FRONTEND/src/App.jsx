import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Preloader from './components/Preloader';
import Cursor from './components/Cursor';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Contact from './components/Contact';
import Footer from './components/Footer';
import GoogleCalendarAutoScheduler from './components/GOOGLE CALENDAR AUTO SCHEDULER/GoogleCalendarAutoScheduler';
import TeamSyncWorkspace from './components/TEAMSYNC WORKSPACE/TeamSyncWorkspace';
import OnboardBase from './components/ONBOARDBASE/OnboardBase';
import './App.css';

function checkRoute() {
  if (typeof window === 'undefined') return 'portfolio';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
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
     the Projects section the visitor left from. */
  const prevRoute = useRef(route);
  useLayoutEffect(() => {
    const prev = prevRoute.current;
    prevRoute.current = route;
    if (prev === route) return;
    if (route !== 'portfolio') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else {
      const el = document.getElementById('projects');
      const top = el ? el.getBoundingClientRect().top + window.scrollY - 72 : 0;
      window.scrollTo({ top, left: 0, behavior: 'instant' });
    }
  }, [route]);

  const goToPortfolio = () => {
    window.history.pushState({}, '', '/');
    setRoute('portfolio');
  };

  if (route === 'scheduler') {
    return (
      <GoogleCalendarAutoScheduler onBackToPortfolio={goToPortfolio} />
    );
  }

  if (route === 'teamsync') {
    return (
      <TeamSyncWorkspace onBackToPortfolio={goToPortfolio} />
    );
  }

  if (route === 'onboardbase') {
    return (
      <OnboardBase onBackToPortfolio={goToPortfolio} />
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
        <Contact />
      </main>
      <Footer />
    </>
  );
}
