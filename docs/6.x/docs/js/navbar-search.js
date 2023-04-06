'use strict';
(function() {
  const versionFromUrl = window.location.pathname.match(/^\/docs\/(\d+\.x)/);
  const version = versionFromUrl ? versionFromUrl[1] : null;

  const searchPrefix = versionFromUrl ? '/docs/' + version + '/docs/' : '/docs/';

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
