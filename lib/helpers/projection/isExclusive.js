'use strict';

const isDefiningProjection = require('./isDefiningProjection');

/*!
 * ignore
 */

module.exports = function isExclusive(projection) {
  if (projection == null) {
    return null;
  }

  const keys = Object.keys(projection);
  let ki = keys.length;
  let exclude = null;

  if (ki === 1 && keys[0] === '_id') {
    exclude = !projection._id;
  } else {
    while (ki--) {
      // Does this projection explicitly define inclusion/exclusion?
      // Explicitly avoid `$meta` and `$slice`
      const key = keys[ki];
      if (key !== '_id' && isDefiningProjection(projection[key])) {
        exclude = (projection[key] != null && typeof projection[key] === 'object') ?
          isExclusive(projection[key]) :
          !projection[key];
        break;
      }
    }
  }

  return exclude;
};
