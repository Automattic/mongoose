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

  MongooseError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
  this.type = type;
  this.value = val;
  this.message = this.toString(msg, path, val);
}

/*!
 * toString helper
 *
 * @param {String=} optMsg optionally define the message to format
 * @param {String=} optPath
 * @param {String=} optVal
 * @return {String}
 */

ValidatorError.prototype.toString = function (optMsg, optPath, optVal) {
  var message;
  if ('string' === typeof optMsg) {
    message = 'Validator ' + optMsg + 'failed for path ' + optPath;
    if ('undefined' !== typeof optVal) message += ' with value `' + String(optVal) + '`';
  } else {
    message = this.message;
  }

  return message;
};

/*!
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = ValidatorError;
