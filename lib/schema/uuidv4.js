/*!
 * Module dependencies.
 */

var utils = require('../utils');

var SchemaType = require('../schematype');
var CastError = SchemaType.CastError;
var Document;

var UUID_FORMAT = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/**
 * UUIDv4 SchemaType constructor.
 *
 * @param {String} path
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaUUIDv4 (path, options) {
  SchemaType.call(this, path, options, 'UUIDv4');
}

/**
 * This schema type's name, to defend against minifiers that mangle
 * function names.
 *
 * @api private
 */
SchemaUUIDv4.schemaName = 'UUIDv4';

/*!
 * Inherits from SchemaType.
 */
SchemaUUIDv4.prototype = Object.create( SchemaType.prototype );
SchemaUUIDv4.prototype.constructor = SchemaUUIDv4;

/**
 * Required validator
 *
 * @api private
 */

SchemaUUIDv4.prototype.checkRequired = function (value) {
  return UUID_FORMAT.test(value);
};

/**
 * Casts to UUIDv4
 *
 * @param {Object} value
 * @api private
 */

SchemaUUIDv4.prototype.cast = function (value, doc, init) {
  if (SchemaType._isRef(this, value, doc, init)) {
    // wait! we may need to cast this to a document

    if (null == value) {
      return value;
    }

    // lazy load
    Document || (Document = require('./../document'));

    if (value instanceof Document) {
      value.$__.wasPopulated = true;
      return value;
    }

    // setting a populated path
    if ('string' == typeof value) {
      return value;
    } else if (Buffer.isBuffer(value) || !utils.isObject(value)) {
      throw new CastError('string', value, this.path);
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

  // If null or undefined
  if (value == null) {
    return value;
  }

  if ('undefined' !== typeof value) {
    // handle documents being passed
    if (value._id && 'string' == typeof value._id) {
      return value._id;
    }

    // Re: gh-647 and gh-3030, we're ok with casting using `toString()`
    // **unless** its the default Object.toString, because "[object Object]"
    // doesn't really qualify as useful data
    if (value.toString && value.toString !== Object.prototype.toString) {
      return value.toString();
    }
  }

  throw new CastError('string', value, this.path);
};

function handleSingle (val) {
  return this.cast(val);
}

function handleArray (val) {
  var self = this;
  return val.map(function (m) {
    return self.cast(m);
  });
}

SchemaUUIDv4.$conditionalHandlers =
utils.options(SchemaType.prototype.$conditionalHandlers, {
  '$all': handleArray,
  '$in': handleArray,
  '$ne': handleSingle,
  '$nin': handleArray
});

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} val
 * @api private
 */

SchemaUUIDv4.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with UUIDv4.");
    return handler.call(this, val);
  } else {
    return this.cast($conditional);
  }
};

/*!
 * Module exports.
 */

module.exports = SchemaUUIDv4;
