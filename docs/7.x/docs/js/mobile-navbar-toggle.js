'use strict';
// this js is for mobile, to toggle the navbar

(function(window, document) {
  const layout = document.getElementById('layout'),
      menu = document.getElementById('menu'),
      menuLink = document.getElementById('menuLink'),
      content = document.getElementById('content');

  function toggleClass(element, className) {
    const classes = element.className.split(/\s+/),
        length = classes.length;

    for (let i = 0; i < length; i++) {
      if (classes[i] === className) {
        classes.splice(i, 1);
        break;
      }
    }
    // The className is not found
    if (length === classes.length) {
      classes.push(className);
    }

    element.className = classes.join(' ');
  }

  function toggleAll(e) {
    const active = 'active';

    e.preventDefault();
    toggleClass(layout, active);
    toggleClass(menu, active);
    toggleClass(menuLink, active);
  }

  menuLink.onclick = function(e) {
    toggleAll(e);
  };

  content.onclick = function(e) {
    if (menu.className.indexOf('active') !== -1) {
      toggleAll(e);
    }
  };

}(this, this.document));
