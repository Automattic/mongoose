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
  constructor(connectionString) {
    super('Ran out of retries trying to reconnect to "' +
      connectionString + '". Try setting `server.reconnectTries` and ' +
      '`server.reconnectInterval` to something higher.');
  }
}

Object.defineProperty(DisconnectedError.prototype, 'name', {
  value: 'DisconnectedError'
});

/*!
 * exports
 */

module.exports = DisconnectedError;
