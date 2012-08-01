
/*!
 * Module requirements
 */

var MongooseError = require('../error')

/**
 * Document Error
 *
 * @param {String} msg
 * @inherits MongooseError
 * @api private
 */

function DocumentError (msg) {
  MongooseError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'DocumentError';
};

/*!
 * Inherits from MongooseError.
 */

DocumentError.prototype.__proto__ = MongooseError.prototype;

/*!
 * Module exports.
 */

module.exports = exports = DocumentError;
