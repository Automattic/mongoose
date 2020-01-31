'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./mongooseError');

/**
 * ParallelValidate Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function ParallelValidateError(doc, opts) {
  const msg = 'Can\'t validate() the same doc multiple times in parallel. Document: ';
  MongooseError.call(this, msg + doc._id);
  this.name = 'ParallelValidateError';
  if (opts && opts.parentStack) {
    // Provide a full async stack, most recent first
    this.stack = this.stack + '\n\n' + opts.parentStack.join('\n\n');
  }
  // You need to know to look for this, but having it can be very helpful
  // for tracking down issues when combined with the deepStackTrace schema
  // option
  this.conflictStack = opts && opts.conflictStack;
}

/*!
 * Inherits from MongooseError.
 */

ParallelValidateError.prototype = Object.create(MongooseError.prototype);
ParallelValidateError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = ParallelValidateError;