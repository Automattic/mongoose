'use strict';

module.exports = function lookupLocalFields(cur, path, val) {
  if (cur == null) {
    return cur;
  }

  if (cur._doc != null) {
    cur = cur._doc;
  }

  if (arguments.length >= 3) {
    cur[path] = val;
    return val;
  }


  // Support populating paths under maps using `map.$*.subpath`
  if (path === '$*') {
    return cur instanceof Map ?
      Array.from(cur.values()) :
      Object.keys(cur).map(key => cur[key]);
  }

  return cur[path];
};