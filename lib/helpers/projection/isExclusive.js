'use strict';

const isDefiningProjection = require('./isDefiningProjection');
const isPOJO = require('../isPOJO');

/*!
 * ignore
 */

module.exports = function isExclusive(projection) {
  if (projection == null) {
    return null;
  }

  const keys = Object.keys(projection);
  let exclude = null;

  if (keys.length === 1 && keys[0] === '_id') {
    exclude = !projection._id;
  } else {
    for (let ki = 0; ki < keys.length; ++ki) {
      // Does this projection explicitly define inclusion/exclusion?
      // Explicitly avoid `$meta` and `$slice`
      const key = keys[ki];
      if (key !== '_id' && isDefiningProjection(projection[key])) {
        exclude = isPOJO(projection[key]) ?
          (isExclusive(projection[key]) ?? exclude) :
          !projection[key];
        if (exclude != null) {
          break;
        }
      }
    }
  }

  return exclude;
};
