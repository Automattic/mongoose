'use strict';

/*!
 * Module requirements.
 */

const MongooseError = require('../error');
const SchemaType = require('../schematype');
const castNumber = require('../cast/number');
const handleBitwiseOperator = require('./operators/bitwise');
const utils = require('../utils');

const CastError = SchemaType.CastError;
let Document;

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaNumber(key, options) {
  SchemaType.call(this, key, options, 'Number');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaNumber.schemaName = 'Number';

/*!
 * Inherits from SchemaType.
 */
SchemaNumber.prototype = Object.create(SchemaType.prototype);
SchemaNumber.prototype.constructor = SchemaNumber;

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaNumber.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }
  return typeof value === 'number' || value instanceof Number;
};

/**
 * Sets a minimum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, min: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 9 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MIN} token which will be replaced with the invalid value
 *     var min = [10, 'The value of path `{PATH}` ({VALUE}) is beneath the limit ({MIN}).'];
 *     var schema = new Schema({ n: { type: Number, min: min })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) is beneath the limit (10).
 *     })
 *
 * @param {Number} value minimum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaNumber.prototype.min = function(value, message) {
  if (this.minValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.minValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    let msg = message || MongooseError.messages.Number.min;
    msg = msg.replace(/{MIN}/, value);
    this.validators.push({
      validator: this.minValidator = function(v) {
        return v == null || v >= value;
      },
      message: msg,
      type: 'min',
      min: value
    });
  }

  return this;
};

/**
 * Sets a maximum number validator.
 *
 * ####Example:
 *
 *     var s = new Schema({ n: { type: Number, max: 10 })
 *     var M = db.model('M', s)
 *     var m = new M({ n: 11 })
 *     m.save(function (err) {
 *       console.error(err) // validator error
 *       m.n = 10;
 *       m.save() // success
 *     })
 *
 *     // custom error messages
 *     // We can also use the special {MAX} token which will be replaced with the invalid value
 *     var max = [10, 'The value of path `{PATH}` ({VALUE}) exceeds the limit ({MAX}).'];
 *     var schema = new Schema({ n: { type: Number, max: max })
 *     var M = mongoose.model('Measurement', schema);
 *     var s= new M({ n: 4 });
 *     s.validate(function (err) {
 *       console.log(String(err)) // ValidationError: The value of path `n` (4) exceeds the limit (10).
 *     })
 *
 * @param {Number} maximum number
 * @param {String} [message] optional custom error message
 * @return {SchemaType} this
 * @see Customized Error Messages #error_messages_MongooseError-messages
 * @api public
 */

SchemaNumber.prototype.max = function(value, message) {
  if (this.maxValidator) {
    this.validators = this.validators.filter(function(v) {
      return v.validator !== this.maxValidator;
    }, this);
  }

  if (value !== null && value !== undefined) {
    let msg = message || MongooseError.messages.Number.max;
    msg = msg.replace(/{MAX}/, value);
    this.validators.push({
      validator: this.maxValidator = function(v) {
        return v == null || v <= value;
      },
      message: msg,
      type: 'max',
      max: value
    });
  }

  return this;
};

/**
 * Casts to number
 *
 * @param {Object} value value to cast
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaNumber.prototype.cast = function(value, doc, init) {
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
    if (typeof value === 'number') {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('number', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    const path = doc.$__fullPath(this.path);
    const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    const pop = owner.populated(path, true);
    const ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  const val = value && typeof value._id !== 'undefined' ?
    value._id : // documents
    value;

  return castNumber(val, this.path);
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

SchemaNumber.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $bitsAllClear: handleBitwiseOperator,
      $bitsAnyClear: handleBitwiseOperator,
      $bitsAllSet: handleBitwiseOperator,
      $bitsAnySet: handleBitwiseOperator,
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

SchemaNumber.prototype.castForQuery = function($conditional, val) {
  let handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new CastError('Can\'t use ' + $conditional + ' with Number.');
    }
    return handler.call(this, val);
  }
  val = this._castForQuery($conditional);
  return val;
};

/*!
 * Module exports.
 */

module.exports = SchemaNumber;
