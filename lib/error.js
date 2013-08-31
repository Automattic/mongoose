
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
  // TODO test me
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
 * @see Error.Messages #errors_messages_MongooseError-Messages
 * @api public
 */

MongooseError.Messages = require('./errors/messages');

/*!
 * Expose subclasses
 */

MongooseError.CastError = require('./errors/cast');
MongooseError.ValidationError = require('./errors/validation')
MongooseError.ValidatorError = require('./errors/validator')
MongooseError.VersionError =require('./errors/version')
MongooseError.OverwriteModelError = require('./errors/overwriteModel')
MongooseError.MissingSchemaError = require('./errors/missingSchema')
MongooseError.DivergentArrayError = require('./errors/divergentArray')

