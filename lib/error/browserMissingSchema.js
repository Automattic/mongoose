/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * MissingSchema Error constructor.
 */

class MissingSchemaError extends MongooseError {

  constructor() {
    super('Schema hasn\'t been registered for document.\n'
      + 'Use mongoose.Document(name, schema)');
  }
}

Object.defineProperty(MissingSchemaError.prototype, 'name', {
  value: 'MongooseError'
});

/*!
 * exports
 */

module.exports = MissingSchemaError;
