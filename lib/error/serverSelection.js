/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * MongooseServerSelectionError constructor
 *
 * @param {String} type
 * @param {String} value
 * @inherits MongooseError
 * @api private
 */

function MongooseServerSelectionError(message) {
  MongooseError.call(this, message);
  this.name = 'MongooseServerSelectionError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
}

/*!
 * Inherits from MongooseError.
 */

MongooseServerSelectionError.prototype = Object.create(MongooseError.prototype);
MongooseServerSelectionError.prototype.constructor = MongooseError;

/*!
 * ignore
 */

MongooseServerSelectionError.prototype.assimilateError = function(err) {
  this.message = err.message;
  Object.assign(this, err, {
    name: 'MongooseServerSelectionError'
  });

  return this;
};

module.exports = MongooseServerSelectionError;
