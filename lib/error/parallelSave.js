'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./');

/**
 * ParallelSave Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function ParallelSaveError(doc) {
  const msg = 'Can\'t save() the same doc multiple times in parallel. Document: ';
  MongooseError.call(this, msg + doc._id);
  this.name = 'ParallelSaveError';
}

/*!
 * Inherits from MongooseError.
 */

ParallelSaveError.prototype = Object.create(MongooseError.prototype);
ParallelSaveError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = ParallelSaveError;
