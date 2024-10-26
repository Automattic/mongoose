/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * Strict mode error constructor
 *
 * @param {string} type
 * @param {string} value
 * @api private
 */

class ObjectExpectedError extends MongooseError {

  constructor(path, val) {
    const typeDescription = Array.isArray(val) ? 'array' : 'primitive value';
    super('Tried to set nested object field `' + path +
      `\` to ${typeDescription} \`` + val + '`');
    this.path = path;
  }
}

Object.defineProperty(ObjectExpectedError.prototype, 'name', {
  value: 'ObjectExpectedError'
});

module.exports = ObjectExpectedError;
