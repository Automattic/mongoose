'use strict';

(function() {
  function scrollActiveSidebarLinkIntoView() {
    const sidebar = document.querySelector('.left-sidebar');
    const activeLink = sidebar == null ? null : sidebar.querySelector('.sidebar-link.active');

    if (sidebar == null || activeLink == null) {
      return;
    }

    const sidebarRect = sidebar.getBoundingClientRect();
    const activeLinkRect = activeLink.getBoundingClientRect();

    if (activeLinkRect.top < sidebarRect.top) {
      sidebar.scrollTop -= sidebarRect.top - activeLinkRect.top;
    } else if (activeLinkRect.bottom > sidebarRect.bottom) {
      sidebar.scrollTop += activeLinkRect.bottom - sidebarRect.bottom + 100;
    }
  }

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

  scrollActiveSidebarLinkIntoView();
})();
