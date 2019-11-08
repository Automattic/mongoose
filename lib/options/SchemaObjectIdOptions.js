'use strict';

const SchemaTypeOptions = require('./SchemaTypeOptions');

/**
 * The options defined on an ObjectId schematype.
 *
 * ####Example:
 *
 *     const schema = new Schema({ testId: mongoose.ObjectId });
 *     schema.path('testId').options; // SchemaObjectIdOptions instance
 *
 * @api public
 * @inherits SchemaTypeOptions
 * @constructor SchemaObjectIdOptions
 */

class SchemaObjectIdOptions extends SchemaTypeOptions {}

const opts = require('./propertyOptions');

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