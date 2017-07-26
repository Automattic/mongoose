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
  var msg;
  var messages = MongooseError.messages;
  if (messages.DocumentNotFoundError != null) {
    msg = typeof messages.DocumentNotFoundError === 'function' ?
      messages.DocumentNotFoundError(query) :
      messages.DocumentNotFoundError;
  } else {
    msg = 'No document found for query "' + util.inspect(query) + '"';
  }

  MongooseError.call(this, msg);

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
