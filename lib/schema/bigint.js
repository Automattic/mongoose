'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('../error/cast');
const SchemaType = require('../schemaType');
const castBigInt = require('../cast/bigint');
const createJSONSchemaTypeDefinition = require('../helpers/createJSONSchemaTypeDefinition');

/**
 * BigInt SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @param {Object} schemaOptions
 * @param {Schema} parentSchema
 * @inherits SchemaType
 * @api public
 */

function SchemaBigInt(path, options, _schemaOptions, parentSchema) {
  SchemaType.call(this, path, options, 'BigInt', parentSchema);
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBigInt.schemaName = 'BigInt';

SchemaBigInt.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
SchemaBigInt.prototype = Object.create(SchemaType.prototype);
SchemaBigInt.prototype.constructor = SchemaBigInt;

/*!
 * ignore
 */

SchemaBigInt._cast = castBigInt;

/**
 * Sets a default option for all BigInt instances.
 *
 * #### Example:
 *
 *     // Make all bigints required by default
 *     mongoose.Schema.Types.BigInt.set('required', true);
 *
 * @param {String} option The option you'd like to set the value for
 * @param {Any} value value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

SchemaBigInt.set = SchemaType.set;

SchemaBigInt.setters = [];

/**
 * Attaches a getter for all BigInt instances
 *
 * #### Example:
 *
 *     // Convert bigints to numbers
 *     mongoose.Schema.Types.BigInt.get(v => v == null ? v : Number(v));
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaBigInt.get = SchemaType.get;

/**
 * Get/set the function used to cast arbitrary values to bigints.
 *
 * #### Example:
 *
 *     // Make Mongoose cast empty string '' to false.
 *     const original = mongoose.Schema.Types.BigInt.cast();
 *     mongoose.Schema.Types.BigInt.cast(v => {
 *       if (v === '') {
 *         return false;
 *       }
 *       return original(v);
 *     });
 *
 *     // Or disable casting entirely
 *     mongoose.Schema.Types.BigInt.cast(false);
 *
 * @param {Function} caster
 * @return {Function}
 * @function cast
 * @static
 * @api public
 */

SchemaBigInt.cast = function cast(caster) {
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

SchemaBigInt._checkRequired = v => v != null;

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

SchemaBigInt.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaBigInt.prototype.checkRequired = function(value) {
  return this.constructor._checkRequired(value);
};

/**
 * Casts to bigint
 *
 * @param {Object} value
 * @param {Object} model this value is optional
 * @api private
 */

SchemaBigInt.prototype.cast = function(value) {
  let castBigInt;
  if (typeof this._castFunction === 'function') {
    castBigInt = this._castFunction;
  } else if (typeof this.constructor.cast === 'function') {
    castBigInt = this.constructor.cast();
  } else {
    castBigInt = SchemaBigInt.cast();
  }

  try {
    return castBigInt(value);
  } catch (error) {
    throw new CastError('BigInt', value, this.path, error, this);
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
  $lte: handleSingle
};

/**
 * Contains the handlers for different query operators for this schema type.
 * For example, `$conditionalHandlers.$in` is the function Mongoose calls to cast `$in` filter operators.
 *
 * @property $conditionalHandlers
 * @memberOf SchemaBigInt
 * @instance
 * @api public
 */

Object.defineProperty(SchemaBigInt.prototype, '$conditionalHandlers', {
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

SchemaBigInt.prototype.castForQuery = function($conditional, val, context) {
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
 *
 * @api private
 */

SchemaBigInt.prototype._castNullish = function _castNullish(v) {
  if (typeof v === 'undefined') {
    return v;
  }
  const castBigInt = typeof this.constructor.cast === 'function' ?
    this.constructor.cast() :
    SchemaBigInt.cast();
  if (castBigInt == null) {
    return v;
  }
  return v;
};

/**
 * Returns this schema type's representation in a JSON schema.
 *
 * @param [options]
 * @param [options.useBsonType=false] If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.
 * @returns {Object} JSON schema properties
 */

SchemaBigInt.prototype.toJSONSchema = function toJSONSchema(options) {
  const isRequired = this.options.required && typeof this.options.required !== 'function';
  return createJSONSchemaTypeDefinition('string', 'long', options?.useBsonType, isRequired);
};

SchemaBigInt.prototype.autoEncryptionType = function autoEncryptionType() {
  return 'long';
};

/*!
 * Module exports.
 */

module.exports = SchemaBigInt;
