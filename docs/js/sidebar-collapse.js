'use strict';

(function() {
  document.querySelectorAll('.sidebar-section-collapsible').forEach(function(section) {
    const toggle = section.querySelector('.sidebar-section-toggle');
    if (!toggle) return;

    function setCollapsed(collapsed) {
      section.classList.toggle('collapsed', collapsed);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

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
