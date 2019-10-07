'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

class SchemaNumberOptions extends SchemaTypeOptions {}

const opts = {
  enumerable: true,
  configurable: true,
  writable: true,
  value: null
};

/**
 * If set, Mongoose adds a validator that checks that this path is at least the
 * given `min`.
 *
 * @api public
 * @property min
 * @memberOf SchemaNumberOptions
 * @type Number
 * @instance
 */

Object.defineProperty(SchemaNumberOptions.prototype, 'min', opts);

/**
 * If set, Mongoose adds a validator that checks that this path is less than the
 * given `max`.
 *
 * @api public
 * @property max
 * @memberOf SchemaNumberOptions
 * @type Number
 * @instance
 */

Object.defineProperty(SchemaNumberOptions.prototype, 'max', opts);

/*!
 * ignore
 */

module.exports = SchemaNumberOptions;