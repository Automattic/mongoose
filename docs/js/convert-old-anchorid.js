'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const anchor = window.location.hash;

  // only operate on the old id's
  if (!/^#\w+_\w+(?:-\w+)?$/i.test(anchor)) {
    return fixNoAsyncFn();
  }

  // in case there is no anchor, return without modifying the anchor
  if (!anchor) {
    return;
  }

  const splits = anchor.split('_');

  // dont modify anything if the splits are not "2"
  if (splits.length !== 2) {
    return;
  }

  const secondSplits = splits[1].split('-');

  let mainName;
  let propName = '';

  // there are 2 possibilities:
  // "mongoose_Mongoose-property"
  // "mongoose_property"
  if (secondSplits.length === 2) {
    mainName = secondSplits[0];
    propName = secondSplits[1];
  } else {
    // use the part after the "_" directly, because the before is just a lower-cased version
    mainName = splits[1];
    propName = '';
  }

  // check to ensure those properties are not empty
  if (!mainName) {
    return;
  }

  let tests = [];

  // have to use multiple tests, because the old version did not differentiate between functions and properties
  if (mainName && propName) {
    // have to double the tests here, because the old version did not differentiate between static and instance properties
    tests = [
      `${mainName}.${propName}`,
      `${mainName}.${propName}()`,

      `${mainName}.prototype.${propName}`,
      `${mainName}.prototype.${propName}()`
    ];
  } else {
    tests = [
      mainName,
      `${mainName}()`
    ];
  }

  for (const test of tests) {
    // have to use the "[id=]" selector because "#Something()" is not a valid selector (the "()" part)
    const header = document.querySelector(`h3[id="${test}"]`);
    if (header) {
      window.location.hash = `#${test}`;
    }
  }

  // function to fix dox not recognizing async functions and resulting in inproper anchors
  function fixNoAsyncFn() {
    const anchorSlice = anchor.slice(1);
    // dont modify anchor if it already exists
    if (document.querySelector(`h3[id="${anchorSlice}"`)) {
      return;
    }

    const tests = [
      `${anchorSlice}()`
    ];

    for (const test of tests) {
      // have to use the "[id=]" selector because "#Something()" is not a valid selector (the "()" part)
      const header = document.querySelector(`h3[id="${test}"]`);
      if (header) {
        window.location.hash = `#${test}`;
      }
    }
  }
}, { once: true });
