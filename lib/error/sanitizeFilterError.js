'use strict';

/*!
 * Module dependencies.
 */

const MongooseError = require('./');
const util = require('util');

class SanitizeFilterError extends MongooseError {
  /**
   * ParallelSave Error constructor.
   *
   * @param {Document} doc
   * @api private
   */
  constructor(filter, key) {
    const msg = 'Filter key `' + key + '` contains a query selector in filter ' + util.inspect(filter);
    super(msg);
  }
}

Object.defineProperty(SanitizeFilterError.prototype, 'name', {
  value: 'SanitizeFilterError'
});

/*!
 * exports
 */

module.exports = SanitizeFilterError;
