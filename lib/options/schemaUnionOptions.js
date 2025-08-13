'use strict';

const SchemaTypeOptions = require('./schemaTypeOptions');

/**
 * The options defined on a Union schematype.
 *
 * @api public
 * @inherits SchemaTypeOptions
 * @constructor SchemaUnionOptions
 */

class SchemaUnionOptions extends SchemaTypeOptions {}

const opts = require('./propertyOptions');

/**
 * If set, specifies the type of this map's values. Mongoose will cast
 * this map's values to the given type.
 *
 * If not set, Mongoose will not cast the map's values.
 *
 * @api public
 * @property of
 * @memberOf SchemaUnionOptions
 * @type {Function|string}
 * @instance
 */

Object.defineProperty(SchemaUnionOptions.prototype, 'of', opts);

module.exports = SchemaUnionOptions;
