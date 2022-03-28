/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');


/**
 * The connection failed to reconnect and will never successfully reconnect to
 * MongoDB without manual intervention.
 * @api private
 */
class EachAsyncMultiError extends MongooseError {
  /**
   * @param {String} connectionString
   */
  constructor(errors) {
    let preview = errors.map(e => e.message).join(', ');
    if (preview.length > 50) {
      preview = preview.slice(0, 50) + '...';
    }
    super(`eachAsync() finished with ${errors.length} errors: ${preview}`);

    this.errors = errors;
  }
}

Object.defineProperty(EachAsyncMultiError.prototype, 'name', {
  value: 'EachAsyncMultiError'
});

/*!
 * exports
 */

module.exports = EachAsyncMultiError;
