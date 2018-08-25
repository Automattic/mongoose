/* eslint no-empty: 1 */

/*!
 * Module dependencies.
 */

'use strict';

const SchemaType = require('../schematype');
const CastError = SchemaType.CastError;
const Decimal128Type = require('../types/decimal128');
const utils = require('../utils');
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

/*!
 * Inherits from SchemaType.
 */
Decimal128.prototype = Object.create(SchemaType.prototype);
Decimal128.prototype.constructor = Decimal128;

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
  return value instanceof Decimal128Type;
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
      throw new CastError('Decimal128', value, this.path);
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
      ret = new pop.options.model(value);
      ret.$__.wasPopulated = true;
    }

    return ret;
  }

  if (value == null) {
    return value;
  }

  if (typeof value === 'object' && typeof value.$numberDecimal === 'string') {
    return Decimal128Type.fromString(value.$numberDecimal);
  }

  if (value instanceof Decimal128Type) {
    return value;
  }

  if (typeof value === 'string') {
    return Decimal128Type.fromString(value);
  }

  if (Buffer.isBuffer(value)) {
    return new Decimal128Type(value);
  }

  if (typeof value === 'number') {
    return Decimal128Type.fromString(String(value));
  }

  if (typeof value.valueOf === 'function' && typeof value.valueOf() === 'string') {
    return Decimal128Type.fromString(value.valueOf());
  }

  throw new CastError('Decimal128', value, this.path);
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
