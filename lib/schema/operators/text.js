'use strict';

const CastError = require('../../error/cast');
const castBoolean = require('../../cast/boolean');
const castString = require('../../cast/string');

/**
 * Casts val to an object suitable for `$text`. Throws an error if the object
 * can't be casted.
 *
 * @param {any} val value to cast
 * @param {string} [path] path to associate with any errors that occurred
 * @return {object} casted object
 * @see https://www.mongodb.com/docs/manual/reference/operator/query/text/
 * @api private
 */

module.exports = function castTextSearch(val, path) {
  if (val == null || typeof val !== 'object') {
    throw new CastError('$text', val, path);
  }

  if (val.$search != null) {
    val.$search = castStringForTextSearch(val.$search, path + '.$search');
  }
  if (val.$language != null) {
    val.$language = castStringForTextSearch(val.$language, path + '.$language');
  }
  if (val.$caseSensitive != null) {
    val.$caseSensitive = castBooleanForTextSearch(val.$caseSensitive,
      path + '.$caseSensitive');
  }
  if (val.$diacriticSensitive != null) {
    val.$diacriticSensitive = castBooleanForTextSearch(val.$diacriticSensitive,
      path + '.$diacriticSensitive');
  }

  return val;
};

function castBooleanForTextSearch(value, path) {
  try {
    return castBoolean(value);
  } catch (error) {
    throw new CastError('boolean', value, path, error);
  }
}

function castStringForTextSearch(value, path) {
  try {
    return castString(value);
  } catch (error) {
    throw new CastError('string', value, path, error);
  }
}
