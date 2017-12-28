/*!
 * Module requirements
 */

const MongooseError = require('./');

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
