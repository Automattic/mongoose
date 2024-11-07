'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('../error/cast');
const SchemaType = require('../schemaType');
const castInt32 = require('../cast/int32');
const isBsonType = require('../helpers/isBsonType');

/**
 * Int32 SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaInt32(path, options) {
  SchemaType.call(this, path, options, 'Int32');
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
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaInt32.get = SchemaType.get;

/**
 * Get/set the function used to cast arbitrary values to booleans.
 *
 *
 * @param {Function} caster
 * @return {Function}
 * @function get
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

SchemaInt32._checkRequired = v => v != null && isBsonType(v, 'Int32');
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
  if (isBsonType(value, 'Int32')) {
    return value;
  }
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

SchemaInt32.$conditionalHandlers = {
  ...SchemaType.prototype.$conditionalHandlers,
  $gt: handleSingle,
  $gte: handleSingle,
  $lt: handleSingle,
  $lte: handleSingle
};

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
    handler = SchemaInt32.$conditionalHandlers[$conditional];

    if (handler) {
      return handler.call(this, val);
    }

    return this.applySetters(null, val, context);
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

SchemaInt32.prototype._castNullish = function _castNullish(v) {
  if (typeof v === 'undefined') {
    return v;
  }
  const castInt32 = typeof this.constructor.cast === 'function' ?
    this.constructor.cast() :
    SchemaInt32.cast();
  if (castInt32 == null) {
    return v;
  }
  return v;
};

/*!
 * Module exports.
 */

module.exports = SchemaInt32;