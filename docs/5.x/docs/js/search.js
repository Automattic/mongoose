var root = 'https://mongoosejs.azurewebsites.net/api';
var pairs = window.location.search.replace(/^\?/, '').split('&');

var q = null;
for (var i = 0; i < pairs.length; ++i) {
  var _pair = pairs[i].split('=');
  if (_pair[0] === 'q') {
    q = _pair[1];
  }
}

var defaultVersion = '6.x';
var versionFromUrl = window.location.pathname.match(/^\/docs\/(\d+\.x)/);
var version = versionFromUrl ? versionFromUrl[1] : defaultVersion;

if (q != null) {
  document.getElementById('search-input').value = decodeURIComponent(q);
  fetch(root + '/search?search=' + q + '&version=' + version).
    then(function(res) { return res.json(); }).
    then(
      function(result) {
        if (result.results.length === 0) {
          document.getElementById('results').innerHTML = '<h1>No Results</h1>';
          return;
        }
        var html = '';
        for (var i = 0; i < result.results.length; ++i) {
          var res = result.results[i];
          var url = res.url;
          html += '<li>' +
            '<a class="title" href="' + url + '">' +
            res.title +
            '</a>' +
            '<div class="url"><a href="' + url + '">' + url + '</a></div>' +
            '<p>' + res.body + '</p>' +
            '</li>';
        }

        document.getElementById('results').innerHTML = '<ul>' + html + '</ul>';
      },
      function(error) {
        document.getElementById('results').innerHTML =
          '<h3>An error occurred: ' + error.message + '</h3>';
      }
    );
}

document.getElementById('search-button').onclick = function() {
  var q = document.getElementById('search-input').value;
  window.location.href = 'search.html?q=' + encodeURIComponent(q);
};

var q = document.getElementById('search-input').onkeyup = function(ev) {
  if (ev.keyCode === 13) {
    var q = document.getElementById('search-input').value;
    window.location.href = 'search.html?q=' + encodeURIComponent(q);
  }
};