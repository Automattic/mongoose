'use strict';
// this js is for mobile, to toggle the navbar

(function(window, document) {
  const layout = document.getElementById('layout'),
      menu = document.getElementById('menu'),
      menuLink = document.getElementById('menuLink'),
      toc = document.getElementById('toc-sidebar'),
      tocLink = document.getElementById('tocLink'),
      content = document.getElementById('content');

  const active = 'active';

  function closeMenu() {
    layout.classList.remove(active);
    menu.classList.remove(active);
    menuLink.classList.remove(active);
  }

  function closeToc() {
    if (toc == null || tocLink == null) {
      return;
    }
    toc.classList.remove(active);
    tocLink.classList.remove(active);
    tocLink.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu(e) {
    e.preventDefault();
    closeToc();
    layout.classList.toggle(active);
    menu.classList.toggle(active);
    menuLink.classList.toggle(active);
  }

  menuLink.onclick = function(e) {
    toggleMenu(e);
  };

  if (tocLink != null && toc != null) {
    tocLink.setAttribute('aria-expanded', 'false');

    tocLink.onclick = function(e) {
      e.preventDefault();
      closeMenu();
      const isActive = toc.classList.toggle(active);
      tocLink.classList.toggle(active, isActive);
      tocLink.setAttribute('aria-expanded', String(isActive));
    };

    toc.addEventListener('click', function(e) {
      if (e.target.closest('.toc-link') != null) {
        closeToc();
      }
    });
  }

  content.onclick = function() {
    if (menu.classList.contains(active)) {
      closeMenu();
    }
    closeToc();
  };

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeMenu();
      closeToc();
    }
  });

}(this, this.document));
