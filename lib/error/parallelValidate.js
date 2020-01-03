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

function ParallelValidateError(doc) {
  const msg = 'Can\'t validate() the same doc multiple times in parallel. Document: ';
  MongooseError.call(this, msg + doc._id);
  this.name = 'ParallelValidateError';
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