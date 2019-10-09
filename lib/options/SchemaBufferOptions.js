'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

class SchemaBufferOptions extends SchemaTypeOptions {}

const opts = {
  enumerable: true,
  configurable: true,
  writable: true,
  value: null
};

/**
 * Set the default subtype for this buffer.
 *
 * @api public
 * @property subtype
 * @memberOf SchemaBufferOptions
 * @type Number
 * @instance
 */

Object.defineProperty(SchemaBufferOptions.prototype, 'subtype', opts);

/*!
 * ignore
 */

module.exports = SchemaBufferOptions;