/*!
 * Module dependencies.
 */

'use strict';

const SchemaType = require('../schematype');
const CastError = SchemaType.CastError;
const Decimal128Type = require('../types/decimal128');
const castDecimal128 = require('../cast/decimal128');
const utils = require('../utils');

const populateModelSymbol = require('../helpers/symbols').populateModelSymbol;

let Document;

/**
 * Decimal128 SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function Decimal128(key, options) {
  SchemaType.call(this, key, options, 'Decimal128');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
Decimal128.schemaName = 'Decimal128';

Decimal128.defaultOptions = {};

/*!
 * Inherits from SchemaType.
 */
Decimal128.prototype = Object.create(SchemaType.prototype);
Decimal128.prototype.constructor = Decimal128;

/*!
 * ignore
 */

Decimal128._cast = castDecimal128;

/**
 * Sets a default option for all Decimal128 instances.
 *
 * ####Example:
 *
 *     // Make all decimal 128s have `required` of true by default.
 *     mongoose.Schema.Decimal128.set('required', true);
 *
 *     const User = mongoose.model('User', new Schema({ test: mongoose.Decimal128 }));
 *     new User({ }).validateSync().errors.test.message; // Path `test` is required.
 *
 * @param {String} option - The option you'd like to set the value for
 * @param {*} value - value for option
 * @return {undefined}
 * @function set
 * @static
 * @api public
 */

Decimal128.set = SchemaType.set;

/**
 * Get/set the function used to cast arbitrary values to decimals.
 *
 * ####Example:
 *
 *     // Make Mongoose only refuse to cast numbers as decimal128
 *     const original = mongoose.Schema.Types.Decimal128.cast();
 *     mongoose.Decimal128.cast(v => {
 *       assert.ok(typeof v !== 'number');
 *       return original(v);
 *     });
 *
 *     // Or disable casting entirely
 *     mongoose.Decimal128.cast(false);
 *
 * @param {Function} [caster]
 * @return {Function}
 * @function get
 * @static
 * @api public
 */

Decimal128.cast = function cast(caster) {
  if (arguments.length === 0) {
    return this._cast;
  }
  if (caster === false) {
    caster = v => {
      if (v != null && !(v instanceof Decimal128Type)) {
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

Decimal128._checkRequired = v => v instanceof Decimal128Type;

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

Decimal128.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

Decimal128.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }

  // `require('util').inherits()` does **not** copy static properties, and
  // plugins like mongoose-float use `inherits()` for pre-ES6.
  const _checkRequired = typeof this.constructor.checkRequired == 'function' ?
    this.constructor.checkRequired() :
    Decimal128.checkRequired();

  return _checkRequired(value);
};

/**
 * Casts to Decimal128
 *
 * @param {Object} value
 * @param {Object} doc
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */

Decimal128.prototype.cast = function(value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (value === null || value === undefined) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if (value instanceof Decimal128Type) {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('Decimal128', value, this.path, null, this);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    const path = doc.$__fullPath(this.path);
    const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    const pop = owner.populated(path, true);
    let ret = value;
    if (!doc.$__.populated ||
        !doc.$__.populated[path] ||
        !doc.$__.populated[path].options ||
        !doc.$__.populated[path].options.options ||
        !doc.$__.populated[path].options.options.lean) {
      ret = new pop.options[populateModelSymbol](value);
      ret.$__.wasPopulated = true;
    }

    return ret;
  }

  const castDecimal128 = typeof this.constructor.cast === 'function' ?
    this.constructor.cast() :
    Decimal128.cast();
  try {
    return castDecimal128(value);
  } catch (error) {
    throw new CastError('Decimal128', value, this.path, error, this);
  }
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

Decimal128.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle
    });

/*!
 * Module exports.
 */

module.exports = Decimal128;
