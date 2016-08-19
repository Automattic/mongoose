/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function DisconnectedError(connectionString) {
  MongooseError.call(this, 'Ran out of retries trying to reconnect to "' +
    connectionString + '". Try setting `server.reconnectTries` and ' +
    '`server.reconnectInterval` to something higher.');
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.name = 'DisconnectedError';
}

/*!
 * Inherits from MongooseError.
 */

DisconnectedError.prototype = Object.create(MongooseError.prototype);
DisconnectedError.prototype.constructor = MongooseError;


/*!
 * exports
 */

module.exports = DisconnectedError;
