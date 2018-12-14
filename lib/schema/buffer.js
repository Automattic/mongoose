/*!
 * Module dependencies.
 */

'use strict';

const handleBitwiseOperator = require('./operators/bitwise');
const utils = require('../utils');

const MongooseBuffer = require('../types/buffer');
const SchemaType = require('../schematype');

const Binary = MongooseBuffer.Binary;
const CastError = SchemaType.CastError;
let Document;

/**
 * Buffer SchemaType constructor
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function SchemaBuffer(key, options) {
  SchemaType.call(this, key, options, 'Buffer');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
SchemaBuffer.schemaName = 'Buffer';

/*!
 * Inherits from SchemaType.
 */
SchemaBuffer.prototype = Object.create(SchemaType.prototype);
SchemaBuffer.prototype.constructor = SchemaBuffer;

/*!
 * ignore
 */

SchemaBuffer._checkRequired = v => !!(v && v.length);

/**
 * Override the function the required validator uses to check whether a string
 * passes the `required` check.
 *
 * ####Example:
 *
 *     // Allow empty strings to pass `required` check
 *     mongoose.Schema.Types.String.checkRequired(v => v != null);
 *
 *     const M = mongoose.model({ buf: { type: Buffer, required: true } });
 *     new M({ buf: Buffer.from('') }).validateSync(); // validation passes!
 *
 * @param {Function} fn
 * @return {Function}
 * @function checkRequired
 * @static
 * @api public
 */

SchemaBuffer.checkRequired = SchemaType.checkRequired;

/**
 * Check if the given value satisfies a required validator. To satisfy a
 * required validator, a buffer must not be null or undefined and have
 * non-zero length.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

SchemaBuffer.prototype.checkRequired = function(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }
  return this.constructor._checkRequired(value);
};

/**
 * Casts contents
 *
 * @param {Object} value
 * @param {Document} doc document that triggers the casting
 * @param {Boolean} init
 * @api private
 */

SchemaBuffer.prototype.cast = function(value, doc, init) {
  let ret;
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
    if (Buffer.isBuffer(value)) {
      return value;
    } else if (!utils.isObject(value)) {
      throw new CastError('buffer', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    const path = doc.$__fullPath(this.path);
    const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    const pop = owner.populated(path, true);
    ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
    return ret;
  }

  // documents
  if (value && value._id) {
    value = value._id;
  }

  if (value && value.isMongooseBuffer) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    if (!value || !value.isMongooseBuffer) {
      value = new MongooseBuffer(value, [this.path, doc]);
      if (this.options.subtype != null) {
        value._subtype = this.options.subtype;
      }
    }
    return value;
  }

  if (value instanceof Binary) {
    ret = new MongooseBuffer(value.value(true), [this.path, doc]);
    if (typeof value.sub_type !== 'number') {
      throw new CastError('buffer', value, this.path);
    }
    ret._subtype = value.sub_type;
    return ret;
  }

  if (value === null) {
    return value;
  }


  const type = typeof value;
  if (
    type === 'string' || type === 'number' || Array.isArray(value) ||
    (type === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) // gh-6863
  ) {
    if (type === 'number') {
      value = [value];
    }
    ret = new MongooseBuffer(value, [this.path, doc]);
    if (this.options.subtype != null) {
      ret._subtype = this.options.subtype;
    }
    return ret;
  }

  throw new CastError('buffer', value, this.path);
};

/**
 * Sets the default [subtype](https://studio3t.com/whats-new/best-practices-uuid-mongodb/)
 * for this buffer. You can find a [list of allowed subtypes here](http://api.mongodb.com/python/current/api/bson/binary.html).
 *
 * ####Example:
 *
 *     var s = new Schema({ uuid: { type: Buffer, subtype: 4 });
 *     var M = db.model('M', s);
 *     var m = new M({ uuid: 'test string' });
 *     m.uuid._subtype; // 4
 *
 * @param {Number} subtype the default subtype
 * @return {SchemaType} this
 * @api public
 */

SchemaBuffer.prototype.subtype = function(subtype) {
  this.options.subtype = subtype;
  return this;
};

/*!
 * ignore
 */
function handleSingle(val) {
  return this.castForQuery(val);
}

SchemaBuffer.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $bitsAllClear: handleBitwiseOperator,
      $bitsAnyClear: handleBitwiseOperator,
      $bitsAllSet: handleBitwiseOperator,
      $bitsAnySet: handleBitwiseOperator,
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle
    });

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaBuffer.prototype.castForQuery = function($conditional, val) {
  let handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with Buffer.');
    }
    return handler.call(this, val);
  }
  val = $conditional;
  const casted = this._castForQuery(val);
  return casted ? casted.toObject({ transform: false, virtuals: false }) : casted;
};

/*!
 * Module exports.
 */

module.exports = SchemaBuffer;
