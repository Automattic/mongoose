'use strict';

module.exports = function normalizeRefPath(refPath, doc, populatedPath) {
  if (refPath == null) {
    return refPath;
  }

  if (typeof refPath === 'function') {
    refPath = refPath.call(doc, doc, populatedPath);
  }

  // If populated path has numerics, the end `refPath` should too. For example,
  // if populating `a.0.b` instead of `a.b` and `b` has `refPath = a.c`, we
  // should return `a.0.c` for the refPath.
  const hasNumericProp = /(\.\d+$|\.\d+\.)/g;

  if (hasNumericProp.test(populatedPath)) {
    const chunks = populatedPath.split(hasNumericProp);

    if (chunks[chunks.length - 1] === '') {
      throw new Error('Can\'t populate individual element in an array');
    }

    let _refPath = '';
    let _remaining = refPath;
    // 2nd, 4th, etc. will be numeric props. For example: `[ 'a', '.0.', 'b' ]`
    for (let i = 0; i < chunks.length; i += 2) {
      const chunk = chunks[i];
      if (_remaining.startsWith(chunk + '.')) {
        _refPath += _remaining.substr(0, chunk.length) + chunks[i + 1];
        _remaining = _remaining.substr(chunk.length + 1);
      } else if (i === chunks.length - 1) {
        _refPath += _remaining;
        _remaining = '';
        break;
      } else {
        throw new Error('Could not normalize ref path, chunk ' + chunk + ' not in populated path');
      }
    }

    return _refPath;
  }

  return refPath;
};