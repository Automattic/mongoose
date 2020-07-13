'use strict';

/*!
 * Module dependencies.
 */

const CastError = require('../error/cast');
const SchemaType = require('../schematype');
const castBoolean = require('../cast/boolean');
const utils = require('../utils');

/**
 * Boolean SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaBoolean(path, options) {
  SchemaType.call(this, path, options, 'Boolean');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBoolean.schemaName = 'Boolean';

SchemaBoolean.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
SchemaBoolean.prototype = Object.create(SchemaType.prototype);
SchemaBoolean.prototype.constructor = SchemaBoolean;

/*!
 * ignore
 */

SchemaBoolean._cast = castBoolean;

/**
 * Sets a default option for all Boolean instances.
 *
 * ####Example:
 *
 *     // Make all booleans have `default` of false.
 *     mongoose.Schema.Boolean.set('default', false);
 *
 *     const Order = mongoose.model('Order', new Schema({ isPaid: Boolean }));
 *     new Order({ }).isPaid; // false
 *
 * @param {String} option - The option you'd like to set the value for
 * @param {*} value - value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

SchemaBoolean.set = SchemaType.set;

/**
 * Get/set the function used to cast arbitrary values to booleans.
 *
 * ####Example:
 *
 *     // Make Mongoose cast empty string '' to false.
 *     const original = mongoose.Schema.Boolean.cast();
 *     mongoose.Schema.Boolean.cast(v => {
 *       if (v === '') {
 *         return false;
 *       }
 *       return original(v);
 *     });
 *
 *     // Or disable casting entirely
 *     mongoose.Schema.Boolean.cast(false);
 *
 * @param {Function} caster
 * @return {Function}
 * @function get
 * @static
 * @api public
 */

SchemaBoolean.cast = function cast(caster) {
  if (arguments.length === 0) {
    return this._cast;
  }
  if (caster === false) {
    caster = v => {
      if (v != null && typeof v !== 'boolean') {
        throw new Error();
      }
      return v;
    };
  }
  this._cast = caster;

  return this._cast;
};

/*!
 * ignore
 */

SchemaBoolean._checkRequired = v => v === true || v === false;

/**
 * Override the function the required validator uses to check whether a boolean
 * passes the `required` check.
 *
 * @param {Function} fn
 * @return {Function}
 * @function checkRequired
 * @static
 * @api public
 */

SchemaBoolean.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies a required validator. For a boolean
 * to satisfy a required validator, it must be strictly equal to true or to
 * false.
 *
 * @param {Any} value
 * @return {Boolean}
 * @api public
 */

SchemaBoolean.prototype.checkRequired = function(value) {
  return this.constructor._checkRequired(value);
};

/**
 * Configure which values get casted to `true`.
 *
 * ####Example:
 *
 *     const M = mongoose.model('Test', new Schema({ b: Boolean }));
 *     new M({ b: 'affirmative' }).b; // undefined
 *     mongoose.Schema.Boolean.convertToTrue.add('affirmative');
 *     new M({ b: 'affirmative' }).b; // true
 *
 * @property convertToTrue
 * @type Set
 * @api public
 */

Object.defineProperty(SchemaBoolean, 'convertToTrue', {
  get: () => castBoolean.convertToTrue,
  set: v => { castBoolean.convertToTrue = v; }
});

/**
 * Configure which values get casted to `false`.
 *
 * ####Example:
 *
 *     const M = mongoose.model('Test', new Schema({ b: Boolean }));
 *     new M({ b: 'nay' }).b; // undefined
 *     mongoose.Schema.Types.Boolean.convertToFalse.add('nay');
 *     new M({ b: 'nay' }).b; // false
 *
 * @property convertToFalse
 * @type Set
 * @api public
 */

Object.defineProperty(SchemaBoolean, 'convertToFalse', {
  get: () => castBoolean.convertToFalse,
  set: v => { castBoolean.convertToFalse = v; }
});

/**
 * Casts to boolean
 *
 * @param {Object} value
 * @param {Object} model - this value is optional
 * @api private
 */

SchemaBoolean.prototype.cast = function(value) {
  const castBoolean = typeof this.constructor.cast === 'function' ?
    this.constructor.cast() :
    SchemaBoolean.cast();
  try {
    return castBoolean(value);
  } catch (error) {
    throw new CastError('Boolean', value, this.path, error, this);
  }
};

SchemaBoolean.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {});

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} val
 * @api private
 */

SchemaBoolean.prototype.castForQuery = function($conditional, val) {
  let handler;
  if (arguments.length === 2) {
    handler = SchemaBoolean.$conditionalHandlers[$conditional];

    if (handler) {
      return handler.call(this, val);
    }

    return this._castForQuery(val);
  }

  return this._castForQuery($conditional);
};

/**
 *
 * @api private
 */

SchemaBoolean.prototype._castNullish = function _castNullish(v) {
  const castBoolean = typeof this.constructor.cast === 'function' ?
    this.constructor.cast() :
    SchemaBoolean.cast();
  if (castBoolean == null) {
    return null;
  }
  if (castBoolean.convertToFalse instanceof Set && castBoolean.convertToFalse.has(v)) {
    return false;
  }
  if (castBoolean.convertToTrue instanceof Set && castBoolean.convertToTrue.has(v)) {
    return true;
  }
  return null;
};

/*!
 * Module exports.
 */

module.exports = SchemaBoolean;
