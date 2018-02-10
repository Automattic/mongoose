'use strict';

const isDefiningProjection = require('./isDefiningProjection');

/*!
 * ignore
 */

module.exports = function isExclusive(projection) {
  let keys = Object.keys(projection);
  let ki = keys.length;
  let exclude = null;

  if (ki === 1 && keys[0] === '_id') {
    exclude = !!projection[keys[ki]];
  } else {
    while (ki--) {
      // Does this projection explicitly define inclusion/exclusion?
      // Explicitly avoid `$meta` and `$slice`
      if (keys[ki] !== '_id' && isDefiningProjection(projection[keys[ki]])) {
        exclude = !projection[keys[ki]];
        break;
      }
    }
  }

  return exclude;
};
