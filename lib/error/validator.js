/*!
 * Module dependencies.
 */

var MongooseError = require('../error.js');

/**
 * Schema validator error
 *
 * @param {Object} properties
 * @inherits MongooseError
 * @api private
 */

function ValidatorError(properties) {
  var msg = properties.message;
  if (!msg) {
    msg = MongooseError.messages.general.default;
  }

  var message = this.formatMessage(msg, properties);
  MongooseError.call(this, message);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.properties = properties;
  this.name = 'ValidatorError';
  this.kind = properties.type;
  this.path = properties.path;
  this.value = properties.value;
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
  var propertyNames = Object.keys(properties);
  for (var i = 0; i < propertyNames.length; ++i) {
    var propertyName = propertyNames[i];
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
