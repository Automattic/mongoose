
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Version Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function VersionError(doc) {
  MongooseError.call(this, 'No matching document found for id "' + doc._id +
    '"');
  Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
  this.name = 'VersionError';
}

/*!
 * Inherits from MongooseError.
 */

VersionError.prototype = Object.create(MongooseError.prototype);
VersionError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = VersionError;
