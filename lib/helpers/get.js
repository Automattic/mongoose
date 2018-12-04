'use strict';

/*!
 * Simplified lodash.get to work around the annoying null quirk. See:
 * https://github.com/lodash/lodash/issues/3659
 */

module.exports = function get(obj, path, def) {
  const parts = path.split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null) {
      return def;
    }

    cur = getProperty(cur, part);
  }

  return cur == null ? def : cur;
};

function getProperty(obj, prop) {
  if (obj == null) {
    return obj;
  }
  if (obj instanceof Map) {
    return obj.get(prop);
  }
  return obj[prop];
}