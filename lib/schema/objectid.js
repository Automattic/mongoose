/* eslint no-empty: 1 */

/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype'),
    CastError = SchemaType.CastError,
    oid = require('../types/objectid'),
    utils = require('../utils'),
    Document;

/**
 * ObjectId SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api public
 */

function ObjectId(key, options) {
  var isKeyHexStr = typeof key === 'string' && key.length === 24 && /^[a-f0-9]+$/i.test(key);
  var suppressWarning = options && options.suppressWarning;
  if ((isKeyHexStr || typeof key === 'undefined') && !suppressWarning) {
    console.warn('mongoose: To create a new ObjectId please try ' +
      '`Mongoose.Types.ObjectId` instead of using ' +
      '`Mongoose.Schema.ObjectId`. Set the `suppressWarning` option if ' +
      'you\'re trying to create a hex char path in your schema.');
    console.trace();
  }
  SchemaType.call(this, key, options, 'ObjectID');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api public
 */
ObjectId.schemaName = 'ObjectId';

/*!
 * Inherits from SchemaType.
 */
ObjectId.prototype = Object.create(SchemaType.prototype);
ObjectId.prototype.constructor = ObjectId;

/**
 * Adds an auto-generated ObjectId default if turnOn is true.
 * @param {Boolean} turnOn auto generated ObjectId defaults
 * @api public
 * @return {SchemaType} this
 */

ObjectId.prototype.auto = function(turnOn) {
  if (turnOn) {
    this.default(defaultId);
    this.set(resetId);
  }

  return this;
};

/**
 * Check if the given value satisfies a required validator.
 *
 * @param {Any} value
 * @param {Document} doc
 * @return {Boolean}
 * @api public
 */

ObjectId.prototype.checkRequired = function checkRequired(value, doc) {
  if (SchemaType._isRef(this, value, doc, true)) {
    return !!value;
  }
  return value instanceof oid;
};

/**
 * Casts to ObjectId
 *
 * @param {Object} value
 * @param {Object} doc
 * @param {Boolean} init whether this is an initialization cast
 * @api private
 */

ObjectId.prototype.cast = function(value, doc, init) {
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
    if (value instanceof oid) {
      return value;
    } else if ((value.constructor.name || '').toLowerCase() === 'objectid') {
      return new oid(value.toHexString());
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('ObjectId', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    var ret = value;
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

  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof oid) {
    return value;
  }

  if (value._id) {
    if (value._id instanceof oid) {
      return value._id;
    }
    if (value._id.toString instanceof Function) {
      return new oid(value._id.toString());
    }
  }

  if (value.toString instanceof Function) {
    try {
      return new oid(value.toString());
    } catch (err) {
      throw new CastError('ObjectId', value, this.path);
    }
  }

  throw new CastError('ObjectId', value, this.path);
};

/*!
 * ignore
 */

function handleSingle(val) {
  return this.cast(val);
}

ObjectId.prototype.$conditionalHandlers =
    utils.options(SchemaType.prototype.$conditionalHandlers, {
      $gt: handleSingle,
      $gte: handleSingle,
      $lt: handleSingle,
      $lte: handleSingle
    });

/*!
 * ignore
 */

function defaultId() {
  return new oid();
}

defaultId.$runBeforeSetters = true;

function resetId(v) {
  Document || (Document = require('./../document'));

  if (this instanceof Document) {
    if (v === void 0) {
      var _v = new oid;
      this.$__._id = _v;
      return _v;
    }

    this.$__._id = v;
  }

  return v;
}

/*!
 * Module exports.
 */

module.exports = ObjectId;
