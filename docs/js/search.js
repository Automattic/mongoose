'use strict';

const root = 'https://mongoose-js.netlify.app/.netlify/functions';

const defaultVersion = '9.x';
const versionFromUrl = window.location.pathname.match(/^\/docs\/(\d+\.x)/);
const version = versionFromUrl ? versionFromUrl[1] : defaultVersion;

search();

document.getElementById('search-form').onsubmit = function(ev) {
  ev.preventDefault();
  addHistory(document.getElementById('search-input').value);
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
  const q = value.trim();

  if (q.length === 0) {
    url.searchParams.delete('q');
  } else {
    // use this to only modify the param "q" and not overwrite any other existing params
    url.searchParams.set('q', q);
  }

  window.history.pushState({}, '', url);
  search();
}

/** (re)load results */
function search() {
  const resultsDiv = document.getElementById('results');

  setStatus(resultsDiv, 'Loading...');

  const url = new URL(window.location.href);

  if (!url.searchParams || !url.searchParams.has('q') || url.searchParams.get('q').trim().length === 0) {
    document.getElementById('search-input').value = '';
    setStatus(resultsDiv, 'Enter a search term to find docs.');
    return;
  }

  const qSearch = url.searchParams.get('q').trim();

  document.getElementById('search-input').value = qSearch;
  document.getElementById('search-input-nav').value = ''; // set navbar search empty, to encourage big input usage

  const controller = new AbortController();
  const timeout = setTimeout(function() {
    controller.abort();
  }, 10000);

  fetch(root + '/search?search=' + encodeURIComponent(qSearch) + '&version=' + version, { signal: controller.signal }).
    then(function(res) { return res.json(); }).
    then(
      function(result) {
        clearTimeout(timeout);
        const searchResults = Array.isArray(result.results) ? result.results : [];
        if (searchResults.length === 0) {
          setStatus(resultsDiv, 'No results found.');
          return;
        }

        const list = document.createElement('ul');
        list.className = 'search-results-list';

        for (let i = 0; i < searchResults.length; ++i) {
          const res = searchResults[i];
          const url = res.url;

          const item = document.createElement('li');
          item.className = 'search-result';

          const title = document.createElement('a');
          title.className = 'search-result-title';
          title.href = url;
          title.innerHTML = res.title || '';
          item.appendChild(title);

          const resultUrl = document.createElement('a');
          resultUrl.className = 'search-result-url';
          resultUrl.href = url;
          resultUrl.textContent = url;
          item.appendChild(resultUrl);

          const body = document.createElement('div');
          body.className = 'search-result-body';
          body.innerHTML = res.body || '';
          item.appendChild(body);

          list.appendChild(item);
        }

        resultsDiv.replaceChildren(list);
      },
      function(error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
          setStatus(resultsDiv, 'Search timed out. Please try again.', true);
          return;
        }
        setStatus(resultsDiv, 'An error occurred: ' + error.message, true);
      }
    );
}

function setStatus(resultsDiv, message, isError) {
  const status = document.createElement('p');
  status.className = isError ? 'search-results-status search-results-error' : 'search-results-status';
  status.textContent = message;
  resultsDiv.replaceChildren(status);
}
