'use strict';

const root = 'https://mongoosejs.azurewebsites.net/api';

const defaultVersion = '7.x';
const versionFromUrl = window.location.pathname.match(/^\/docs\/(\d+\.x)/);
const version = versionFromUrl ? versionFromUrl[1] : defaultVersion;

search();

document.getElementById('search-button').onclick = function() {
  addHistory(document.getElementById('search-input').value);
};

document.getElementById('search-input').onkeyup = function(ev) {
  if (ev.keyCode === 13) {
    addHistory(document.getElementById('search-input').value);
  }
};

document.getElementById('search-button-nav').onclick = function() {
  addHistory(document.getElementById('search-input-nav').value);
};

document.getElementById('search-input-nav').onkeyup = function(ev) {
  if (ev.keyCode === 13) {
    addHistory(document.getElementById('search-input-nav').value);
  }
};

/** Helper to consistently add history and reload results */
function addHistory(value) {
  const url = new URL(window.location.href);

  // use this to only modify the param "q" and not overwrite any other existing params
  url.searchParams.set('q', value);

  window.history.pushState({}, '', url);
  search();
}

/** (re)load results */
function search() {
  const resultsDiv = document.getElementById('results');

  resultsDiv.innerHTML = '<p>Loading...</p';

  const url = new URL(window.location.href);

  if (!url.searchParams || !url.searchParams.has('q')) {
    resultsDiv.innerHTML = '<p>No Search Parameters</p>';
    return;
  }

  const qSearch = url.searchParams.get('q');

  document.getElementById('search-input').value = qSearch;
  document.getElementById('search-input-nav').value = ''; // set navbar search empty, to encourage big input usage

  fetch(root + '/search?search=' + encodeURIComponent(qSearch) + '&version=' + version).
    then(function(res) { return res.json(); }).
    then(
      function(result) {
        if (result.results.length === 0) {
          resultsDiv.innerHTML = '<h1>No Results</h1>';
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

        resultsDiv.innerHTML = '<ul>' + html + '</ul>';
      },
      function(error) {
        resultsDiv.innerHTML =
          '<h3>An error occurred: ' + error.message + '</h3>';
      }
    );
}
