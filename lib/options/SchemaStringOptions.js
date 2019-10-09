'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

class SchemaStringOptions extends SchemaTypeOptions {}

const opts = {
  enumerable: true,
  configurable: true,
  writable: true,
  value: null
};

/**
 * Array of allowed values for this path
 *
 * @api public
 * @property enum
 * @memberOf SchemaStringOptions
 * @type Array
 * @instance
 */

Object.defineProperty(SchemaStringOptions.prototype, 'enum', opts);

/**
 * Attach a validator that succeeds if the data string matches the given regular
 * expression, and fails otherwise.
 *
 * @api public
 * @property match
 * @memberOf SchemaStringOptions
 * @type RegExp
 * @instance
 */

Object.defineProperty(SchemaStringOptions.prototype, 'match', opts);

/**
 * If truthy, Mongoose will add a custom setter that lowercases this string
 * using JavaScript's built-in `String#toLowerCase()`.
 *
 * @api public
 * @property lowercase
 * @memberOf SchemaStringOptions
 * @type Boolean
 * @instance
 */

Object.defineProperty(SchemaStringOptions.prototype, 'lowercase', opts);

/**
 * If truthy, Mongoose will add a custom setter that removes leading and trailing
 * whitespace using JavaScript's built-in `String#trim()`.
 *
 * @api public
 * @property trim
 * @memberOf SchemaStringOptions
 * @type Boolean
 * @instance
 */

Object.defineProperty(SchemaStringOptions.prototype, 'trim', opts);

/**
 * If truthy, Mongoose will add a custom setter that uppercases this string
 * using JavaScript's built-in `String#toUpperCase()`.
 *
 * @api public
 * @property uppercase
 * @memberOf SchemaStringOptions
 * @type Boolean
 * @instance
 */

Object.defineProperty(SchemaStringOptions.prototype, 'uppercase', opts);

/*!
 * ignore
 */

module.exports = SchemaStringOptions;