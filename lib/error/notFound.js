'use strict';

/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');
var util = require('util');

/*!
 * OverwriteModel Error constructor.
 *
 * @inherits MongooseError
 */

function DocumentNotFoundError(query) {
  MongooseError.call(this, 'No document found for query "' +
    util.inspect(query) + '"');

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }

  this.name = 'DocumentNotFoundError';
  this.query = query;
}

/*!
 * Inherits from MongooseError.
 */

DocumentNotFoundError.prototype = Object.create(MongooseError.prototype);
DocumentNotFoundError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = DocumentNotFoundError;
