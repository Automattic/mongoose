'use strict';

(function() {
  const STORAGE_PREFIX = 'mongoose-sidebar-collapsed:';

  document.querySelectorAll('.sidebar-section-collapsible').forEach(function(section) {
    const toggle = section.querySelector('.sidebar-section-toggle');
    if (!toggle) return;

    const storageKey = STORAGE_PREFIX + section.id;

    function setCollapsed(collapsed) {
      section.classList.toggle('collapsed', collapsed);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      try {
        localStorage.setItem(storageKey, collapsed ? '1' : '0');
      } catch (e) { /* localStorage unavailable */ }
    }

    try {
      if (localStorage.getItem(storageKey) === '1') {
        setCollapsed(true);
      }
    } catch (e) { /* localStorage unavailable */ }

    toggle.addEventListener('click', function() {
      setCollapsed(!section.classList.contains('collapsed'));
    });

    toggle.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setCollapsed(!section.classList.contains('collapsed'));
      }
    });
  });
})();
