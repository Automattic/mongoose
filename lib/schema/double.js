'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('../error/cast');
const SchemaType = require('../schemaType');
const castDouble = require('../cast/double');
const createJSONSchemaTypeDefinition = require('../helpers/createJSONSchemaTypeDefinition');

/**
 * Double SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaDouble(path, options) {
  SchemaType.call(this, path, options, 'Double');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaDouble.schemaName = 'Double';

SchemaDouble.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
SchemaDouble.prototype = Object.create(SchemaType.prototype);
SchemaDouble.prototype.constructor = SchemaDouble;

/*!
 * ignore
 */

SchemaDouble._cast = castDouble;

/**
 * Sets a default option for all Double instances.
 *
 * #### Example:
 *
 *     // Make all Double fields required by default
 *     mongoose.Schema.Double.set('required', true);
 *
 * @param {String} option The option you'd like to set the value for
 * @param {Any} value value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

SchemaDouble.set = SchemaType.set;

SchemaDouble.setters = [];

/**
 * Attaches a getter for all Double instances
 *
 * #### Example:
 *
 *     // Converts Double to be a represent milliseconds upon access
 *     mongoose.Schema.Double.get(v => v == null ? '0.000 ms' : v.toString() + ' ms');
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaDouble.get = SchemaType.get;

/*!
 * ignore
 */

SchemaDouble._defaultCaster = v => {
  if (v != null) {
    if (v._bsontype !== 'Double') {
      throw new Error();
    }
  }

  return v;
};

/**
 * Get/set the function used to cast arbitrary values to  IEEE 754-2008 floating points
 *
 * #### Example:
 *
 *     // Make Mongoose cast any NaNs to 0
 *     const defaultCast = mongoose.Schema.Types.Double.cast();
 *     mongoose.Schema.Types.Double.cast(v => {
 *       if (isNaN(v)) {
 *         return 0;
 *       }
 *       return defaultCast(v);
 *     });
 *
 *     // Or disable casting for Doubles entirely (only JS numbers are permitted)
 *     mongoose.Schema.Double.cast(false);
 *
 *
 * @param {Function} caster
 * @return {Function}
 * @function get
 * @static
 * @api public
 */

SchemaDouble.cast = function cast(caster) {
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

SchemaDouble._checkRequired = v => v != null;
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

SchemaDouble.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaDouble.prototype.checkRequired = function(value) {
  return this.constructor._checkRequired(value);
};

/**
 * Casts to Double
 *
 * @param {Object} value
 * @param {Object} model this value is optional
 * @api private
 */

SchemaDouble.prototype.cast = function(value) {
  let castDouble;
  if (typeof this._castFunction === 'function') {
    castDouble = this._castFunction;
  } else if (typeof this.constructor.cast === 'function') {
    castDouble = this.constructor.cast();
  } else {
    castDouble = SchemaDouble.cast();
  }

  try {
    return castDouble(value);
  } catch (error) {
    throw new CastError('Double', value, this.path, error, this);
  }
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

SchemaDouble.prototype.$conditionalHandlers = {
  ...SchemaType.prototype.$conditionalHandlers,
  $gt: handleSingle,
  $gte: handleSingle,
  $lt: handleSingle,
  $lte: handleSingle
};

/**
 * Returns this schema type's representation in a JSON schema.
 *
 * @param [options]
 * @param [options.useBsonType=false] If true, return a representation with `bsonType` for use with MongoDB's `$jsonSchema`.
 * @returns {Object} JSON schema properties
 */

SchemaDouble.prototype.toJSONSchema = function toJSONSchema(options) {
  const isRequired = this.options.required && typeof this.options.required !== 'function';
  return createJSONSchemaTypeDefinition('number', 'double', options?.useBsonType, isRequired);
};

/*!
 * Module exports.
 */

module.exports = SchemaDouble;
