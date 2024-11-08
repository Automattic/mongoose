'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./mongooseError');


/**
 * ParallelValidate Error constructor.
 *
 * @param {Document} doc
 * @api private
 */

class ParallelValidateError extends MongooseError {

  constructor(doc) {
    const msg = 'Can\'t validate() the same doc multiple times in parallel. Document: ';
    super(msg + doc._doc._id);
  }
}

Object.defineProperty(ParallelValidateError.prototype, 'name', {
  value: 'ParallelValidateError'
});

/*!
 * exports
 */

module.exports = ParallelValidateError;
