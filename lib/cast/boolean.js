'use strict';

const CastError = require('../error/cast');

const convertToTrue = [true, 'true', 1, '1', 'yes'];
const convertToFalse = [false, 'false', 0, '0', 'no'];

/*!
 * Given a value, cast it to a boolean, or throw a `CastError` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @param {String} [path] optional the path to set on the CastError
 * @return {Boolean|null|undefined}
 * @throws {CastError} if `value` is not one of the allowed values
 * @api private
 */

module.exports = function castBoolean(value, path) {
  if (value == null) {
    return value;
  }

  // strict mode (throws if value is not a boolean, instead of converting)
  if (convertToTrue.indexOf(value) !== -1) {
    return true;
  }
  if (convertToFalse.indexOf(value) !== -1) {
    return false;
  }
  throw new CastError('boolean', value, path);
};
