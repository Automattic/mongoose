/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function CastError(type, value, path, reason) {
  MongooseError.call(this, 'Cast to ' + type + ' failed for value "' + value + '" at path "' + path + '"');
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack
  }
  this.name = 'CastError';
  this.kind = type;
  this.value = value;
  this.path = path;
  this.reason = reason;
}

/*!
 * Inherits from MongooseError.
 */

CastError.prototype = Object.create(MongooseError.prototype);
CastError.prototype.constructor = MongooseError;


/*!
 * exports
 */

module.exports = CastError;
