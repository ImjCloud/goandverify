'use client';

import {useEffect, useState} from 'react';
import {Sun, Moon} from 'lucide-react';

export function ThemeToggle() {
  // Mirrors whatever the blocking script in layout.tsx already set on <html>,
  // so there's no flash/mismatch on mount.
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.dataset.theme === 'light');
  }, []);

  function toggle() {
    const next = isLight ? 'dark' : 'light';
    setIsLight(!isLight);
    if (next === 'light') {
      document.documentElement.dataset.theme = 'light';
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      window.localStorage.setItem('theme', next);
    } catch {
      // Storage can be unavailable (private browsing, disabled cookies) — the
      // toggle still works for this visit, it just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={isLight}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <Moon className="icon-moon" size={16} />
      <Sun className="icon-sun" size={16} />
    </button>
  );
}
