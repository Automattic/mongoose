'use strict';

const specialProperties = require('../specialProperties');


module.exports = function setDottedPath(obj, path, val) {
  if (path.indexOf('.') === -1) {
    if (specialProperties.has(path)) {
      return;
    }

    obj[path] = val;
    return;
  }
  const parts = path.split('.');

  const last = parts.pop();
  let cur = obj;
  for (const part of parts) {
    if (specialProperties.has(part)) {
      continue;
    }
    // Skip inherited properties like `Object.prototype.toString` to avoid
    // setting properties on shared objects
    if (!Object.hasOwn(cur, part) && part in cur) {
      return;
    }
    if (cur[part] == null) {
      cur[part] = {};
    }

    cur = cur[part];
  }

  if (!specialProperties.has(last)) {
    cur[last] = val;
  }
};
