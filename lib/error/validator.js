/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');


class ValidatorError extends MongooseError {
  /**
   * Schema validator error
   *
   * @param {Object} properties
   * @api private
   */
  constructor(properties) {
    let msg = properties.message;
    if (!msg) {
      msg = MongooseError.messages.general.default;
    }

    const message = formatMessage(msg, properties);
    super(message);

    properties = Object.assign({}, properties, { message: message });
    this.properties = properties;
    this.kind = properties.type;
    this.path = properties.path;
    this.value = properties.value;
    this.reason = properties.reason;
  }

  /*!
   * toString helper
   * TODO remove? This defaults to `${this.name}: ${this.message}`
   */
  toString() {
    return this.message;
  }
}


Object.defineProperty(ValidatorError.prototype, 'name', {
  value: 'ValidatorError'
});

/*!
 * The object used to define this validator. Not enumerable to hide
 * it from `require('util').inspect()` output re: gh-3925
 */

Object.defineProperty(ValidatorError.prototype, 'properties', {
  enumerable: false,
  writable: true,
  value: null
});

// Exposed for testing
ValidatorError.prototype.formatMessage = formatMessage;

/*!
 * Formats error messages
 */

function formatMessage(msg, properties) {
  if (typeof msg === 'function') {
    return msg(properties);
  }

  const propertyNames = Object.keys(properties);
  for (const propertyName of propertyNames) {
    if (propertyName === 'message') {
      continue;
    }
    msg = msg.replace('{' + propertyName.toUpperCase() + '}', properties[propertyName]);
  }

  return msg;
}

/*!
 * exports
 */

module.exports = ValidatorError;
