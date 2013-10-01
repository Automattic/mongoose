
/**
 * MongooseError constructor
 *
 * @param {String} msg Error message
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function MongooseError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'MongooseError';
};

/*!
 * Formats error messages
 */

MongooseError.prototype.formatMessage = function (msg, path, type, val) {
  if (!msg) throw new TypeError('message is required');

  return msg.replace(/{PATH}/, path)
            .replace(/{VALUE}/, String(val||''))
            .replace(/{TYPE}/, type || 'declared type');
}

/*!
 * Inherits from Error.
 */

MongooseError.prototype.__proto__ = Error.prototype;

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

/*!
 * Expose subclasses
 */

MongooseError.CastError = require('./error/cast');
MongooseError.ValidationError = require('./error/validation')
MongooseError.ValidatorError = require('./error/validator')
MongooseError.VersionError =require('./error/version')
MongooseError.OverwriteModelError = require('./error/overwriteModel')
MongooseError.MissingSchemaError = require('./error/missingSchema')
MongooseError.DivergentArrayError = require('./error/divergentArray')

