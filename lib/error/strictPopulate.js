/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');


class StrictPopulateError extends MongooseError {
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
    msg = msg || 'Cannot populate path `' + path + '` because it is not in your schema. ' + 'Set the `strictPopulate` option to false to override.';
    super(msg);
    this.isImmutableError = !!immutable;
    this.path = path;
  }
}

Object.defineProperty(StrictPopulateError.prototype, 'name', {
  value: 'StrictPopulateError'
});

module.exports = StrictPopulateError;
