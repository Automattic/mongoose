'use strict';

module.exports = function omitUndefined(val) {
  if (val == null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    for (let i = val.length - 1; i >= 0; --i) {
      if (val[i] === undefined) {
        val.splice(i, 1);
      }
    }
  }
  for (const key of Object.keys(val)) {
    if (val[key] === void 0) {
      delete val[key];
    }
  }
  return val;
};
