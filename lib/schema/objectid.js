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
 * Check required
 *
 * @api private
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
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('ObjectId', value, this.path);
    }

    // Handle the case where user directly sets a populated
    // path to a plain object; cast to the Model used in
    // the population query.
    var path = doc.$__fullPath(this.path);
    var owner = doc.ownerDocument ? doc.ownerDocument() : doc;
    var pop = owner.populated(path, true);
    var ret = new pop.options.model(value);
    ret.$__.wasPopulated = true;
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
      try {
        return oid.createFromHexString(value._id.toString());
      } catch (e) {
      }
    }
  }

  if (value.toString instanceof Function) {
    try {
      return oid.createFromHexString(value.toString());
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

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [val]
 * @api private
 */

ObjectId.prototype.castForQuery = function($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler) {
      throw new Error('Can\'t use ' + $conditional + ' with ObjectId.');
    }
    return handler.call(this, val);
  }
  return this.cast($conditional);
};

/*!
 * ignore
 */

function defaultId() {
  return new oid();
}

function resetId(v) {
  this.$__._id = null;
  return v;
}

/*!
 * Module exports.
 */

module.exports = ObjectId;
