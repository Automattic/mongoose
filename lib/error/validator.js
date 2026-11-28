/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');
const util = require('util');

/**
 * Schema validator error
 *
 * @param {object} properties
 * @param {Document} doc
 * @api private
 */

class ValidatorError extends MongooseError {

  constructor(properties, doc) {
    let msg = properties.message;
    if (!msg) {
      msg = MongooseError.messages.general.default;
    }

    const message = formatMessage(msg, properties, doc);
    super(message);

    properties = Object.assign({}, properties, { message: message });
    this.properties = properties;
    this.kind = properties.type;
    this.path = properties.path;
    this.value = properties.value;
    this.reason = properties.reason;
  }

  /**
   * toString helper
   * TODO remove? This defaults to `${this.name}: ${this.message}`
   * @api private
   */
  toString() {
    return this.message;
  }

  /**
   * Ensure `name` and `message` show up in toJSON output re: gh-9296
   * @api private
   */

  toJSON() {
    return Object.assign({ name: this.name, message: this.message }, this);
  }
}


Object.defineProperty(ValidatorError.prototype, 'name', {
  value: 'ValidatorError'
});

/**
 * The object used to define this validator. Not enumerable to hide
 * it from `require('util').inspect()` output re: gh-3925
 * @api private
 */

Object.defineProperty(ValidatorError.prototype, 'properties', {
  enumerable: false,
  writable: true,
  value: null
});

// Exposed for testing
ValidatorError.prototype.formatMessage = formatMessage;

/**
 * Formats error messages
 * @api private
 */

function formatMessage(msg, properties, doc) {
  if (typeof msg === 'function') {
    return msg(properties, doc);
  }

  const propertyNames = Object.keys(properties);
  for (const propertyName of propertyNames) {
    if (propertyName === 'message') {
      continue;
    }
    const placeholder = '{' + propertyName.toUpperCase() + '}';
    if (msg.includes(placeholder)) {
      msg = msg.replace(placeholder, stringify(properties[propertyName]));
    }
  }

  return msg;
}

/**
 * Stringifies a property for a message, falling back to `util.inspect()` for
 * values that can't be converted to a string, like `{ toString: 1 }`.
 * @api private
 */

function stringify(value) {
  try {
    return String(value);
  } catch {
    return util.inspect(value);
  }
}

/*!
 * exports
 */

module.exports = ValidatorError;
