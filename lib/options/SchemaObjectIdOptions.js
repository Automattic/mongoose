'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

class SchemaObjectIdOptions extends SchemaTypeOptions {}

const opts = {
  enumerable: true,
  configurable: true,
  writable: true,
  value: null
};

/**
 * If truthy, uses Mongoose's default built-in ObjectId path.
 *
 * @api public
 * @property auto
 * @memberOf SchemaObjectIdOptions
 * @type Boolean
 * @instance
 */

Object.defineProperty(SchemaObjectIdOptions.prototype, 'auto', opts);

/*!
 * ignore
 */

module.exports = SchemaObjectIdOptions;