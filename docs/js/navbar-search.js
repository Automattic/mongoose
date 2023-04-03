'use strict';
(function() {
  const versionFromUrl = window.location.pathname.match(/^\/docs\/(\d+\.x)/);
  const version = versionFromUrl ? versionFromUrl[1] : null;

  const searchPrefix = versionFromUrl ? '/docs/' + version + '/docs/' : '/docs/';

  // dont use nav-bar search for search site, let the search site handle that
  if (/\/search(:?\.html)?$/i.test(window.location.pathname)) {
    return;
  }

  document.getElementById('search-button-nav').onclick = function() {
    const q = document.getElementById('search-input-nav').value;
    window.location.href = searchPrefix + 'search.html?q=' + encodeURIComponent(q);
  };

  document.getElementById('search-input-nav').onkeyup = function(ev) {
    if (ev.keyCode === 13) {
      const q = document.getElementById('search-input-nav').value;
      window.location.href = searchPrefix + 'search.html?q=' + encodeURIComponent(q);
    }
  };
})();
