'use strict';
const root = 'https://mongoosejs.azurewebsites.net/api';
const pairs = window.location.search.replace(/^\?/, '').split('&');

let q = null;
for (let i = 0; i < pairs.length; ++i) {
  const _pair = pairs[i].split('=');
  if (_pair[0] === 'q') {
    q = _pair[1];
  }
}

const defaultVersion = '6.x';
const versionFromUrl = window.location.pathname.match(/^\/docs\/(\d+\.x)/);
const version = versionFromUrl ? versionFromUrl[1] : defaultVersion;

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
        let html = '';
        for (let i = 0; i < result.results.length; ++i) {
          const res = result.results[i];
          const url = res.url;
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
  const q = document.getElementById('search-input').value;
  window.location.href = 'search.html?q=' + encodeURIComponent(q);
};

q = document.getElementById('search-input').onkeyup = function(ev) {
  if (ev.keyCode === 13) {
    const q = document.getElementById('search-input').value;
    window.location.href = 'search.html?q=' + encodeURIComponent(q);
  }
};
