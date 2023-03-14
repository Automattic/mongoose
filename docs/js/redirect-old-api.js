'use strict';
window.addEventListener('DOMContentLoaded', () => {
  const anchor = window.location.hash;

  // in case there is not anchor
  if (!anchor) {
    return redirectToBase();
  }

  const firstName = anchor.split('_')[0];

  // in case there is no split
  if (!firstName) {
    return redirectToBase();
  }

  const sliced = firstName.slice(1).toLowerCase(); // ignore first character, which will always be "#"

  // in case everything after "#" is empty
  if (!sliced) {
    return redirectToBase();
  }

  window.location.replace('./api/' + sliced + '.html' + anchor);
}, { once: true });

// helper function to redirect in case no other redirect can be found
function redirectToBase() {
  window.location.replace('./api/mongoose.html');
}
