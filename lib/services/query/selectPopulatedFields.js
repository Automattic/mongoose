'use strict';

/*!
 * ignore
 */

module.exports = function selectPopulatedFields(query) {
  var opts = query._mongooseOptions;

  if (opts.populate != null) {
    var paths = Object.keys(opts.populate);
    var i;
    var userProvidedFields = query._userProvidedFields || {};
    if (query.selectedInclusively()) {
      for (i = 0; i < paths.length; ++i) {
        if (!isPathInFields(userProvidedFields, paths[i])) {
          query.select(paths[i]);
        }
      }
    } else if (query.selectedExclusively()) {
      for (i = 0; i < paths.length; ++i) {
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
  var pieces = path.split('.');
  var len = pieces.length;
  var cur = pieces[0];
  for (var i = 1; i < len; ++i) {
    if (userProvidedFields[cur] != null) {
      return true;
    }
    cur += '.' + pieces[i];
  }
  return false;
}
