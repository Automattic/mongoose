'use strict';

/*!
 * ignore
 */

module.exports = function isPathSelectedInclusive(fields, path) {
  const chunks = path.split('.');
  let cur = '';
  for (let i = 0; i < chunks.length; ++i) {
    cur += cur.length ? '.' + chunks[i] : chunks[i];
    if (fields[cur]) {
      return true;
    }
  }

  return false;
};
