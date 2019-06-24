'use strict';

/*!
 * ignore
 */

function MongooseError(msg) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.message = msg;
  this.name = 'MongooseError';
}

/*!
 * Inherits from Error.
 */

MongooseError.prototype = Object.create(Error.prototype);
MongooseError.prototype.constructor = Error;

module.exports = MongooseError;