'use strict';
// this script changes the nav-bar entry that is current visible on the screen as a header (most to the top) to be bold

let headers = undefined;
let curNavEntry = undefined;
let curElem = undefined;
window.addEventListener('scroll', function() {
  // set these values if undefined, because otherwise in global scope they will not be defined because the window did not finish loading
  if (headers === undefined) {
    headers = document.querySelectorAll('.api-content > h3');
  }
  if (curNavEntry === undefined) {
    const entries = document.querySelectorAll('.api-nav-content .nav-item .nav-item-sub');
    for (const entry of entries) {
      if (window.getComputedStyle(entry).visibility !== 'hidden') {
        curNavEntry = entry.parentElement;
        break;
      }
    }
  }

  const scrollY = window.scrollY;
  let highlight = headers[0];
  for (const header of headers) {
    if (header.offsetTop > scrollY) {
      break;
    }
    highlight = header;
  }
  if (curElem == undefined || highlight.id !== curElem.id) {
    // reset old element before re-assign
    if (curElem !== undefined) {
      document.querySelector('#' + curNavEntry.id + ' a[href="#' + curElem.id + '"]').style.fontWeight = 'inherit';
    }

    curElem = highlight;

    // add bold and visible to current ones
    document.querySelector('#' + curNavEntry.id + ' a[href="#' + curElem.id + '"]').style.fontWeight = 'bold';
  }
});
