
/**
 * Mongoose error
 *
 * @api private
 */

function MongooseError (msg) {
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
  this.name = 'MongooseError';
};

/**
 * Inherits from Error
 *
 */

MongooseError.prototype.__proto__ = Error.prototype;

/**
 * Exports error
 *
 */

module.exports = MongooseError;
