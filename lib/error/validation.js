/*!
 * Module requirements
 */

'use strict';

const MongooseError = require('./');
const util = require('util');

/**
 * Document Validation Error
 *
 * @api private
 * @param {Document} instance
 * @inherits MongooseError
 */

function ValidationError(instance) {
  this.errors = {};
  this._message = '';

  MongooseError.call(this, this._message);
  if (instance && instance.constructor.name === 'model') {
    this._message = instance.constructor.modelName + ' validation failed';
  } else {
    this._message = 'Validation failed';
  }
  this.name = 'ValidationError';

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }

  if (instance) {
    instance.errors = this.errors;
  }
}

/*!
 * Inherits from MongooseError.
 */

ValidationError.prototype = Object.create(MongooseError.prototype);
ValidationError.prototype.constructor = MongooseError;

/**
 * Console.log helper
 */

ValidationError.prototype.toString = function() {
  return this.name + ': ' + _generateMessage(this);
};

/*!
 * inspect helper
 */

ValidationError.prototype.inspect = function() {
  return Object.assign(new Error(this.message), this);
};

if (util.inspect.custom) {
  /*!
  * Avoid Node deprecation warning DEP0079
  */

  ValidationError.prototype[util.inspect.custom] = ValidationError.prototype.inspect;
}

/*!
 * Helper for JSON.stringify
 */

ValidationError.prototype.toJSON = function() {
  return Object.assign({}, this, { message: this.message });
};

/*!
 * add message
 */

ValidationError.prototype.addError = function(path, error) {
  this.errors[path] = error;
  this.message = this._message + ': ' + _generateMessage(this);
};

/*!
 * ignore
 */

function _generateMessage(err) {
  const keys = Object.keys(err.errors || {});
  const len = keys.length;
  const msgs = [];
  let key;

  for (let i = 0; i < len; ++i) {
    key = keys[i];
    if (err === err.errors[key]) {
      continue;
    }
    msgs.push(key + ': ' + err.errors[key].message);
  }

  return msgs.join(', ');
}

/*!
 * Module exports
 */

module.exports = exports = ValidationError;
