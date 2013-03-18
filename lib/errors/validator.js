/*!
 * Module dependencies.
 */

var MongooseError = require('../error');

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String} msg
 * @param {String|Number|any} val
 * @inherits MongooseError
 * @api private
 */

function ValidatorError (path, type, val) {
  var msg = type
    ? '"' + type + '" '
    : '';

  var message = 'Validator ' + msg + 'failed for path ' + path
  if (2 < arguments.length) message += ' with value `' + String(val) + '`';

  MongooseError.call(this, message);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
  this.value = val;
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
