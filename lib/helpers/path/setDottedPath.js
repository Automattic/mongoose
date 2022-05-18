'use strict';

module.exports = function setDottedPath(obj, path, val) {
  if (path.indexOf('.') === -1) {
    obj[path] = val;
    return;
  }
  const parts = path.split('.');

  if (
    parts.indexOf("__proto__") !== -1 ||
    parts.indexOf("constructor") !== -1 ||
    parts.indexOf("prototype") !== -1
  ) {
    throw new Error('prototype, __proto__ or constructor can not be set by setDottedPath');
  }

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