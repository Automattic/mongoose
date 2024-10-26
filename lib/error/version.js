'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./mongooseError');

/**
 * Version Error constructor.
 *
 * @param {Document} doc
 * @param {Number} currentVersion
 * @param {Array<String>} modifiedPaths
 * @api private
 */

class VersionError extends MongooseError {

  constructor(doc, currentVersion, modifiedPaths) {
    const modifiedPathsStr = modifiedPaths.join(', ');
    super('No matching document found for id "' + doc._doc._id +
      '" version ' + currentVersion + ' modifiedPaths "' + modifiedPathsStr + '"');
    this.version = currentVersion;
    this.modifiedPaths = modifiedPaths;
  }
}


Object.defineProperty(VersionError.prototype, 'name', {
  value: 'VersionError'
});

/*!
 * exports
 */

module.exports = VersionError;
