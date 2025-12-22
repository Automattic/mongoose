'use strict';
(function() {
  const STORAGE_KEY = 'mongoose-theme';
  const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const prefersDarkQuery = supportsMatchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const theme = localStorage.getItem(STORAGE_KEY) || (prefersDarkQuery?.matches ? 'dark' : 'light');
  applyTheme(theme, true);
  const toggleBtn = document.getElementById('theme-toggle-btn');
  toggleBtn.addEventListener('click', toggleTheme);

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      applyTheme('light');
    } else {
      applyTheme('dark');
    }
  }

  function applyTheme(theme, skipSetStorage) {
    document.documentElement.setAttribute('data-theme', theme);
    if (!skipSetStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        // Silently fail - theme will still work for current session
      }
    }
  }
})();
