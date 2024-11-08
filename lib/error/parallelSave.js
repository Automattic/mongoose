'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./mongooseError');


/**
 * ParallelSave Error constructor.
 *
 * @param {Document} doc
 * @api private
 */

class ParallelSaveError extends MongooseError {

  constructor(doc) {
    const msg = 'Can\'t save() the same doc multiple times in parallel. Document: ';
    super(msg + doc._doc._id);
  }
}

Object.defineProperty(ParallelSaveError.prototype, 'name', {
  value: 'ParallelSaveError'
});

/*!
 * exports
 */

module.exports = ParallelSaveError;
