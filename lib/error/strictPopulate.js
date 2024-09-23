/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * Strict mode error constructor
 *
 * @param {String} path
 * @param {String} [msg]
 * @inherits MongooseError
 * @api private
 */

class StrictPopulateError extends MongooseError {

  constructor(path, msg) {
    msg = msg || 'Cannot populate path `' + path + '` because it is not in your schema. ' + 'Set the `strictPopulate` option to false to override.';
    super(msg);
    this.path = path;
  }
}

Object.defineProperty(StrictPopulateError.prototype, 'name', {
  value: 'StrictPopulateError'
});

module.exports = StrictPopulateError;
