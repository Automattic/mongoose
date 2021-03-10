'use strict';

const isExclusive = require('../projection/isExclusive');
const isInclusive = require('../projection/isInclusive');

/*!
 * ignore
 */

module.exports = function selectPopulatedFields(fields, userProvidedFields, populateOptions) {
  if (populateOptions == null) {
    return;
  }

  const paths = Object.keys(populateOptions);
  userProvidedFields = userProvidedFields || {};
  if (isInclusive(fields)) {
    for (const path of paths) {
      if (!isPathInFields(userProvidedFields, path)) {
        fields[path] = 1;
      } else if (userProvidedFields[path] === 0) {
        delete fields[path];
      }
    }
  } else if (isExclusive(fields)) {
    for (const path of paths) {
      if (userProvidedFields[path] == null) {
        delete fields[path];
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
    if (userProvidedFields[cur] != null || userProvidedFields[cur + '.$'] != null) {
      return true;
    }
    cur += '.' + pieces[i];
  }
  return userProvidedFields[cur] != null || userProvidedFields[cur + '.$'] != null;
}
