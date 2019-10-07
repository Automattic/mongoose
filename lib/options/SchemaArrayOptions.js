'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

class SchemaArrayOptions extends SchemaTypeOptions {}

const opts = {
  enumerable: true,
  configurable: true,
  writable: true,
  value: null
};

/**
 * If this is an array of strings, an array of allowed values for this path.
 * Throws an error if this array isn't an array of strings.
 *
 * @api public
 * @property enum
 * @memberOf SchemaArrayOptions
 * @type Array
 * @instance
 */

Object.defineProperty(SchemaArrayOptions.prototype, 'enum', opts);

/*!
 * ignore
 */

module.exports = SchemaArrayOptions;