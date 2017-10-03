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
        if (userProvidedFields[paths[i]] == null) {
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
