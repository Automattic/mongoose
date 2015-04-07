/*!
 * Module requirements.
 */

var utils = require('../utils');

var SchemaType = require('../schematype');

var CastError = SchemaType.CastError;

/**
 * Date SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaDate (key, options) {
  SchemaType.call(this, key, options);
};

/*!
 * Inherits from SchemaType.
 */

SchemaDate.prototype.__proto__ = SchemaType.prototype;

/**
 * Declares a TTL index (rounded to the nearest second) for _Date_ types only.
 *
 * This sets the `expiresAfterSeconds` index option available in MongoDB >= 2.1.2.
 * This index type is only compatible with Date types.
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({ createdAt: { type: Date, expires: 60*60*24 }});
 *
 * `expires` utilizes the `ms` module from [guille](https://github.com/guille/) allowing us to use a friendlier syntax:
 *
 * ####Example:
 *
 *     // expire in 24 hours
 *     new Schema({ createdAt: { type: Date, expires: '24h' }});
 *
 *     // expire in 1.5 hours
 *     new Schema({ createdAt: { type: Date, expires: '1.5h' }});
 *
 *     // expire in 7 days
 *     var schema = new Schema({ createdAt: Date });
 *     schema.path('createdAt').expires('7d');
 *
 * @param {Number|String} when
 * @added 3.0.0
 * @return {SchemaType} this
 * @api public
 */

SchemaDate.prototype.expires = function (when) {
  if (!this._index || 'Object' !== this._index.constructor.name) {
    this._index = {};
  }

  this._index.expires = when;
  utils.expires(this._index);
  return this;
};

/**
 * Required validator for date
 *
 * @api private
 */

SchemaDate.prototype.checkRequired = function (value) {
  return value instanceof Date;
};

/**
 * Casts to date
 *
 * @param {Object} value to cast
 * @api private
 */

SchemaDate.prototype.cast = function (value) {
  if (value === null || value === '')
    return null;

  if (value instanceof Date)
    return value;

  var date;

  // support for timestamps
  if (typeof value !== 'undefined') {
    if (value instanceof Number || 'number' == typeof value
        || String(value) == Number(value)) {
      date = new Date(Number(value));
    } else if (value.toString) {
      // support for date strings
      date = new Date(value.toString());
    }

    if (date.toString() != 'Invalid Date') {
      return date;
    }
  }

  throw new CastError('date', value, this.path);
};

/*!
 * Date Query casting.
 *
 * @api private
 */

function handleSingle (val) {
  return this.cast(val);
}

function handleArray (val) {
  var self = this;
  return val.map( function (m) {
    return self.cast(m);
  });
}

SchemaDate.prototype.$conditionalHandlers =
  utils.options(SchemaType.prototype.$conditionalHandlers, {
    '$all': handleArray,
    '$gt': handleSingle,
    '$gte': handleSingle,
    '$in': handleArray,
    '$lt': handleSingle,
    '$lte': handleSingle,
    '$ne': handleSingle,
    '$nin': handleArray
  });


/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaDate.prototype.castForQuery = function ($conditional, val) {
  var handler;

  if (2 !== arguments.length) {
    return this.cast($conditional);
  }

  handler = this.$conditionalHandlers[$conditional];

  if (!handler) {
    throw new Error("Can't use " + $conditional + " with Date.");
  }

  return handler.call(this, val);
};

/*!
 * Module exports.
 */

module.exports = SchemaDate;
