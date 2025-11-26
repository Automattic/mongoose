(function() {
  'use strict';

  const STORAGE_KEY = 'mongoose-theme';
  const CODE_THEME_CLASS = 'code-theme-dark';
  const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const prefersDarkQuery = supportsMatchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getInitialTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return null; // Follow system preference
  }

  function getEffectiveTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      return theme;
    }
    return prefersDarkQuery && prefersDarkQuery.matches ? 'dark' : 'light';
  }

  function syncCodeTheme(theme) {
    const effectiveTheme = getEffectiveTheme(theme);
    const isDark = effectiveTheme === 'dark';
    document.documentElement.classList.toggle(CODE_THEME_CLASS, isDark);
    if (document.body) {
      document.body.classList.toggle(CODE_THEME_CLASS, isDark);
    }
  }

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(STORAGE_KEY, theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem(STORAGE_KEY);
    }
    syncCodeTheme(theme);
    updateThemeIcon();
  }

  function updateThemeIcon() {
    // CSS handles the icon visibility. This function exists for future enhancements.
    void document.documentElement.getAttribute('data-theme');
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      applyTheme('light');
    } else if (currentTheme === 'light') {
      applyTheme(null); // Reset to system preference
    } else {
      applyTheme('dark');
    }
  }

  function handleSystemThemeChange() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      syncCodeTheme(null);
    }
  }

  function initTheme() {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleTheme);
    }

    if (prefersDarkQuery) {
      if (typeof prefersDarkQuery.addEventListener === 'function') {
        prefersDarkQuery.addEventListener('change', handleSystemThemeChange);
      } else if (typeof prefersDarkQuery.addListener === 'function') {
        prefersDarkQuery.addListener(handleSystemThemeChange);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();

