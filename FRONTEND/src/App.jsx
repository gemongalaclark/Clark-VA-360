import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Contact from './components/Contact';
import Footer from './components/Footer';
import GoogleCalendarAutoScheduler from './components/GOOGLE CALENDAR AUTO SCHEDULER/GoogleCalendarAutoScheduler';
import TeamSyncWorkspace from './components/TEAMSYNC WORKSPACE/TeamSyncWorkspace';
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

  const goToPortfolio = () => {
    window.history.pushState({}, '', '/');
    setRoute('portfolio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <>
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
