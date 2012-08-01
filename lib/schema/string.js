
/*!
 * Module dependencies.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError;

/**
 * String SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaString (key, options) {
  this.enumValues = [];
  this.regExp = null;
  SchemaType.call(this, key, options, 'String');
};

/*!
 * Inherits from SchemaType.
 */

SchemaString.prototype.__proto__ = SchemaType.prototype;

/**
 * Adds enumeration values
 *
 * ####Example:
 *
 *    new Schema({ state: { type: String, enum: ['closed', 'in progress', 'open'] })
 *
 * @param {String} [args...] enumeration values
 * @api public
 */

SchemaString.prototype.enum = function () {
  var len = arguments.length;
  if (!len || undefined === arguments[0] || false === arguments[0]) {
    if (this.enumValidator){
      this.enumValidator = false;
      this.validators = this.validators.filter(function(v){
        return v[1] != 'enum';
      });
    }
    return;
  }

  for (var i = 0; i < len; i++) {
    if (undefined !== arguments[i]) {
      this.enumValues.push(this.cast(arguments[i]));
    }
  }

  if (!this.enumValidator) {
    var values = this.enumValues;
    this.enumValidator = function(v){
      return undefined === v || ~values.indexOf(v);
    };
    this.validators.push([this.enumValidator, 'enum']);
  }
};

/**
 * Adds a lowercase setter
 *
 * ####Example:
 *
 *    new Schema({ email: { type: String, lowercase: true }})
 *
 * @api public
 */

SchemaString.prototype.lowercase = function () {
  return this.set(function (v) {
    return v.toLowerCase();
  });
};

/**
 * Adds an uppercase setter
 *
 * ####Example:
 *
 *    new Schema({ email: { type: String, uppercase: true }})
 *
 * @api public
 */

SchemaString.prototype.uppercase = function () {
  return this.set(function (v) {
    return v.toUpperCase();
  });
};

/**
 * Adds a trim setter
 *
 * ####Example:
 *
 *    new Schema({ email: { type: String, trim: true }})
 *
 * @api public
 */

SchemaString.prototype.trim = function () {
  return this.set(function (v) {
    return v.trim();
  });
};

/**
 * Sets a regexp validator.
 *
 * Any value that does not pass `regExp`.test(val) will fail validation.
 *
 * ####Example:
 *
 *    new Schema({ email: { type: String, match: /^a/ }})
 *
 * @param {RegExp} regExp regular expression to test against
 * @api public
 */

SchemaString.prototype.match = function match (regExp) {
  this.validators.push([function(v){
    return null != v && '' !== v
      ? regExp.test(v)
      : true
  }, 'regexp']);
};

/**
 * Check required
 *
 * @param {String|null|undefined} value
 * @api private
 */

SchemaString.prototype.checkRequired = function checkRequired (value) {
  if (SchemaType._isRef(this, value, true)) {
    return null != value;
  } else {
    return (value instanceof String || typeof value == 'string') && value.length;
  }
};

/**
 * Casts to String
 *
 * @api private
 */

SchemaString.prototype.cast = function (value, scope, init) {
  if (SchemaType._isRef(this, value, init)) return value;
  if (value === null) return value;
  if ('undefined' !== typeof value && value.toString) return value.toString();
  throw new CastError('string', value);
};

/*!
 * ignore
 */

function handleSingle (val) {
  return this.castForQuery(val);
}

function handleArray (val) {
  var self = this;
  return val.map(function (m) {
    return self.castForQuery(m);
  });
}

SchemaString.prototype.$conditionalHandlers = {
    '$ne' : handleSingle
  , '$in' : handleArray
  , '$nin': handleArray
  , '$gt' : handleSingle
  , '$lt' : handleSingle
  , '$gte': handleSingle
  , '$lte': handleSingle
  , '$all': handleArray
  , '$regex': handleSingle
  , '$options': handleSingle
};

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [val]
 * @api private
 */

SchemaString.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with String.");
    return handler.call(this, val);
  } else {
    val = $conditional;
    if (val instanceof RegExp) return val;
    return this.cast(val);
  }
};

/*!
 * Module exports.
 */

module.exports = SchemaString;
