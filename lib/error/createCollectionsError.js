'use strict';

const MongooseError = require('./mongooseError');

/**
 * createCollections Error constructor
 *
 * @param {string} message
 * @param {string} errorsMap
 * @inherits MongooseError
 * @api private
 */

class CreateCollectionsError extends MongooseError {
  constructor(message, errorsMap) {
    super(message);
    this.errors = errorsMap;
  }
}

Object.defineProperty(CreateCollectionsError.prototype, 'name', {
  value: 'CreateCollectionsError'
});

module.exports = CreateCollectionsError;

