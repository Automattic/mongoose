/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Strict mode error constructor
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function ObjectExpectedError(path, val) {
  MongooseError.call(this, 'Tried to set nested object field `' + path +
    '` to primitive value `' + val + '` and strict mode is set to throw.');
  this.name = 'ObjectExpectedError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.path = path;
}

/*!
 * Inherits from MongooseError.
 */

ObjectExpectedError.prototype = Object.create(MongooseError.prototype);
ObjectExpectedError.prototype.constructor = MongooseError;

module.exports = ObjectExpectedError;
