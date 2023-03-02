'use strict';

/*!
 * Module requirements.
 */

const SchemaType = require('../schematype');
const castBigInt = require('../cast/bigint');
const utils = require('../utils');
const isBsonType = require('../helpers/isBsonType');

const CastError = SchemaType.CastError;

/**
 * BigInt SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaBigInt(key, options) {
  SchemaType.call(this, key, options, 'BigInt');
}

/**
 * Attaches a getter for all BigInt instances.
 *
 * @param {Function} getter
 * @return {this}
 * @function get
 * @static
 * @api public
 */

SchemaBigInt.get = SchemaType.get;

/**
 * Sets a default option for all BigInt instances.
 *
 * #### Example:
 *
 *     // Make all numbers have option `min` equal to 0.
 *     mongoose.Schema.BigInt.set('min', 0n);
 *
 *     const Order = mongoose.model('Order', new Schema({ amount: BigInt }));
 *     new Order({ amount: -10n }).validateSync().errors.amount.message; // Path `amount` must be larger than 0n.
 *
 * @param {String} option The option you'd like to set the value for
 * @param {Any} value value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

SchemaBigInt.set = SchemaType.set;

/*!
 * ignore
 */

SchemaBigInt._cast = castBigInt;

/**
 * Get/set the function used to cast arbitrary values to BigInts.
 *
 * #### Example:
 *
 *     // Make Mongoose cast empty strings '' to 0n for paths declared as BigInts
 *     const original = mongoose.Number.cast();
 *     mongoose.BigInt.cast(v => {
 *       if (v === '') { return 0n; }
 *       return original(v);
 *     });
 *
 *     // Or disable casting entirely
 *     mongoose.BigInt.cast(false);
 *
 * @param {Function} caster
 * @return {Function}
 * @function get
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

SchemaBigInt._defaultCaster = v => {
  if (v != null && !isBsonType(v, 'Long')) {
    throw new Error();
  }
  return v;
};

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

SchemaBigInt._checkRequired = v => isBsonType(v, 'Long');

/**
 * Override the function the required validator uses to check whether a string
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
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaBigInt.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }

  // `require('util').inherits()` does **not** copy static properties, and
  // plugins like mongoose-float use `inherits()` for pre-ES6.
  const _checkRequired = typeof this.constructor.checkRequired === 'function' ?
    this.constructor.checkRequired() :
    SchemaBigInt.checkRequired();

  return _checkRequired(value);
};

/**
 * Casts to BigInt
 *
 * @param {Object} value value to cast
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaBigInt.prototype.cast = function(value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    if (isBsonType(value, 'Long')) {
      return value;
    }

    return this._castRef(value, doc, init);
  }

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
  } catch (err) {
    throw new CastError('BigInt', value, this.path, err, this);
  }
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

function handleArray(val) {
  const _this = this;
  if (!Array.isArray(val)) {
    return [this.cast(val)];
  }
  return val.map(function(m) {
    return _this.cast(m);
  });
}

SchemaBigInt.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle,
      $mod: handleArray
    });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaBigInt.prototype.castForQuery = function($conditional, val, context) {
  let handler;
  if ($conditional != null) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new CastError('BigInt', val, this.path, null, this);
    }
    return handler.call(this, val, context);
  }
  val = this.applySetters(val, context);
  return val;
};

/*!
 * Module exports.
 */

module.exports = SchemaBigInt;
