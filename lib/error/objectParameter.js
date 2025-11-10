/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * Constructor for errors that happen when a parameter that's expected to be
 * an object isn't an object
 *
 * @param {Any} value
 * @param {String} paramName
 * @param {String} fnName
 * @api private
 */

class ObjectParameterError extends MongooseError {
  constructor(value, paramName, fnName) {
    super('Parameter "' + paramName + '" to ' + fnName +
      '() must be an object, got "' + (value == null ? value : value.toString()) + '" (type ' + typeof value + ')');
  }
}


Object.defineProperty(ObjectParameterError.prototype, 'name', {
  value: 'ObjectParameterError'
});

module.exports = ObjectParameterError;
