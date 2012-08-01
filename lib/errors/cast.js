/*!
 * Module dependencies.
 */

var MongooseError = require('../error');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function CastError (type, value) {
  MongooseError.call(this, 'Cast to ' + type + ' failed for value "' + value + '"');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'CastError';
  this.type = type;
  this.value = value;
};

/*!
 * Inherits from MongooseError.
 */

CastError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = CastError;
