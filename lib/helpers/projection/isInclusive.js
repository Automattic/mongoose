'use strict';

const isDefiningProjection = require('./isDefiningProjection');

/*!
 * ignore
 */

module.exports = function isInclusive(projection) {
  if (projection == null) {
    return false;
  }

  const props = Object.keys(projection);
  const numProps = props.length;
  if (numProps === 0) {
    return false;
  }

  for (let i = 0; i < numProps; ++i) {
    const prop = props[i];
    // Plus paths can't define the projection (see gh-7050)
    if (prop.charAt(0) === '+') {
      continue;
    }
    // If field is truthy (1, true, etc.) and not an object, then this
    // projection must be inclusive. If object, assume its $meta, $slice, etc.
    if (isDefiningProjection(projection[prop]) && !!projection[prop]) {
      return true;
    }
  }

  return false;
};
