/*!
 * Module dependencies.
 */

var MongooseError = require('./');

/**
 * Constructor for errors that happen when a parameter that's expected to be
 * an object isn't an object
 *
 * @param {Any} value
 * @param {String} paramName
 * @param {String} fnName
 * @inherits MongooseError
 * @api private
 */

function ObjectParameterError(value, paramName, fnName) {
  MongooseError.call(this, 'Parameter "' + paramName + '" to ' + fnName +
    '() must be an object, got ' + value.toString());
  this.name = 'ObjectParameterError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
}

/*!
 * Inherits from MongooseError.
 */

ObjectParameterError.prototype = Object.create(MongooseError.prototype);
ObjectParameterError.prototype.constructor = MongooseError;

module.exports = ObjectParameterError;
