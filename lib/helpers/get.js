'use strict';

/*!
 * Simplified lodash.get to work around the annoying null quirk. See:
 * https://github.com/lodash/lodash/issues/3659
 */

module.exports = function get(obj, path, def) {
  const parts = path.split('.');
  let rest = path;
  let cur = obj;
  for (const part of parts) {
    if (cur == null) {
      return def;
    }

    // `lib/cast.js` depends on being able to get dotted paths in updates,
    // like `{ $set: { 'a.b': 42 } }`
    if (cur[rest] != null) {
      return cur[rest];
    }

    cur = getProperty(cur, part);

    rest = rest.substr(part.length + 1);
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