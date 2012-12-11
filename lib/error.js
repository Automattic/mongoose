
/**
 * Mongoose error
 *
 * @api private
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function MongooseError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'MongooseError';
};

/*!
 * Inherits from Error.
 */

MongooseError.prototype.__proto__ = Error.prototype;

/*!
 * Module exports.
 */

module.exports = exports = MongooseError;

/*!
 * Expose subclasses
 */

MongooseError.CastError = require('./errors/cast');
MongooseError.DocumentError = require('./errors/document');
MongooseError.ValidationError = require('./errors/validation')
MongooseError.ValidatorError = require('./errors/validator')
MongooseError.VersionError =require('./errors/version')
MongooseError.OverwriteModelError = require('./errors/overwriteModel')
MongooseError.MissingSchemaError = require('./errors/missingSchema')
