'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

/**
 * The options defined on a Date schematype.
 *
 * ####Example:
 *
 *     const schema = new Schema({ startedAt: Date });
 *     schema.path('startedAt').options; // SchemaDateOptions instance
 *
 * @api public
 * @inherits SchemaTypeOptions
 * @constructor SchemaDateOptions
 */

class SchemaDateOptions extends SchemaTypeOptions {}

const opts = {
  enumerable: true,
  configurable: true,
  writable: true,
  value: null
};

/**
 * If set, Mongoose adds a validator that checks that this path is after the
 * given `min`.
 *
 * @api public
 * @property min
 * @memberOf SchemaDateOptions
 * @type Date
 * @instance
 */

Object.defineProperty(SchemaDateOptions.prototype, 'min', opts);

/**
 * If set, Mongoose adds a validator that checks that this path is before the
 * given `max`.
 *
 * @api public
 * @property max
 * @memberOf SchemaDateOptions
 * @type Date
 * @instance
 */

Object.defineProperty(SchemaDateOptions.prototype, 'max', opts);

/**
 * If set, Mongoose creates a TTL index on this path.
 *
 * @api public
 * @property expires
 * @memberOf SchemaDateOptions
 * @type Date
 * @instance
 */

Object.defineProperty(SchemaDateOptions.prototype, 'expires', opts);

/*!
 * ignore
 */

module.exports = SchemaDateOptions;