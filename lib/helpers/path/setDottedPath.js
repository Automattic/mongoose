'use strict';

module.exports = function setDottedPath(obj, path, val) {
  if (path.indexOf('.') === -1) {
    obj[path] = val;
    return;
  }
  const parts = path.split('.');
  const last = parts.pop();
  let cur = obj;
  for (const part of parts) {
    if (cur[part] == null) {
      cur[part] = {};
    }

    cur = cur[part];
  }

  cur[last] = val;
};