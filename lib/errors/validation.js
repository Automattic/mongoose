
/*!
 * Module requirements
 */

var MongooseError = require('../error')

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits MongooseError
 */

function ValidationError (instance) {
  MongooseError.call(this, "Validation failed");
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidationError';
  this.errors = instance.errors = {};
};

/**
 * Console.log helper
 */

ValidationError.prototype.toString = function () {
  var ret = this.name + ': ';
  var msgs = [];

  Object.keys(this.errors).forEach(function (key) {
    if (this == this.errors[key]) return;
    msgs.push(String(this.errors[key]));
  }, this)

  return ret + msgs.join(', ');
};

/*!
 * Inherits from MongooseError.
 */

ValidationError.prototype.__proto__ = MongooseError.prototype;

/*!
 * Module exports
 */

module.exports = exports = ValidationError;
