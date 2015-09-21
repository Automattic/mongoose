
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
  if (instance && instance.constructor.name === 'model') {
    MongooseError.call(this, instance.constructor.modelName + " validation failed");
  } else {
    MongooseError.call(this, "Validation failed");
  }
  this.stack = new Error().stack;
  this.name = 'ValidationError';
  this.errors = {};
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
  var ret = this.name + ': ';
  var msgs = [];

  Object.keys(this.errors).forEach(function(key) {
    if (this == this.errors[key]) return;
    msgs.push(String(this.errors[key]));
  }, this);

  return ret + msgs.join(', ');
};

/*!
 * Module exports
 */

module.exports = exports = ValidationError;
