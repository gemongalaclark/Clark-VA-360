import { useEffect, useState } from 'react';

/* Portfolio colour theme: 'light' | 'dark' | 'auto' (follows the OS, default).
   The resolved theme is written to <html data-theme> only while the portfolio is
   mounted, so the project apps (TeamSync, OnboardBase, …) keep their own styling. */

const STORAGE_KEY = 'clarkva-theme';
const CHOICES = ['light', 'dark', 'auto'];

function readChoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return CHOICES.includes(saved) ? saved : 'auto';
  } catch {
    return 'auto'; // storage blocked (private mode, strict privacy settings)
  }
}

export function useTheme() {
  const [choice, setChoice] = useState(readChoice);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = choice === 'auto' ? (mq.matches ? 'dark' : 'light') : choice;
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [choice]);

  /* Leaving the portfolio (opening a project app) clears the theme */
  useEffect(() => () => {
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
  }, []);

  const changeChoice = (next) => {
    setChoice(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* not persisted */ }
  };

  return [choice, changeChoice];
}
