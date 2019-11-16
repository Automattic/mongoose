'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

/**
 * The options defined on an Array schematype.
 *
 * ####Example:
 *
 *     const schema = new Schema({ tags: [String] });
 *     schema.path('tags').options; // SchemaArrayOptions instance
 *
 * @api public
 * @inherits SchemaTypeOptions
 * @constructor SchemaArrayOptions
 */

class SchemaArrayOptions extends SchemaTypeOptions {}

const opts = require('./propertyOptions');

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