
/*!
 * Module dependencies.
 */

var MongooseError = require('../error');

/**
 * Version Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function VersionError () {
  MongooseError.call(this, 'No matching document found.');
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'VersionError';
};

/*!
 * Inherits from MongooseError.
 */

VersionError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = VersionError;
