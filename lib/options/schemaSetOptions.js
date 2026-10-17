'use strict';

const SchemaTypeOptions = require('./schemaTypeOptions');

/**
 * The options defined on a Set schematype.
 *
 * #### Example:
 *
 *     const schema = new Schema({ tags: { type: Set, of: String } });
 *     schema.path('tags').options; // SchemaSetOptions instance
 *
 * @api public
 * @inherits SchemaTypeOptions
 * @constructor SchemaSetOptions
 */

class SchemaSetOptions extends SchemaTypeOptions {}

const opts = require('./propertyOptions');

/**
 * If set, specifies the type of this set's values. Mongoose will cast
 * this set's values to the given type.
 *
 * If not set, Mongoose will not cast the set's values.
 *
 * #### Example:
 *
 *     // Mongoose will cast `tags` values to strings
 *     const schema = new Schema({ tags: { type: Set, of: String } });
 *     schema.path('tags').options.of; // String
 *
 * @api public
 * @property of
 * @memberOf SchemaSetOptions
 * @type {Function|string}
 * @instance
 */

Object.defineProperty(SchemaSetOptions.prototype, 'of', opts);

module.exports = SchemaSetOptions;
