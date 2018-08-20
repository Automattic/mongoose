'use strict';

/*!
 * Module dependencies.
 */

var MongooseError = require('./');

/**
 * Version Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function VersionError(doc, currentVersion, modifiedPaths) {
  var modifiedPathsStr = modifiedPaths.join(', ');
  MongooseError.call(this, 'No matching document found for id "' + doc._id +
    '" version ' + currentVersion + ' modifiedPaths "' + modifiedPathsStr + '"');
  this.name = 'VersionError';
  this.version = currentVersion;
  this.modifiedPaths = modifiedPaths;
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
