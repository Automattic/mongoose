/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Strict mode error constructor
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function StrictModeError(path, msg) {
  msg = msg || 'Field `' + path + '` is not in schema and strict ' +
    'mode is set to throw.';
  MongooseError.call(this, msg);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.name = 'StrictModeError';
  this.path = path;
}

/*!
 * Inherits from MongooseError.
 */

StrictModeError.prototype = Object.create(MongooseError.prototype);
StrictModeError.prototype.constructor = MongooseError;

module.exports = StrictModeError;
