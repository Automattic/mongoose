'use strict';

const SchemaTypeOptions = require('./schemaTypeOptions');

/**
 * The options defined on an Array schematype.
 *
 * #### Example:
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
 * @type {Array}
 * @instance
 */

Object.defineProperty(SchemaArrayOptions.prototype, 'enum', opts);

/**
 * If set, specifies the type of this array's values. Equivalent to setting
 * `type` to an array whose first element is `of`.
 *
 * #### Example:
 *
 *     // `arr` is an array of numbers.
 *     new Schema({ arr: [Number] });
 *     // Equivalent way to define `arr` as an array of numbers
 *     new Schema({ arr: { type: Array, of: Number } });
 *
 * @api public
 * @property of
 * @memberOf SchemaArrayOptions
 * @type {Function|string}
 * @instance
 */

Object.defineProperty(SchemaArrayOptions.prototype, 'of', opts);

/**
 * If set to `false`, Mongoose throws a `CastError` when you set a non-array value
 * on this path. If set to `true`, Mongoose wraps the value in an array. Overrides
 * the global `mongoose.Schema.Types.Array.options.castNonArrays` for this path.
 * Values loaded from MongoDB are always wrapped, regardless of this option.
 *
 * This option only applies to the array it's set on, not to arrays nested
 * inside it. For nested arrays, set `castNonArrays` on each level.
 *
 * #### Example:
 *
 *     const Model = db.model('Test', new Schema({ x1: { castNonArrays: false, type: [String] } }));
 *     const doc = new Model({ x1: "some non-array value" });
 *     await doc.validate(); // Errors with "CastError"
 *
 *     // Only the outer array: `1` is a CastError, but `[1, 2]` becomes `[[1, 2]]`
 *     new Schema({ matrix: { castNonArrays: false, type: [[Number]] } });
 *
 *     // Both levels: `1` and `[1, 2]` are both CastErrors
 *     new Schema({ matrix: { castNonArrays: false, type: [{ type: [Number], castNonArrays: false }] } });
 *
 * @api public
 * @property castNonArrays
 * @memberOf SchemaArrayOptions
 * @type {boolean}
 * @instance
 */

Object.defineProperty(SchemaArrayOptions.prototype, 'castNonArrays', opts);

/*!
 * ignore
 */

module.exports = SchemaArrayOptions;
