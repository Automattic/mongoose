'use strict';

/*!
 * ignore
 */

module.exports = function(obj) {
  const keys = Object.keys(obj);
  const len = keys.length;
  for (let i = 0; i < len; ++i) {
    if (keys[i].startsWith('$')) {
      return true;
    }
  }
  return false;
};
