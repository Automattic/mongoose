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
 * If set, specifies the types that this union can take. Mongoose will cast
 * the value to one of the given types.
 *
 * If not set, Mongoose will not cast the value to any specific type.
 *
 * @api public
 * @property of
 * @memberOf SchemaUnionOptions
 * @type {Function|Function[]|string|string[]}
 * @instance
 */

Object.defineProperty(SchemaUnionOptions.prototype, 'of', opts);

module.exports = SchemaUnionOptions;
