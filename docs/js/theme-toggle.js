(function() {
  'use strict';

  // Get saved theme preference or default to system preference
  function getInitialTheme() {
    const savedTheme = localStorage.getItem('mongoose-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Default to system preference
    return null;
  }

  // Apply theme to document
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('mongoose-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('mongoose-theme');
    }
    updateThemeIcon();
  }

  // Update theme icon visibility
  function updateThemeIcon() {
    // CSS handles the icon visibility, but we can ensure proper state
    const theme = document.documentElement.getAttribute('data-theme');
    const lightIcon = document.getElementById('theme-icon-light'); // Sun icon
    const darkIcon = document.getElementById('theme-icon-dark');   // Moon icon
    
    if (lightIcon && darkIcon) {
      // In dark mode: show sun icon (to switch to light)
      // In light mode: show moon icon (to switch to dark)
      // CSS handles the actual visibility via opacity
    }
  }

  // Toggle between light and dark
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      applyTheme('light');
    } else if (currentTheme === 'light') {
      applyTheme(null); // Reset to system preference
    } else {
      // Currently using system preference, switch to dark
      applyTheme('dark');
    }
  }

  // Initialize theme on page load
  function initTheme() {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    
    // Set up toggle button
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleTheme);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();

