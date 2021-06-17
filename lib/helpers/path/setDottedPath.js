'use strict';

module.exports = function setDottedPath(obj, path, val) {
  const parts = path.split('.');
  let cur = obj;
  for (const part of parts.slice(0, -1)) {
    if (cur[part] == null) {
      cur[part] = {};
    }

    cur = cur[part];
  }

  const last = parts[parts.length - 1];
  cur[last] = val;
};