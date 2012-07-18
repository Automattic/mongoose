
/**
 * Module requirements
 */

var MongooseError = require('../error')

/**
 * Document Validation Error
 *
 * @api private
 */

function ValidationError (instance) {
  MongooseError.call(this, "Validation failed");
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
};

ValidationError.prototype.toString = function () {
  return this.name + ': ' + Object.keys(this.errors).map(function (key) {
    return String(this.errors[key]);
  }, this).join(', ');
};

/**
 * Inherits from MongooseError.
 */

ValidationError.prototype.__proto__ = MongooseError.prototype;

/**
 * Module exports
 */

module.exports = exports = ValidationError;
