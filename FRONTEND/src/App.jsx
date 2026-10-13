import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Contact from './components/Contact';
import Footer from './components/Footer';
import GoogleCalendarAutoScheduler from './components/GOOGLE CALENDAR AUTO SCHEDULER/GoogleCalendarAutoScheduler';
import './App.css';

function checkIsSchedulerRoute() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path.startsWith('/auto-scheduler') ||
    path.startsWith('/google-calendar-auto-scheduler') ||
    hash.includes('auto-scheduler') ||
    hash.includes('scheduler')
  );
}

export default function App() {
  const [isScheduler, setIsScheduler] = useState(checkIsSchedulerRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsScheduler(checkIsSchedulerRoute());
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  if (isScheduler) {
    return (
      <GoogleCalendarAutoScheduler
        onBackToPortfolio={() => {
          window.history.pushState({}, '', '/');
          setIsScheduler(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
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
