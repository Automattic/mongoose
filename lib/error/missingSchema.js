
/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/*!
 * MissingSchema Error constructor.
 *
 * @inherits MongooseError
 */

function MissingSchemaError (name) {
  var msg = 'Schema hasn\'t been registered for model "' + name + '".\n'
          + 'Use mongoose.model(name, schema)';
  MongooseError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'MissingSchemaError';
};

/*!
 * Inherits from MongooseError.
 */

MissingSchemaError.prototype.__proto__ = MongooseError.prototype;

/*!
 * exports
 */

module.exports = MissingSchemaError;
