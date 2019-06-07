'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./');
const util = require('util');

/*!
 * OverwriteModel Error constructor.
 *
 * @inherits MongooseError
 */

function DocumentNotFoundError(filter, model) {
  let msg;
  const messages = MongooseError.messages;
  if (messages.DocumentNotFoundError != null) {
    msg = typeof messages.DocumentNotFoundError === 'function' ?
      messages.DocumentNotFoundError(filter, model) :
      messages.DocumentNotFoundError;
  } else {
    msg = 'No document found for query "' + util.inspect(filter) +
      '" on model "' + model + '"';
  }

  MongooseError.call(this, msg);

  this.name = 'DocumentNotFoundError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }

  this.filter = filter;
  // Backwards compat
  this.query = filter;
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
