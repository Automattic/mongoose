/*!
 * Module dependencies.
 */

var MongooseError = require('../error')
  , errorMessages = require('./messages')
  , utils = require('../utils')
  ;

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @param {String} message
 * @param {String} path
 * @inherits MongooseError
 * @api private
 */

function CastError (type, value, message, path) {
  MongooseError.call(this, utils.normalizeMessage(path, message));
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.type = type;
  this.path = path;
  this.value = value;
};

/*!
 * toString helper
 */

CastError.prototype.toString = function () {
  return this.message;
}

/*!
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = CastError;
