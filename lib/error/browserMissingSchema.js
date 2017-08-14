/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/*!
 * MissingSchema Error constructor.
 *
 * @inherits MongooseError
 */

function MissingSchemaError() {
  var msg = 'Schema hasn\'t been registered for document.\n'
          + 'Use mongoose.Document(name, schema)';
  MongooseError.call(this, msg);
  this.name = 'MissingSchemaError';
  Error.captureStackTrace && Error.captureStackTrace(this, arguments.callee);
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
