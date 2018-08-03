'use strict';

const CastError = require('../error/cast');

/*!
 * Given a value, cast it to a number, or throw a `CastError` if the value
 * cannot be casted. `null` and `undefined` are considered valid.
 *
 * @param {Any} value
 * @param {String} [path] optional the path to set on the CastError
 * @return {Boolean|null|undefined}
 * @throws {CastError} if `value` is not one of the allowed values
 * @api private
 */

module.exports = function castNumber(val, path) {
  if (isNaN(val)) {
    throw new CastError('number', val, path);
  }

  if (val == null) {
    return val;
  }
  if (val === '') {
    return null;
  }

  if (typeof val === 'string' || typeof val === 'boolean') {
    val = Number(val);
  }

  if (isNaN(val)) {
    throw new CastError('number', val, path);
  }
  if (val instanceof Number) {
    return val;
  }
  if (typeof val === 'number') {
    return val;
  }
  if (!Array.isArray(val) && typeof val.valueOf === 'function') {
    return Number(val.valueOf());
  }
  if (val.toString && !Array.isArray(val) && val.toString() == Number(val)) {
    return new Number(val);
  }

  throw new CastError('number', val, path);
};
