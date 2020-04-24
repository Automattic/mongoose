/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./');

/**
 * Schema validator error
 *
 * @param {Object} properties
 * @inherits MongooseError
 * @api private
 */

function ValidatorError(properties) {
  let msg = properties.message;
  if (!msg) {
    msg = MongooseError.messages.general.default;
  }

  const message = this.formatMessage(msg, properties);
  MongooseError.call(this, message);

  properties = Object.assign({}, properties, { message: message });
  this.name = 'ValidatorError';
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.properties = properties;
  this.kind = properties.type;
  this.path = properties.path;
  this.value = properties.value;
  this.reason = properties.reason;
}

/*!
 * Inherits from MongooseError
 */

ValidatorError.prototype = Object.create(MongooseError.prototype);
ValidatorError.prototype.constructor = MongooseError;

/*!
 * The object used to define this validator. Not enumerable to hide
 * it from `require('util').inspect()` output re: gh-3925
 */

Object.defineProperty(ValidatorError.prototype, 'properties', {
  enumerable: false,
  writable: true,
  value: null
});

/*!
 * Formats error messages
 */

ValidatorError.prototype.formatMessage = function(msg, properties) {
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
};

/*!
 * toString helper
 */

ValidatorError.prototype.toString = function() {
  return this.message;
};

/*!
 * exports
 */

module.exports = ValidatorError;
