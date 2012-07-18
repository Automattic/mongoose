
/**
 * Module requirements
 */

var MongooseError = require('../error')

/**
 * Document Error
 *
 * @param text
 * @api private
 */

function DocumentError () {
  MongooseError.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'DocumentError';
};

/**
 * Inherits from MongooseError.
 */

DocumentError.prototype.__proto__ = MongooseError.prototype;

/**
 * Module exports.
 */

module.exports = exports = DocumentError;
