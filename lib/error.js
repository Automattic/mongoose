
/**
 * Mongoose error
 *
 * @api private
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function MongooseError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'MongooseError';
};

/*!
 * Inherits from Error.
 */

MongooseError.prototype.__proto__ = Error.prototype;

/*!
 * Module exports.
 */

module.exports = MongooseError;
