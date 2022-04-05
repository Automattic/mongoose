'use strict';

/**
 * Returns `true` if the given index options have a `text` option.
 */

module.exports = function isTextIndex(indexOptions) {
  let isTextIndex = false;
  for (const key of Object.keys(indexOptions)) {
    if (indexOptions[key] === 'text') {
      isTextIndex = true;
    }
  }

  return isTextIndex;
};