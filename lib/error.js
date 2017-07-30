
/**
 * MongooseError constructor
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

MongooseError.messages = require('./error/messages');

// backward compat
MongooseError.Messages = MongooseError.messages;

/**
 * This error will be called when `save()` fails because the underlying
 * document was not found. The constructor takes one parameter, the
 * conditions that mongoose passed to `update()` when trying to update
 * the document.
 *
 * @api public
 */

MongooseError.DocumentNotFoundError = require('./error/notFound');

/*!
 * Expose subclasses
 */

MongooseError.CastError = require('./error/cast');
MongooseError.ValidationError = require('./error/validation');
MongooseError.ValidatorError = require('./error/validator');
MongooseError.VersionError = require('./error/version');
MongooseError.OverwriteModelError = require('./error/overwriteModel');
MongooseError.MissingSchemaError = require('./error/missingSchema');
MongooseError.DivergentArrayError = require('./error/divergentArray');
