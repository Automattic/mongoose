'use strict';

/*!
 * ignore
 */

module.exports = function selectPopulatedFields(query) {
  const opts = query._mongooseOptions;

  if (opts.populate != null) {
    const paths = Object.keys(opts.populate);
    const userProvidedFields = query._userProvidedFields || {};
    if (query.selectedInclusively()) {
      for (const path of paths) {
        if (!isPathInFields(userProvidedFields, path)) {
          query.select(path);
        } else if (userProvidedFields[path] === 0) {
          delete query._fields[path];
        }
      }
    } else if (query.selectedExclusively()) {
      for (const path of paths) {
        if (userProvidedFields[path] == null) {
          delete query._fields[path];
        }
      }
    }
  }
};

/*!
 * ignore
 */

function isPathInFields(userProvidedFields, path) {
  const pieces = path.split('.');
  const len = pieces.length;
  let cur = pieces[0];
  for (let i = 1; i < len; ++i) {
    if (userProvidedFields[cur] != null) {
      return true;
    }
    cur += '.' + pieces[i];
  }
  return userProvidedFields[cur] != null;
}
