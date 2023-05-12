
/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');

class InvalidSchemaOptionError extends MongooseError {
  /**
   * InvalidSchemaOption Error constructor.
   * @param {String} name
   * @api private
   */
  constructor(name) {
    const msg = 'Cannot create subschema on key ' + name + ' because it has option timeseries enabled.';
    super(msg);
  }
}

Object.defineProperty(InvalidSchemaOptionError.prototype, 'name', {
  value: 'InvalidSchemaOptionError'
});

/*!
 * exports
 */

module.exports = InvalidSchemaOptionError;
