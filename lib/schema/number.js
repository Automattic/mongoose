/*!
 * Module requirements.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @inherits SchemaType
 * @api private
 */

function SchemaNumber (key, options) {
  SchemaType.call(this, key, options, 'Number');
};

/*!
 * Inherits from SchemaType.
 */

SchemaNumber.prototype.__proto__ = SchemaType.prototype;

/**
 * Required validator for number
 *
 * @api private
 */

SchemaNumber.prototype.checkRequired = function checkRequired (value) {
  if (SchemaType._isRef(this, value, true)) {
    return null != value;
  } else {
    return typeof value == 'number' || value instanceof Number;
  }
};

/**
 * Sets a maximum number validator.
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
 * @param {Number} value minimum number
 * @param {String} message
 * @api public
 */

SchemaNumber.prototype.min = function (value, message) {
  if (this.minValidator)
    this.validators = this.validators.filter(function(v){
      return v[1] != 'min';
    });
  if (value != null)
    this.validators.push([function(v){
      return v === null || v >= value;
    }, 'min']);
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
 * @param {Number} maximum number
 * @param {String} message
 * @api public
 */

SchemaNumber.prototype.max = function (value, message) {
  if (this.maxValidator)
    this.validators = this.validators.filter(function(v){
      return v[1] != 'max';
    });
  if (value != null)
    this.validators.push([this.maxValidator = function(v){
      return v === null || v <= value;
    }, 'max']);
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

SchemaNumber.prototype.cast = function (value, doc, init) {
  if (SchemaType._isRef(this, value, init)) return value;

  if (!isNaN(value)){
    if (null === value) return value;
    if ('' === value) return null;
    if ('string' == typeof value) value = Number(value);
    if (value instanceof Number) return value
    if ('number' == typeof value) return value;
    if (value.toString && !Array.isArray(value) &&
        value.toString() == Number(value)) {
      return new Number(value)
    }
  }

  throw new CastError('number', value, this.path);
};

/*!
 * ignore
 */

function handleSingle (val) {
  return this.cast(val)
}

function handleArray (val) {
  var self = this;
  return val.map( function (m) {
    return self.cast(m)
  });
}

SchemaNumber.prototype.$conditionalHandlers = {
    '$lt' : handleSingle
  , '$lte': handleSingle
  , '$gt' : handleSingle
  , '$gte': handleSingle
  , '$ne' : handleSingle
  , '$in' : handleArray
  , '$nin': handleArray
  , '$mod': handleArray
  , '$all': handleArray
};

/**
 * Casts contents for queries.
 *
 * @param {String} $conditional
 * @param {any} [value]
 * @api private
 */

SchemaNumber.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with Number.");
    return handler.call(this, val);
  } else {
    val = this.cast($conditional);
    return val == null ? val : val
  }
};

/*!
 * Module exports.
 */

module.exports = SchemaNumber;
