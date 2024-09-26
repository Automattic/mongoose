
/*!
 * Module dependencies.
 */

'use strict';

const MongooseError = require('./mongooseError');

/**
 * OverwriteModel Error constructor.
 * @param {String} name
 * @api private
 */

class OverwriteModelError extends MongooseError {

  constructor(name) {
    super('Cannot overwrite `' + name + '` model once compiled.');
  }
}

Object.defineProperty(OverwriteModelError.prototype, 'name', {
  value: 'OverwriteModelError'
});

/*!
 * exports
 */

module.exports = OverwriteModelError;
