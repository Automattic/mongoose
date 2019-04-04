'use strict';

/**
 * MongooseError constructor. MongooseError is the base class for all
 * Mongoose-specific errors.
 *
 * @param {String} msg Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function MongooseError(msg) {
  Error.call(this);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.message = msg;
  this.name = 'MongooseError';
}

/*!
 * Inherits from Error.
 */

MongooseError.prototype = Object.create(Error.prototype);
MongooseError.prototype.constructor = Error;

/**
 * The name of the error. The name uniquely identifies this Mongoose error. The
 * possible values are:
 *
 * - `MongooseError`: general Mongoose error
 * - `CastError`: Mongoose could not convert a value to the type defined in the schema path. May be in a `ValidationError` class' `errors` property.
 * - `DisconnectedError`: This [connection](connections.html) timed out in trying to reconnect to MongoDB and will not successfully reconnect to MongoDB unless you explicitly reconnect.
 * - `DivergentArrayError`: You attempted to `save()` an array that was modified after you loaded it with a `$elemMatch` or similar projection
 * - `MissingSchemaError`: You tried to access a model with [`mongoose.model()`](api.html#mongoose_Mongoose-model) that was not defined
 * - `DocumentNotFoundError`: The document you tried to [`save()`](api.html#document_Document-save) was not found
 * - `ValidatorError`: error from an individual schema path's validator
 * - `ValidationError`: error returned from [`validate()`](api.html#document_Document-validate) or [`validateSync()`](api.html#document_Document-validateSync). Contains zero or more `ValidatorError` instances in `.errors` property.
 * - `MissingSchemaError`: You called `mongoose.Document()` without a schema
 * - `ObjectExpectedError`: Thrown when you set a nested path to a non-object value with [strict mode set](guide.html#strict).
 * - `ObjectParameterError`: Thrown when you pass a non-object value to a function which expects an object as a paramter
 * - `OverwriteModelError`: Thrown when you call [`mongoose.model()`](api.html#mongoose_Mongoose-model) to re-define a model that was already defined.
 * - `ParallelSaveError`: Thrown when you call [`save()`](api.html#model_Model-save) on a document when the same document instance is already saving.
 * - `StrictModeError`: Thrown when you set a path that isn't the schema and [strict mode](guide.html#strict) is set to `throw`.
 * - `VersionError`: Thrown when the [document is out of sync](guide.html#versionKey)
 *
 * @api public
 * @property {String} name
 * @memberOf MongooseError
 * @instance
 */

module.exports = MongooseError;
