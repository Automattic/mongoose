'use strict';

module.exports = function isInclusive(projection) {
  if (projection == null) {
    return false;
  }

  var props = Object.keys(projection);
  var numProps = props.length;
  if (numProps === 0) {
    return false;
  }

  for (var i = 0; i < numProps; ++i) {
    var prop = props[i];
    // If field is truthy (1, true, etc.) and not an object, then this
    // projection must be inclusive. If object, assume its $meta, $slice, etc.
    if (typeof projection[prop] !== 'object' && !!projection[prop]) {
      return true;
    }
  }

  return false;
};
