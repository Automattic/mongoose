document.getElementById('search-button-nav').onclick = function() {
  var q = document.getElementById('search-input-nav').value;
  window.location.href = '/docs/search.html?q=' + encodeURIComponent(q);
};

var q = document.getElementById('search-input-nav').onkeyup = function(ev) {
  if (ev.keyCode === 13) {
    var q = document.getElementById('search-input-nav').value;
    window.location.href = '/docs/search.html?q=' + encodeURIComponent(q);
  }
};
