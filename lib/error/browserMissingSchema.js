/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');

/*!
 * MissingSchema Error constructor.
 *
 * @inherits MongooseError
 */

function MissingSchemaError() {
  const msg = 'Schema hasn\'t been registered for document.\n'
          + 'Use mongoose.Document(name, schema)';
  MongooseError.call(this, msg);
  this.name = 'MissingSchemaError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
}

/*!
 * Inherits from MongooseError.
 */

MissingSchemaError.prototype = Object.create(MongooseError.prototype);
MissingSchemaError.prototype.constructor = MongooseError;

/*!
 * exports
 */

module.exports = MissingSchemaError;
