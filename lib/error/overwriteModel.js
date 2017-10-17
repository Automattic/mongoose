
/*!
 * Module dependencies.
 */

var MongooseError = require('./');

/*!
 * OverwriteModel Error constructor.
 *
 * @inherits MongooseError
 */

function OverwriteModelError(name) {
  MongooseError.call(this, 'Cannot overwrite `' + name + '` model once compiled.');
  this.name = 'OverwriteModelError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
}

/*!
 * Inherits from MongooseError.
 */

OverwriteModelError.prototype = Object.create(MongooseError.prototype);
OverwriteModelError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = OverwriteModelError;
