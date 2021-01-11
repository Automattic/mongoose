/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');


class StrictModeError extends MongooseError {
  /**
   * Strict mode error constructor
   *
   * @param {String} path
   * @param {String} [msg]
   * @param {Boolean} [immutable]
   * @inherits MongooseError
   * @api private
   */
  constructor(path, msg, immutable) {
    msg = msg || 'Field `' + path + '` is not in schema and strict ' +
      'mode is set to throw.';
    super(msg);
    this.isImmutableError = !!immutable;
    this.path = path;
  }

  copy(other) {
    this.message = other.message;
    this.isImmutableError = other.isImmutableError;
    this.path = other.path;
  }
}

Object.defineProperty(StrictModeError.prototype, 'name', {
  value: 'StrictModeError'
});

module.exports = StrictModeError;
