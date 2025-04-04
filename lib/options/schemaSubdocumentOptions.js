'use strict';

const SchemaTypeOptions = require('./schemaTypeOptions');

/**
 * The options defined on a single nested schematype.
 *
 * #### Example:
 *
 *     const schema = Schema({ child: Schema({ name: String }) });
 *     schema.path('child').options; // SchemaSubdocumentOptions instance
 *
 * @api public
 * @inherits SchemaTypeOptions
 * @constructor SchemaSubdocumentOptions
 */

class SchemaSubdocumentOptions extends SchemaTypeOptions {}

const opts = require('./propertyOptions');

/**
 * If set, overwrites the child schema's `_id` option.
 *
 * #### Example:
 *
 *     const childSchema = Schema({ name: String });
 *     const parentSchema = Schema({
 *       child: { type: childSchema, _id: false }
 *     });
 *     parentSchema.path('child').schema.options._id; // false
 *
 * @api public
 * @property _id
 * @memberOf SchemaSubdocumentOptions
 * @type {Function|string}
 * @instance
 */

Object.defineProperty(SchemaSubdocumentOptions.prototype, '_id', opts);

/**
 * If set, overwrites the child schema's `minimize` option. In addition, configures whether the entire
 * subdocument can be minimized out.
 *
 * #### Example:
 *
 *     const childSchema = Schema({ name: String });
 *     const parentSchema = Schema({
 *       child: { type: childSchema, minimize: false }
 *     });
 *     const ParentModel = mongoose.model('Parent', parentSchema);
 *     // Saves `{ child: {} }` to the db. Without `minimize: false`, Mongoose would remove the empty
 *     // object and save `{}` to the db.
 *     await ParentModel.create({ child: {} });
 *
 * @api public
 * @property minimize
 * @memberOf SchemaSubdocumentOptions
 * @type {Function|string}
 * @instance
 */

Object.defineProperty(SchemaSubdocumentOptions.prototype, 'minimize', opts);

module.exports = SchemaSubdocumentOptions;
