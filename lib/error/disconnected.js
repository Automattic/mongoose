/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');


/**
 * The connection failed to reconnect and will never successfully reconnect to
 * MongoDB without manual intervention.
 * @api private
 */
class DisconnectedError extends MongooseError {
  /**
   * @param {String} connectionString
   */
  constructor(id, fnName) {
    super('Connection ' + id +
    ' was disconnected when calling `' + fnName + '()`');
  }
}

Object.defineProperty(DisconnectedError.prototype, 'name', {
  value: 'DisconnectedError'
});

/*!
 * exports
 */

module.exports = DisconnectedError;
