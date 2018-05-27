'use strict';

/*!
 * Module dependencies.
 */

var MongooseError = require('./');

/**
 * ParallelSave Error constructor.
 *
 * @inherits MongooseError
 * @api private
 */

function ParallelSaveError(doc) {
  let msg = 'Can\'t save() the same doc multiple times in parallel. Document: ';
  MongooseError.call(this, msg + doc.id);
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
