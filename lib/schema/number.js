/**
 * Module requirements.
 */

var SchemaType = require('../schematype')
  , CastError = SchemaType.CastError
  , MongooseNumber = require('../types/number');

/**
 * Number SchemaType constructor.
 *
 * @param {String} key
 * @param {Object} options
 * @api private
 */

function SchemaNumber (key, options) {
  SchemaType.call(this, key, options, 'Number');
};

/**
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
 * Sets a maximum number validator
 *
 * @param {Number} minimum number
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
 * Sets a maximum number validator
 *
 * @param {Number} maximum number
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
 * @param {Object} value to cast
 * @param {Document} document that triggers the casting
 * @api private
 */

SchemaNumber.prototype.cast = function (value, doc, init) {
  if (SchemaType._isRef(this, value, init)) return value;

  if (!isNaN(value)){
    if (null === value) return value;
    if ('' === value) return null;
    if ('string' === typeof value) value = Number(value);
    if (value instanceof Number || typeof value == 'number' ||
       (value.toString && value.toString() == Number(value)))
      return new MongooseNumber(value, this.path, doc);
  }

  throw new CastError('number', value);
};

function handleSingle (val) {
  return this.cast(val).valueOf();
}

function handleArray (val) {
  var self = this;
  return val.map( function (m) {
    return self.cast(m).valueOf();
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

SchemaNumber.prototype.castForQuery = function ($conditional, val) {
  var handler;
  if (arguments.length === 2) {
    handler = this.$conditionalHandlers[$conditional];
    if (!handler)
      throw new Error("Can't use " + $conditional + " with Number.");
    return handler.call(this, val);
  } else {
    val = this.cast($conditional);
    return val == null ? val : val.valueOf();
  }
};

/**
 * Module exports.
 */

module.exports = SchemaNumber;
