/*!
 * Module dependencies.
 */

var MongooseError = require('../error');

/**
 * Schema validator collection error
 *
 * @param {String} path
 * @param {Array} errors
 * @inherits MongooseError
 * @api private
 */

function ValidatorCollectionError (path, errors) {
  MongooseError.call(this, 'Validators failed for path ' + path);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'ValidatorCollectionError';
  this.path = path;
  this.errors = errors || [];
};

/*!
 * toString helper
 */

ValidatorCollectionError.prototype.toString = function () {
  return this.name + ': ' + this.errors.map(function (value) {
    return String(value);
  }, this).join(', ');
}

/*!
 * Inherits from MongooseError
 */

ValidatorCollectionError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = ValidatorCollectionError;
