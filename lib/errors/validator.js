/*!
 * Module dependencies.
 */

var MongooseError = require('../error')
  , errorMessages = require('./messages')
  , utils = require('../utils')
  ;

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} type
 * @param {String} message
 * @inherits MongooseError
 * @api private
 */

function ValidatorError (path, type, message) {
  message = message || errorMessages[type];

  if ('undefined' === typeof message) { // if still don't have message
    message = 'Validator failed for path ' + path;
  }
  
  MongooseError.call(this, utils.normalizeMessage(path, message));
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
};

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function () {
  return this.message;
}

/*!
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = ValidatorError;
