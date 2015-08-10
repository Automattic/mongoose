
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/*!
 * OverwriteModel Error constructor.
 *
 * @inherits MongooseError
 */

function OverwriteModelError (name) {
  MongooseError.call(this, 'Cannot overwrite `' + name + '` model once compiled.');
  Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
  this.name = 'OverwriteModelError';
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
