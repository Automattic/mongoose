var defaultVersion = '6.x';

(function() {
  var versionFromUrl = window.location.pathname.match(/^\/docs\/(\d+\.x)/);
  var version = versionFromUrl ? versionFromUrl[1] : defaultVersion;

  var searchPrefix = versionFromUrl ? '/docs/' + version + '/docs/' : '/docs/';

  document.getElementById('search-button-nav').onclick = function() {
    var q = document.getElementById('search-input-nav').value;
    window.location.href = searchPrefix + 'search.html?q=' + encodeURIComponent(q);
  };

  document.getElementById('search-input-nav').onkeyup = function(ev) {
    if (ev.keyCode === 13) {
      var q = document.getElementById('search-input-nav').value;
      window.location.href = searchPrefix + 'search.html?q=' + encodeURIComponent(q);
    }
  };
})();
