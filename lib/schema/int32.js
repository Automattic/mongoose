'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('../error/cast');
const SchemaType = require('../schemaType');
const castInt32 = require('../cast/int32');
const createJSONSchemaTypeDefinition = require('../helpers/createJSONSchemaTypeDefinition');
const handleBitwiseOperator = require('./operators/bitwise');

/**
 * Int32 SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @param {Object} schemaOptions
 * @param {Schema} parentSchema
 * @inherits SchemaType
 * @api public
 */

function SchemaInt32(path, options, _schemaOptions, parentSchema) {
  SchemaType.call(this, path, options, 'Int32', parentSchema);
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaInt32.schemaName = 'Int32';

SchemaInt32.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
SchemaInt32.prototype = Object.create(SchemaType.prototype);
SchemaInt32.prototype.constructor = SchemaInt32;

/*!
 * ignore
 */

SchemaInt32._cast = castInt32;

/**
 * Sets a default option for all Int32 instances.
 *
 * #### Example:
 *
 *     // Make all Int32 fields required by default
 *     mongoose.Schema.Types.Int32.set('required', true);
 *
 * @param {String} option The option you'd like to set the value for
 * @param {Any} value value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

SchemaInt32.set = SchemaType.set;

SchemaInt32.setters = [];

/**
 * Attaches a getter for all Int32 instances
 *
 * #### Example:
 *
 *     // Converts int32 to be a represent milliseconds upon access
 *     mongoose.Schema.Types.Int32.get(v => v == null ? '0 ms' : v.toString() + ' ms');
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaInt32.get = SchemaType.get;

/*!
 * ignore
 */

SchemaInt32._defaultCaster = v => {
  const INT32_MAX = 0x7FFFFFFF;
  const INT32_MIN = -0x80000000;

  if (v != null) {
    if (typeof v !== 'number' || v !== (v | 0) || v < INT32_MIN || v > INT32_MAX) {
      throw new Error();
    }
  }

  return v;
};

/**
 * Get/set the function used to cast arbitrary values to 32-bit integers
 *
 * #### Example:
 *
 *     // Make Mongoose cast NaN to 0
 *     const defaultCast = mongoose.Schema.Types.Int32.cast();
 *     mongoose.Schema.Types.Int32.cast(v => {
 *       if (isNaN(v)) {
 *         return 0;
 *       }
 *       return defaultCast(v);
 *     });
 *
 *     // Or disable casting for Int32s entirely (only JS numbers within 32-bit integer bounds and null-ish values are permitted)
 *     mongoose.Schema.Types.Int32.cast(false);
 *
 *
 * @param {Function} caster
 * @return {Function}
 * @function cast
 * @static
 * @api public
 */

SchemaInt32.cast = function cast(caster) {
  if (arguments.length === 0) {
    return this._cast;
  }
  if (caster === false) {
    caster = this._defaultCaster;
  }

  this._cast = caster;

  return this._cast;
};


/*!
 * ignore
 */

SchemaInt32._checkRequired = v => v != null;
/**
 * Override the function the required validator uses to check whether a value
 * passes the `required` check.
 *
 * @param {Function} fn
 * @return {Function}
 * @function checkRequired
 * @static
 * @api public
 */

SchemaInt32.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaInt32.prototype.checkRequired = function(value) {
  return this.constructor._checkRequired(value);
};

/**
 * Casts to Int32
 *
 * @param {Object} value
 * @param {Object} model this value is optional
 * @api private
 */

SchemaInt32.prototype.cast = function(value) {
  let castInt32;
  if (typeof this._castFunction === 'function') {
    castInt32 = this._castFunction;
  } else if (typeof this.constructor.cast === 'function') {
    castInt32 = this.constructor.cast();
  } else {
    castInt32 = SchemaInt32.cast();
  }

  try {
    return castInt32(value);
  } catch (error) {
    throw new CastError('Int32', value, this.path, error, this);
  }
};

/*!
 * ignore
 */

const $conditionalHandlers = {
  ...SchemaType.prototype.$conditionalHandlers,
  $gt: handleSingle,
  $gte: handleSingle,
  $lt: handleSingle,
  $lte: handleSingle,
  $bitsAllClear: handleBitwiseOperator,
  $bitsAnyClear: handleBitwiseOperator,
  $bitsAllSet: handleBitwiseOperator,
  $bitsAnySet: handleBitwiseOperator
};

/**
 * Contains the handlers for different query operators for this schema type.
 * For example, `$conditionalHandlers.$gt` is the function Mongoose calls to cast `$gt` filter operators.
 *
 * @property $conditionalHandlers
 * @memberOf SchemaInt32
 * @instance
 * @api public
 */

Object.defineProperty(SchemaInt32.prototype, '$conditionalHandlers', {
  enumerable: false,
  value: $conditionalHandlers
});

/*!
 * ignore
 */

function handleSingle(val, context) {
  return this.castForQuery(null, val, context);
}

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} val
 * @api private
 */

SchemaInt32.prototype.castForQuery = function($conditional, val, context) {
  let handler;
  if ($conditional != null) {
    handler = this.$conditionalHandlers[$conditional];

    if (handler) {
      return handler.call(this, val);
    }

    return this.applySetters(val, context);
  }

  try {
    return this.applySetters(val, context);
  } catch (err) {
    if (err instanceof CastError && err.path === this.path && this.$fullPath != null) {
      err.path = this.$fullPath;
    }
    throw err;
  }
};

/**
 * Returns this schema type's representation in a JSON schema.
 *
 * @param [options]
 * @param [options.useBsonType=false] If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.
 * @returns {Object} JSON schema properties
 */

SchemaInt32.prototype.toJSONSchema = function toJSONSchema(options) {
  const isRequired = this.options.required && typeof this.options.required !== 'function';
  return createJSONSchemaTypeDefinition('number', 'int', options?.useBsonType, isRequired);
};

SchemaInt32.prototype.autoEncryptionType = function autoEncryptionType() {
  return 'int';
};


/*!
 * Module exports.
 */

module.exports = SchemaInt32;
