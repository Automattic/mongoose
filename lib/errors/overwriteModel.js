
/*!
 * Module dependencies.
 */

var MongooseError = require('../error');

/*!
 * OverwriteModel Error constructor.
 *
 * @inherits MongooseError
 */

function OverwriteModelError (name) {
  MongooseError.call(this, 'Cannot overwrite `' + name + '` model once compiled.');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'OverwriteModelError';
};

/*!
 * Inherits from MongooseError.
 */

OverwriteModelError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = OverwriteModelError;
