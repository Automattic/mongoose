/*!
 * Module requirements
 */

var MongooseError = require('../error.js');

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
  if (instance && instance.constructor.name === 'model') {
    this._message = instance.constructor.modelName + ' validation failed';
    MongooseError.call(this, this._message);
  } else {
    this._message = 'Validation failed';
    MongooseError.call(this, this._message);
  }
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this);
  } else {
    this.stack = new Error().stack;
  }
  this.name = 'ValidationError';
  if (instance) {
    instance.errors = this.errors;
  }
}

/*!
 * Inherits from MongooseError.
 */

ValidationError.prototype = Object.create(MongooseError.prototype);
ValidationError.prototype.constructor = MongooseError;

Object.defineProperty(ValidationError.prototype, 'message', {
  get: function() {
    return this._message + ': ' + _generateMessage(this);
  },
  enumerable: true
});

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

/*!
 * ignore
 */

function _generateMessage(err) {
  var keys = Object.keys(err.errors || {});
  var len = keys.length;
  var msgs = [];
  var key;

  for (var i = 0; i < len; ++i) {
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
