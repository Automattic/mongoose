/*!
 * Module dependencies.
 */

var MongooseError = require('../error');

/**
 * Schema validator error
 *
 * @param {String} path
 * @param {String|Array} type or array of validator errors
 * @inherits MongooseError
 * @api private
 */

function ValidatorError (path, type) {
  if (Array.isArray(type)) {
    this.errors = type;
    MongooseError.call(this, 'Validators failed for path ' + path);
  } else {
    var msg = type
      ? '"' + type + '" '
      : '';
    MongooseError.call(this, 'Validator ' + msg + 'failed for path ' + path);
    this.type = type;
  };
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorError';
  this.path = path;
};

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function () {
  if (this.errors) {
    return this.name + ': ' + this.errors.map(function (value) {
      return String(value);
    }, this).join(', ');
  } else {
    return this.message;
  }
}

/*!
 * Inherits from MongooseError
 */

ValidatorError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = ValidatorError;
