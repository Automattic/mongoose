(function() {
  'use strict';

  const STORAGE_KEY = 'mongoose-theme';
  const CODE_THEME_CLASS = 'code-theme-dark';
  const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const prefersDarkQuery = supportsMatchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

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
      } catch (e) {
        // Silently fail - theme will still work for current session
      }
    }
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle(CODE_THEME_CLASS, isDark);
    document.body.classList.toggle(CODE_THEME_CLASS, isDark);
  }

  const theme = localStorage.getItem(STORAGE_KEY) || (prefersDarkQuery?.matches ? 'dark' : 'light');
  applyTheme(theme, true);
  const toggleBtn = document.getElementById('theme-toggle-btn');
  toggleBtn.addEventListener('click', toggleTheme);
})();
