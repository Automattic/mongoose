'use strict';

const MongooseError = require('./mongooseError');

/*!
 * Module exports.
 */

module.exports = exports = MongooseError;

/**
 * The default built-in validator error messages.
 *
 * @see Error.messages #error_messages_MongooseError-messages
 * @api public
 */

MongooseError.messages = require('./messages');

// backward compat
MongooseError.Messages = MongooseError.messages;

/**
 * An instance of this error class will be returned when `save()` fails
 * because the underlying
 * document was not found. The constructor takes one parameter, the
 * conditions that mongoose passed to `update()` when trying to update
 * the document.
 *
 * @api public
 */

MongooseError.DocumentNotFoundError = require('./notFound');

/**
 * An instance of this error class will be returned when mongoose failed to
 * cast a value.
 *
 * @api public
 */

MongooseError.CastError = require('./cast');

/**
 * An instance of this error class will be returned when [validation](/docs/validation.html) failed.
 *
 * @api public
 */

MongooseError.ValidationError = require('./validation');

/**
 * A `ValidationError` has a hash of `errors` that contain individual `ValidatorError` instances
 *
 * @api public
 */

MongooseError.ValidatorError = require('./validator');

/**
 * An instance of this error class will be returned when you call `save()` after
 * the document in the database was changed in a potentially unsafe way. See
 * the [`versionKey` option](/docs/guide.html#versionKey) for more information.
 *
 * @api public
 */

MongooseError.VersionError = require('./version');

/**
 * An instance of this error class will be returned when you call `save()` multiple
 * times on the same document in parallel. See the [FAQ](/docs/faq.html) for more
 * information.
 *
 * @api public
 */

MongooseError.ParallelSaveError = require('./parallelSave');

/**
 * Thrown when a model with the given name was already registered on the connection.
 * See [the FAQ about `OverwriteModelError`](/docs/faq.html#overwrite-model-error).
 *
 * @api public
 */

MongooseError.OverwriteModelError = require('./overwriteModel');

/**
 * Thrown when you try to access a model that has not been registered yet
 *
 * @api public
 */

MongooseError.MissingSchemaError = require('./missingSchema');

/**
 * An instance of this error will be returned if you used an array projection
 * and then modified the array in an unsafe way.
 *
 * @api public
 */

MongooseError.DivergentArrayError = require('./divergentArray');
