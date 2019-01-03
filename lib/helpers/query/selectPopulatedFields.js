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
      for (let i = 0; i < paths.length; ++i) {
        if (!isPathInFields(userProvidedFields, paths[i])) {
          query.select(paths[i]);
        } else if (userProvidedFields[paths[i]] === 0) {
          delete query._fields[paths[i]];
        }
      }
    } else if (query.selectedExclusively()) {
      for (let i = 0; i < paths.length; ++i) {
        if (userProvidedFields[paths[i]] == null) {
          delete query._fields[paths[i]];
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
