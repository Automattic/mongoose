/*!
 * Module requirements
 */

'use strict';

const MongooseError = require('./mongooseError');
const util = require('util');
const combinePathErrors = require('../helpers/error/combinePathErrors');

/**
 * Query Filter Validation Error
 *
 * @api private
 * @inherits MongooseError
 */

class FilterValidationError extends MongooseError {

  constructor() {
    super('Filter validation failed');

    this.errors = {};
    this._message = 'Filter validation failed';
  }

  /**
   * Console.log helper
   */
  toString() {
    return this.name + ': ' + combinePathErrors(this);
  }

  /**
   * inspect helper
   * @api private
   */
  inspect() {
    return Object.assign(new Error(this.message), this);
  }

  /**
   * add message
   * @param {string} path
   * @param {string|Error} error
   * @api private
   */
  addError(path, error) {
    if (error instanceof FilterValidationError) {
      const { errors } = error;
      for (const errorPath of Object.keys(errors)) {
        this.addError(`${path}.${errorPath}`, errors[errorPath]);
      }

      return;
    }

    this.errors[path] = error;
    this.message = this._message + ': ' + combinePathErrors(this);
  }
}

if (util.inspect.custom) {
  // Avoid Node deprecation warning DEP0079
  FilterValidationError.prototype[util.inspect.custom] = FilterValidationError.prototype.inspect;
}

/**
 * Helper for JSON.stringify
 * Ensure `name` and `message` show up in toJSON output re: gh-9847
 * @api private
 */
Object.defineProperty(FilterValidationError.prototype, 'toJSON', {
  enumerable: false,
  writable: false,
  configurable: true,
  value: function() {
    return Object.assign({}, this, { name: this.name, message: this.message });
  }
});

Object.defineProperty(FilterValidationError.prototype, 'name', {
  value: 'FilterValidationError'
});

/*!
 * Module exports
 */

module.exports = FilterValidationError;
